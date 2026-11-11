import { afterEach, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { loadConfig } from '../src/config/env.js';
import { createContainer } from '../src/container.js';
import { bearer, buatApp, EMAIL, login, type TestCtx } from './helpers.js';

let ctx: TestCtx | undefined;
afterEach(async () => {
  await ctx?.app.close();
  ctx = undefined;
});

const AWAL = { PETUGAS_AWAL_USERNAME: 'pelayanan', PETUGAS_AWAL_PASSWORD: 'password-awal-1' };

async function appDenganAkunAwal() {
  ctx = await buatApp(AWAL);
  expect(await ctx.c.services.akunPetugas.pastikanAkunAwal()).toBe('dibuat');
  return ctx;
}

const req = (method: 'GET' | 'POST' | 'PATCH', url: string, token: string, payload?: object) =>
  ctx!.app.inject({ method, url: `/api/v1${url}`, headers: bearer(token), ...(payload ? { payload } : {}) });

async function masuk(username: string, password: string) {
  const res = await ctx!.app.inject({ method: 'POST', url: '/api/v1/auth/login-petugas', payload: { username, password } });
  return { status: res.statusCode, token: res.statusCode === 200 ? (res.json().data.token as string) : '' };
}

describe('Akun petugas awal dari environment variables', () => {
  it('dibuat sekali, bisa dipakai login, dan tidak menimpa password yang sudah diganti', async () => {
    await appDenganAkunAwal();
    const { token } = await masuk('pelayanan', 'password-awal-1');
    expect((await req('PATCH', '/auth/password', token, { password_lama: 'password-awal-1', password_baru: 'password-baru-22' })).statusCode).toBe(200);
    expect(await ctx!.c.services.akunPetugas.pastikanAkunAwal()).toBe('sudah_ada');
    expect((await masuk('pelayanan', 'password-awal-1')).status).toBe(401);
    expect((await masuk('pelayanan', 'password-baru-22')).status).toBe(200);
  });

  it('password pendek ditolak; username tanpa password diabaikan tanpa menghentikan server', () => {
    // Hanya username (password sudah dihapus dari hPanel): diabaikan, server tetap jalan.
    expect(loadConfig({ NODE_ENV: 'test', PETUGAS_AWAL_USERNAME: 'pelayanan' }).petugasAwal).toBeNull();
    expect(loadConfig({ NODE_ENV: 'production', ALLOW_MOCK_AUTH_IN_PRODUCTION: 'true', PETUGAS_AWAL_USERNAME: 'pelayanan', PETUGAS_AWAL_NAMA: 'Petugas' }).petugasAwal).toBeNull();
    expect(() => loadConfig({ NODE_ENV: 'test', PETUGAS_AWAL_USERNAME: 'pelayanan', PETUGAS_AWAL_PASSWORD: 'pendek' })).toThrow(/minimal 8/);
    expect(loadConfig({ NODE_ENV: 'test' }).petugasAwal).toBeNull();
  });
});

describe('Kelola akun petugas lewat panel admin', () => {
  it('Petugas Pelayanan menambah akun Kasi, lalu Kasi bisa masuk dan melihat antriannya', async () => {
    await appDenganAkunAwal();
    const { token } = await masuk('pelayanan', 'password-awal-1');
    const res = await req('POST', '/petugas', token, { username: 'Kasi.Tapem', nama_lengkap: 'Kasi Uji', role: 'KASI', seksi: 'TATA_PEMERINTAHAN', password: 'password-kasi-1' });
    expect(res.statusCode).toBe(201);
    expect(res.json().data).toMatchObject({ username: 'kasi.tapem', role: 'KASI', seksi: 'TATA_PEMERINTAHAN', aktif: true });
    expect(res.body).not.toContain('scrypt');

    const kasi = await masuk('kasi.tapem', 'password-kasi-1');
    expect(kasi.status).toBe(200);
    expect((await req('GET', '/pengajuan/antrian', kasi.token)).statusCode).toBe(200);
    const daftar = (await req('GET', '/petugas', token)).json().data;
    expect(daftar.map((a: { username: string }) => a.username).sort()).toEqual(['kasi.tapem', 'pelayanan']);
  });

  it('username yang sudah dipakai ditolak, dan Kasi tanpa seksi ditolak', async () => {
    await appDenganAkunAwal();
    const { token } = await masuk('pelayanan', 'password-awal-1');
    expect((await req('POST', '/petugas', token, { username: 'pelayanan', nama_lengkap: 'Dobel', role: 'CAMAT', password: 'password-123' })).statusCode).toBe(409);
    expect((await req('POST', '/petugas', token, { username: 'kasi', nama_lengkap: 'Kasi', role: 'KASI', password: 'password-123' })).statusCode).toBe(422);
  });

  it('hanya Petugas Pelayanan yang boleh mengelola akun', async () => {
    await appDenganAkunAwal();
    const { token } = await masuk('pelayanan', 'password-awal-1');
    await req('POST', '/petugas', token, { username: 'camat', nama_lengkap: 'Camat Uji', role: 'CAMAT', password: 'password-camat-1' });
    const camat = await masuk('camat', 'password-camat-1');
    expect((await req('GET', '/petugas', camat.token)).statusCode).toBe(403);
    expect((await req('POST', '/petugas', camat.token, { username: 'iseng', nama_lengkap: 'Iseng', role: 'ADMIN', password: 'password-123' })).statusCode).toBe(403);
    const warga = await login(ctx!.app, EMAIL.warga1);
    expect((await req('GET', '/petugas', warga)).statusCode).toBe(403);
  });

  it('reset password dan nonaktifkan: sesi lama dicabut, login lama ditolak', async () => {
    await appDenganAkunAwal();
    const { token } = await masuk('pelayanan', 'password-awal-1');
    const id = (await req('POST', '/petugas', token, { username: 'camat', nama_lengkap: 'Camat Uji', role: 'CAMAT', password: 'password-camat-1' })).json().data.id_user;
    const camat = await masuk('camat', 'password-camat-1');

    expect((await req('PATCH', `/petugas/${id}`, token, { password: 'password-camat-2' })).statusCode).toBe(200);
    expect((await req('GET', '/pengajuan/antrian', camat.token)).statusCode).toBe(401);
    expect((await masuk('camat', 'password-camat-1')).status).toBe(401);
    const camat2 = await masuk('camat', 'password-camat-2');
    expect(camat2.status).toBe(200);

    expect((await req('PATCH', `/petugas/${id}`, token, { aktif: false })).statusCode).toBe(200);
    expect((await req('GET', '/pengajuan/antrian', camat2.token)).statusCode).toBe(401);
    expect((await masuk('camat', 'password-camat-2')).status).toBe(401);
  });

  it('akun sendiri tidak bisa dinonaktifkan, dan Petugas Pelayanan aktif terakhir tidak bisa dihapus perannya', async () => {
    await appDenganAkunAwal();
    const { token } = await masuk('pelayanan', 'password-awal-1');
    const saya = (await req('GET', '/petugas', token)).json().data[0].id_user;
    expect((await req('PATCH', `/petugas/${saya}`, token, { aktif: false })).statusCode).toBe(422);
    expect((await req('PATCH', `/petugas/${saya}`, token, { role: 'CAMAT' })).statusCode).toBe(422);

    const id2 = (await req('POST', '/petugas', token, { username: 'pelayanan2', nama_lengkap: 'Admin Dua', role: 'ADMIN', password: 'password-admin-2' })).json().data.id_user;
    const admin2 = await masuk('pelayanan2', 'password-admin-2');
    // Admin kedua menonaktifkan admin pertama: boleh, karena admin kedua masih aktif.
    expect((await req('PATCH', `/petugas/${saya}`, admin2.token, { aktif: false })).statusCode).toBe(200);
    expect(id2).toBeTruthy();
  });

  it('ganti password sendiri butuh password lama yang benar', async () => {
    await appDenganAkunAwal();
    const { token } = await masuk('pelayanan', 'password-awal-1');
    expect((await req('PATCH', '/auth/password', token, { password_lama: 'salah-salah', password_baru: 'password-baru-22' })).statusCode).toBe(422);
    expect((await req('PATCH', '/auth/password', token, { password_lama: 'password-awal-1', password_baru: 'pendek' })).statusCode).toBe(422);
    const warga = await login(ctx!.app, EMAIL.warga1);
    expect((await req('PATCH', '/auth/password', warga, { password_lama: 'x', password_baru: 'password-baru-22' })).statusCode).toBe(403);
  });
});

describe('Production tanpa akun dummy petugas', () => {
  it('akun awal bisa dibuat walau login tiruan petugas ditolak', async () => {
    const config = loadConfig({ NODE_ENV: 'production', ALLOW_MOCK_AUTH_IN_PRODUCTION: 'true', CORS_ORIGINS: 'https://kectarakantimur.com', LOG_LEVEL: 'silent', ...AWAL });
    const c = createContainer(config);
    ctx = { app: await buildApp(c), c };
    await ctx.app.ready();
    expect(await c.services.akunPetugas.pastikanAkunAwal()).toBe('dibuat');
    expect((await masuk('pelayanan', 'password-awal-1')).status).toBe(200);
  });
});
