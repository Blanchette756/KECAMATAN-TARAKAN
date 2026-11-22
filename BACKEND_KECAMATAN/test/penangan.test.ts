import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ajukan, bearer, buatApp, DATA_PENGANTAR, EMAIL, login, patch, type TestCtx } from './helpers.js';

let ctx: TestCtx;
let tWarga: string, tAdmin: string, tAdmin2: string, tKasi: string;

/** Petugas memakai akun asli (username + password), sama seperti di situs: akun pertama dari env, sisanya lewat Kelola Akun. */
async function masukPetugas(username: string, password: string): Promise<string> {
  const res = await ctx.app.inject({ method: 'POST', url: '/api/v1/auth/login-petugas', payload: { username, password } });
  if (res.statusCode !== 200) throw new Error(`Login ${username} gagal: ${res.body}`);
  return res.json().data.token as string;
}

async function tambahAkun(token: string, akun: Record<string, unknown>) {
  const res = await ctx.app.inject({ method: 'POST', url: '/api/v1/petugas', headers: bearer(token), payload: akun });
  if (res.statusCode !== 201 && res.statusCode !== 200) throw new Error(`Tambah akun gagal: ${res.body}`);
}

beforeEach(async () => {
  ctx = await buatApp({ PETUGAS_AWAL_USERNAME: 'pelayanan1', PETUGAS_AWAL_PASSWORD: 'password-satu-1', PETUGAS_AWAL_NAMA: 'Petugas Satu' });
  await ctx.c.services.akunPetugas.pastikanAkunAwal();
  tAdmin = await masukPetugas('pelayanan1', 'password-satu-1');
  await tambahAkun(tAdmin, { username: 'pelayanan2', nama_lengkap: 'Petugas Dua', role: 'ADMIN', seksi: null, password: 'password-dua-22' });
  await tambahAkun(tAdmin, { username: 'kasi.tapem', nama_lengkap: 'Kasi Tapem', role: 'KASI', seksi: 'TATA_PEMERINTAHAN', password: 'password-kasi-1' });
  [tWarga, tAdmin2, tKasi] = await Promise.all([login(ctx.app, EMAIL.warga1), masukPetugas('pelayanan2', 'password-dua-22'), masukPetugas('kasi.tapem', 'password-kasi-1')]);
});
afterEach(async () => {
  await ctx.app.close();
});

const url = (id: string, aksi: string) => `/api/v1/pengajuan/${id}/${aksi}`;
const detail = async (token: string, id: string) =>
  (await ctx.app.inject({ method: 'GET', url: `/api/v1/pengajuan/${id}`, headers: bearer(token) })).json().data;

describe('Petugas Pelayanan penanggung jawab berkas', () => {
  it('berkas baru belum ada penanggung jawab; "Saya tangani" mencatat nama petugas di detail dan antrean', async () => {
    const p = await ajukan(ctx, tWarga, 'LAYANAN-007', DATA_PENGANTAR);
    expect((await detail(tAdmin, p.id_pengajuan)).penangan).toBeNull();

    const res = await patch(ctx.app, tAdmin, url(p.id_pengajuan, 'tangani'), { version: p.version });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.penangan.nama_lengkap).toBe('Petugas Satu');
    // Status warga tidak berubah.
    expect(res.json().data.status_pengajuan).toBe('DIAJUKAN');

    const antrian = (await ctx.app.inject({ method: 'GET', url: '/api/v1/pengajuan/antrian?semua=true', headers: bearer(tAdmin2) })).json().data;
    const baris = antrian.find((x: { id_pengajuan: string }) => x.id_pengajuan === p.id_pengajuan);
    expect(baris.penangan.nama_lengkap).toBe('Petugas Satu');
  });

  it('petugas lain tidak bisa memproses atau mengambil berkas tanpa mengambil alih', async () => {
    let p = await ajukan(ctx, tWarga, 'LAYANAN-007', DATA_PENGANTAR);
    p = (await patch(ctx.app, tAdmin, url(p.id_pengajuan, 'tangani'), { version: p.version })).json().data;

    const proses = await patch(ctx.app, tAdmin2, url(p.id_pengajuan, 'verifikasi'), { aksi: 'SETUJUI', version: p.version });
    expect(proses.statusCode).toBe(409);
    expect(proses.json().error.code).toBe('DITANGANI_PETUGAS_LAIN');

    const ambil = await patch(ctx.app, tAdmin2, url(p.id_pengajuan, 'tangani'), { version: p.version });
    expect(ambil.statusCode).toBe(409);
    expect(ambil.json().error.code).toBe('DITANGANI_PETUGAS_LAIN');
  });

  it('ambil alih memindahkan berkas ke petugas lain dan dicatat di audit', async () => {
    let p = await ajukan(ctx, tWarga, 'LAYANAN-007', DATA_PENGANTAR);
    p = (await patch(ctx.app, tAdmin, url(p.id_pengajuan, 'tangani'), { version: p.version })).json().data;

    const res = await patch(ctx.app, tAdmin2, url(p.id_pengajuan, 'tangani'), { version: p.version, ambil_alih: true });
    expect(res.statusCode).toBe(200);
    p = res.json().data;
    expect(p.penangan.nama_lengkap).toBe('Petugas Dua');
    expect(ctx.c.store.auditLog.some((a) => a.aksi === 'AMBIL_ALIH_PENGAJUAN' && a.target_id === p.id_pengajuan)).toBe(true);

    // Sekarang petugas pertama yang terkunci, petugas kedua bisa memproses.
    expect((await patch(ctx.app, tAdmin, url(p.id_pengajuan, 'verifikasi'), { aksi: 'SETUJUI', version: p.version })).statusCode).toBe(409);
    expect((await patch(ctx.app, tAdmin2, url(p.id_pengajuan, 'verifikasi'), { aksi: 'SETUJUI', version: p.version })).statusCode).toBe(200);
  });

  it('memproses berkas tanpa menekan "Saya tangani" otomatis menjadikan petugas itu penanggung jawab, juga saat berkas kembali dari Kasi', async () => {
    let p = await ajukan(ctx, tWarga, 'LAYANAN-007', DATA_PENGANTAR);
    p = (await patch(ctx.app, tAdmin, url(p.id_pengajuan, 'verifikasi'), { aksi: 'SETUJUI', version: p.version })).json().data;
    expect(p.penangan.nama_lengkap).toBe('Petugas Satu');

    p = (await patch(ctx.app, tKasi, url(p.id_pengajuan, 'paraf-kasi'), { aksi: 'KEMBALIKAN', catatan: 'Cek ulang KTP', version: p.version })).json().data;
    expect(p.status_pengajuan).toBe('DIKEMBALIKAN_KE_ADMIN');
    expect(p.penangan.nama_lengkap).toBe('Petugas Satu');
    expect((await patch(ctx.app, tAdmin2, url(p.id_pengajuan, 'verifikasi'), { aksi: 'SETUJUI', version: p.version })).statusCode).toBe(409);
  });

  it('versi lama, berkas selesai, dan peran selain Petugas Pelayanan ditolak', async () => {
    const p = await ajukan(ctx, tWarga, 'LAYANAN-007', DATA_PENGANTAR);
    expect((await patch(ctx.app, tAdmin, url(p.id_pengajuan, 'tangani'), { version: p.version + 5 })).statusCode).toBe(409);
    expect((await patch(ctx.app, tKasi, url(p.id_pengajuan, 'tangani'), { version: p.version })).statusCode).toBe(403);
    expect((await patch(ctx.app, tWarga, url(p.id_pengajuan, 'tangani'), { version: p.version })).statusCode).toBe(403);

    const ditolak = (await patch(ctx.app, tAdmin, url(p.id_pengajuan, 'verifikasi'), { aksi: 'TOLAK', catatan: 'Bukan warga kecamatan', version: p.version })).json().data;
    const res = await patch(ctx.app, tAdmin2, url(p.id_pengajuan, 'tangani'), { version: ditolak.version, ambil_alih: true });
    expect(res.statusCode).toBe(409);
  });

  it('admin yang dinonaktifkan atau dipindah peran melepas berkas aktifnya; berkas selesai tetap tercatat', async () => {
    let aktif = await ajukan(ctx, tWarga, 'LAYANAN-007', DATA_PENGANTAR);
    aktif = (await patch(ctx.app, tAdmin2, url(aktif.id_pengajuan, 'tangani'), { version: aktif.version })).json().data;
    let ditolak = await ajukan(ctx, (await login(ctx.app, EMAIL.warga2)), 'LAYANAN-007', DATA_PENGANTAR);
    ditolak = (await patch(ctx.app, tAdmin2, url(ditolak.id_pengajuan, 'verifikasi'), { aksi: 'TOLAK', catatan: 'Bukan warga kecamatan', version: ditolak.version })).json().data;

    const akun = (await ctx.app.inject({ method: 'GET', url: '/api/v1/petugas', headers: bearer(tAdmin) })).json().data;
    const idDua = akun.find((a: { username: string }) => a.username === 'pelayanan2').id_user;
    expect((await patch(ctx.app, tAdmin, `/api/v1/petugas/${idDua}`, { aktif: false })).statusCode).toBe(200);

    expect((await detail(tAdmin, aktif.id_pengajuan)).penangan).toBeNull();
    expect((await detail(tWarga, aktif.id_pengajuan)).penangan).toBeNull();
    expect((await detail(tAdmin, ditolak.id_pengajuan)).penangan.nama_lengkap).toBe('Petugas Dua');
    // Petugas lain langsung bisa memproses tanpa ambil alih.
    const res = await patch(ctx.app, tAdmin, url(aktif.id_pengajuan, 'verifikasi'), { aksi: 'SETUJUI', version: (await detail(tAdmin, aktif.id_pengajuan)).version });
    expect(res.statusCode).toBe(200);
  });

  it('warga melihat nama petugas yang menangani permohonannya (tanpa id akun), di detail dan di daftar', async () => {
    let p = await ajukan(ctx, tWarga, 'LAYANAN-007', DATA_PENGANTAR);
    const saya = async () => (await ctx.app.inject({ method: 'GET', url: '/api/v1/pengajuan/saya', headers: bearer(tWarga) })).json().data[0];
    expect((await detail(tWarga, p.id_pengajuan)).penangan).toBeNull();
    expect((await saya()).penangan).toBeNull();

    p = (await patch(ctx.app, tAdmin, url(p.id_pengajuan, 'tangani'), { version: p.version })).json().data;
    expect((await detail(tWarga, p.id_pengajuan)).penangan).toEqual({ nama_lengkap: 'Petugas Satu' });
    expect((await saya()).penangan).toEqual({ nama_lengkap: 'Petugas Satu' });

    // Setelah diambil alih, warga langsung melihat nama petugas yang baru.
    await patch(ctx.app, tAdmin2, url(p.id_pengajuan, 'tangani'), { version: p.version, ambil_alih: true });
    expect((await detail(tWarga, p.id_pengajuan)).penangan).toEqual({ nama_lengkap: 'Petugas Dua' });
  });
});
