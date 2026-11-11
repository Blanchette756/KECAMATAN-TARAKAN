import { afterEach, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { loadConfig } from '../src/config/env.js';
import { createContainer } from '../src/container.js';
import { contohBerkas } from '../src/database/seed-demo.js';
import { simpanAkunPetugas } from '../src/services/akun-petugas.js';
import { rapikanNoHp } from '../src/services/profil.service.js';
import type { IdentitasGoogle } from '../src/utils/google.js';
import { bearer, DATA_PENGANTAR, type TestCtx } from './helpers.js';

let ctx: TestCtx | undefined;
afterEach(async () => {
  await ctx?.app.close();
  ctx = undefined;
});

/** Token palsu → identitas Google. Token lain dianggap tidak sah, seperti tanda tangan yang salah. */
const AKUN: Record<string, IdentitasGoogle> = {
  'token-google-budi-0001': { sub: '111', email: 'budi@gmail.com', nama: 'Budi Santoso' },
  'token-google-ani-00002': { sub: '222', email: 'ani@gmail.com', nama: 'Ani' },
};

async function siapkan(env: Record<string, string> = {}) {
  const config = loadConfig({ NODE_ENV: 'test', SEED_DEMO_PENGAJUAN: 'false', RATE_LIMIT_LOGIN: '1000', GOOGLE_CLIENT_ID: '123456-abc.apps.googleusercontent.com', ...env });
  const c = createContainer(config, {
    verifikasiGoogle: async (credential) => {
      const a = AKUN[credential];
      if (!a) throw new Error('tanda tangan tidak sah');
      return a;
    },
  });
  ctx = { app: await buildApp(c), c };
  await ctx.app.ready();
  return ctx;
}

const google = (credential: string) => ctx!.app.inject({ method: 'POST', url: '/api/v1/auth/google', payload: { credential } });
const PROFIL = { nama_lengkap: 'Budi Santoso', nik: '6571010101010001', no_hp: '+62 812-3456-7890', alamat: 'Jl. Contoh No. 1 RT 02', id_kelurahan: 'KEL-001' };

describe('Login warga dengan Google', () => {
  it('pertama kali masuk: akun dibuat dengan profil belum lengkap; masuk lagi memakai akun yang sama', async () => {
    await siapkan();
    const r1 = await google('token-google-budi-0001');
    expect(r1.statusCode).toBe(200);
    const u1 = r1.json().data.user;
    expect(u1).toMatchObject({ role: 'WARGA', email: 'budi@gmail.com', nama_lengkap: 'Budi Santoso', profil_lengkap: false });
    const r2 = await google('token-google-budi-0001');
    expect(r2.json().data.user.id_user).toBe(u1.id_user);
  });

  it('token yang tidak sah ditolak', async () => {
    await siapkan();
    expect((await google('token-palsu-panjang-sekali')).statusCode).toBe(401);
  });

  it('tanpa GOOGLE_CLIENT_ID: dijawab belum diaktifkan, dan config untuk frontend kosong', async () => {
    const config = loadConfig({ NODE_ENV: 'test', SEED_DEMO_PENGAJUAN: 'false' });
    const c = createContainer(config);
    ctx = { app: await buildApp(c), c };
    await ctx.app.ready();
    expect((await google('token-google-budi-0001')).statusCode).toBe(503);
    expect((await ctx.app.inject({ method: 'GET', url: '/api/v1/auth/google-config' })).json().data.client_id).toBeNull();
  });

  it('client id dikirim ke frontend', async () => {
    await siapkan();
    expect((await ctx!.app.inject({ method: 'GET', url: '/api/v1/auth/google-config' })).json().data.client_id).toBe('123456-abc.apps.googleusercontent.com');
  });
});

describe('Lengkapi profil', () => {
  it('belum lengkap tidak bisa mengajukan; sesudah dilengkapi bisa', async () => {
    await siapkan();
    const token = (await google('token-google-budi-0001')).json().data.token;
    const layanan = await ctx!.c.services.layanan.detail('LAYANAN-007');
    const ajukan = () =>
      ctx!.app.inject({ method: 'POST', url: '/api/v1/pengajuan', headers: bearer(token), payload: { id_layanan: 'LAYANAN-007', data_formulir: DATA_PENGANTAR, berkas: contohBerkas(layanan, DATA_PENGANTAR) } });

    const sebelum = await ajukan();
    expect(sebelum.statusCode).toBe(422);
    expect(sebelum.json().error.code).toBe('PROFIL_BELUM_LENGKAP');

    const simpan = await ctx!.app.inject({ method: 'PATCH', url: '/api/v1/auth/profil', headers: bearer(token), payload: PROFIL });
    expect(simpan.statusCode).toBe(200);
    expect(simpan.json().data.user.profil_lengkap).toBe(true);
    const profil = (await ctx!.app.inject({ method: 'GET', url: '/api/v1/auth/profil', headers: bearer(token) })).json().data;
    expect(profil).toMatchObject({ nik: '6571010101010001', no_hp: '081234567890', id_kelurahan: 'KEL-001' });

    expect((await ajukan()).statusCode).toBe(201);
  });

  it('isian salah ditolak dengan pesan per kolom', async () => {
    await siapkan();
    const token = (await google('token-google-budi-0001')).json().data.token;
    const res = await ctx!.app.inject({
      method: 'PATCH',
      url: '/api/v1/auth/profil',
      headers: bearer(token),
      payload: { ...PROFIL, nik: '123', no_hp: '12345', id_kelurahan: 'KEL-999' },
    });
    expect(res.statusCode).toBe(422);
    expect(res.json().error.details).toHaveLength(3);
  });

  it('NIK yang sudah dipakai akun lain ditolak', async () => {
    await siapkan();
    const budi = (await google('token-google-budi-0001')).json().data.token;
    const ani = (await google('token-google-ani-00002')).json().data.token;
    await ctx!.app.inject({ method: 'PATCH', url: '/api/v1/auth/profil', headers: bearer(budi), payload: PROFIL });
    const res = await ctx!.app.inject({ method: 'PATCH', url: '/api/v1/auth/profil', headers: bearer(ani), payload: { ...PROFIL, nama_lengkap: 'Ani' } });
    expect(res.statusCode).toBe(409);
  });

  it('nomor HP dirapikan ke format 08…', () => {
    expect(rapikanNoHp('+62 812-3456-7890')).toBe('081234567890');
    expect(rapikanNoHp('6281234567890')).toBe('081234567890');
    expect(rapikanNoHp('0812 3456 7890')).toBe('081234567890');
  });

  it('petugas tidak memakai halaman profil warga', async () => {
    await siapkan();
    await simpanAkunPetugas(ctx!.c.repos, { username: 'pelayanan', nama_lengkap: 'Petugas', role: 'ADMIN', seksi: null, password: 'password-123' });
    const token = (await ctx!.app.inject({ method: 'POST', url: '/api/v1/auth/login-petugas', payload: { username: 'pelayanan', password: 'password-123' } })).json().data.token;
    expect((await ctx!.app.inject({ method: 'GET', url: '/api/v1/auth/profil', headers: bearer(token) })).statusCode).toBe(403);
  });
});
