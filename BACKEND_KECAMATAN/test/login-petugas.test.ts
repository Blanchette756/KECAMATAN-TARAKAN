import { afterEach, describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config/env.js';
import { buildApp } from '../src/app.js';
import { createContainer } from '../src/container.js';
import { periksaAkunPetugas, simpanAkunPetugas } from '../src/services/akun-petugas.js';
import { cocokPassword, hashPassword } from '../src/utils/password.js';
import { bearer, buatApp, EMAIL, type TestCtx } from './helpers.js';

let ctx: TestCtx | undefined;
afterEach(async () => {
  await ctx?.app.close();
  ctx = undefined;
});

const PASSWORD = 'rahasia-petugas-1';
const masuk = (username: string, password: string) => ctx!.app.inject({ method: 'POST', url: '/api/v1/auth/login-petugas', payload: { username, password } });

async function siapkan() {
  ctx = await buatApp();
  await simpanAkunPetugas(ctx!.c.repos, { username: 'pelayanan', nama_lengkap: 'Petugas Pelayanan Uji', role: 'ADMIN', seksi: null, password: PASSWORD });
}

describe('Password', () => {
  it('hash scrypt bisa dicocokkan, dan hash yang sama tidak pernah dihasilkan dua kali', async () => {
    const h1 = await hashPassword('password-panjang');
    const h2 = await hashPassword('password-panjang');
    expect(h1).toMatch(/^scrypt\$32768\$8\$1\$/);
    expect(h1).not.toBe(h2);
    expect(await cocokPassword('password-panjang', h1)).toBe(true);
    expect(await cocokPassword('password-lain', h1)).toBe(false);
    expect(await cocokPassword('password-panjang', 'bukan-format-hash')).toBe(false);
  });
});

describe('Login petugas dengan username dan password', () => {
  it('berhasil, lalu token dipakai untuk antrian petugas; hash password tidak pernah dikirim', async () => {
    await siapkan();
    const res = await masuk('Pelayanan', PASSWORD);
    expect(res.statusCode).toBe(200);
    expect(res.body).not.toContain('scrypt');
    const { token, user } = res.json().data;
    expect(user.role).toBe('ADMIN');
    expect(user.email).toBeNull();
    expect(user.nik_tersamar).toBeNull();
    const antrian = await ctx!.app.inject({ method: 'GET', url: '/api/v1/pengajuan/antrian', headers: bearer(token) });
    expect(antrian.statusCode).toBe(200);
    const me = await ctx!.app.inject({ method: 'GET', url: '/api/v1/auth/me', headers: bearer(token) });
    expect(me.body).not.toContain('scrypt');
  });

  it('password salah dan username tak ada dijawab sama persis', async () => {
    await siapkan();
    const salah = await masuk('pelayanan', 'password-salah');
    const takAda = await masuk('tidak-ada', 'password-salah');
    expect(salah.statusCode).toBe(401);
    expect(takAda.statusCode).toBe(401);
    expect(salah.json()).toEqual(takAda.json());
  });

  it('dikunci setelah 5 kali salah, walau password berikutnya benar', async () => {
    await siapkan();
    for (let i = 0; i < 5; i++) expect((await masuk('pelayanan', 'password-salah')).statusCode).toBe(401);
    const benar = await masuk('pelayanan', PASSWORD);
    expect(benar.statusCode).toBe(429);
  });

  it('mengganti password lewat username yang sama: password lama tidak berlaku lagi', async () => {
    await siapkan();
    const hasil = await simpanAkunPetugas(ctx!.c.repos, { username: 'pelayanan', nama_lengkap: 'Petugas Pelayanan Uji', role: 'ADMIN', seksi: null, password: 'password-baru-2' });
    expect(hasil.baru).toBe(false);
    expect((await masuk('pelayanan', PASSWORD)).statusCode).toBe(401);
    expect((await masuk('pelayanan', 'password-baru-2')).statusCode).toBe(200);
  });

  it('akun warga tidak bisa masuk lewat login petugas', async () => {
    ctx = await buatApp();
    await simpanAkunPetugas(ctx!.c.repos, { username: 'pelayanan', nama_lengkap: 'Uji', role: 'ADMIN', seksi: null, password: PASSWORD });
    const warga = await ctx!.c.repos.users.findByEmail(EMAIL.warga1);
    await ctx!.c.repos.users.simpanPetugas({ ...warga!, id_user: 'USR-SALAH-1' }, 'warga.iseng', await hashPassword(PASSWORD));
    expect((await masuk('warga.iseng', PASSWORD)).statusCode).toBe(401);
  });

  it('validasi data akun: Kasi wajib seksi, password minimal 8 karakter, username huruf kecil', () => {
    expect(periksaAkunPetugas({ username: 'kasi', nama_lengkap: 'Kasi', role: 'KASI', seksi: null, password: 'password1' })).toHaveLength(1);
    expect(periksaAkunPetugas({ username: 'camat', nama_lengkap: 'Camat', role: 'CAMAT', seksi: null, password: 'pendek' })).toHaveLength(1);
    expect(periksaAkunPetugas({ username: 'Bukan Valid!', nama_lengkap: 'Camat', role: 'CAMAT', seksi: null, password: 'password1' })).toHaveLength(1);
    expect(periksaAkunPetugas({ username: 'kasi.tapem', nama_lengkap: 'Kasi', role: 'KASI', seksi: 'TATA_PEMERINTAHAN', password: 'password1' })).toEqual([]);
  });
});

describe('Login tiruan di production', () => {
  it('tidak dipasang sama sekali: siapa pun yang tahu email warga tidak bisa masuk sebagai warga itu', async () => {
    const config = loadConfig({
      NODE_ENV: 'production',
      ALLOW_MOCK_AUTH_IN_PRODUCTION: 'true',
      CORS_ORIGINS: 'https://kectarakantimur.com',
      LOG_LEVEL: 'silent',
      RATE_LIMIT_LOGIN: '1000',
    });
    const c = createContainer(config);
    ctx = { app: await buildApp(c), c };
    await ctx.app.ready();
    for (const email of [EMAIL.admin, EMAIL.warga1]) {
      const res = await ctx!.app.inject({ method: 'POST', url: '/api/v1/auth/mock-login', payload: { email } });
      expect(res.statusCode).toBe(404);
    }
  });
});
