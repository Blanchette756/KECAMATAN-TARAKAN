import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { contohBerkas } from '../src/database/seed-demo.js';
import { bearer, buatApp, DATA_PENGANTAR, EMAIL, login, type TestCtx } from './helpers.js';

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);

let ctx: TestCtx;
let tWarga: string, tWarga2: string, tAdmin: string;

beforeEach(async () => {
  ctx = await buatApp();
  [tWarga, tWarga2, tAdmin] = await Promise.all([login(ctx.app, EMAIL.warga1), login(ctx.app, EMAIL.warga2), login(ctx.app, EMAIL.admin)]);
});
afterEach(async () => {
  await ctx.app.close();
});

const unggah = (token: string, isi: Buffer, tipe = 'image/png') =>
  ctx.app.inject({ method: 'POST', url: '/api/v1/berkas/unggah?nama_file=ktp.png', headers: { ...bearer(token), 'content-type': tipe }, payload: isi });

async function ajukanDenganFile(token: string) {
  const fileId = (await unggah(token, PNG)).json().data.file_id as string;
  const layanan = await ctx.c.services.layanan.detail('LAYANAN-007');
  const berkas = contohBerkas(layanan, DATA_PENGANTAR).map((b, i) => (i === 0 ? { ...b, nama_file: 'ktp.png', mime_type: 'image/png', file_id: fileId } : b));
  return ctx.app.inject({ method: 'POST', url: '/api/v1/pengajuan', headers: bearer(token), payload: { id_layanan: 'LAYANAN-007', data_formulir: DATA_PENGANTAR, berkas } });
}

describe('Unggah berkas', () => {
  it('menolak file yang isinya tidak sesuai tipe', async () => {
    const res = await unggah(tWarga, Buffer.from('<script>alert(1)</script>'));
    expect(res.statusCode).toBe(422);
  });

  it('menolak tipe selain PDF, JPG, dan PNG', async () => {
    expect((await unggah(tWarga, PNG, 'text/plain')).statusCode).toBe(400);
  });

  it('hanya warga yang boleh mengunggah', async () => {
    expect((await unggah(tAdmin, PNG)).statusCode).toBe(403);
  });

  it('file tidak bisa dipakai warga lain', async () => {
    const fileId = (await unggah(tWarga, PNG)).json().data.file_id;
    const layanan = await ctx.c.services.layanan.detail('LAYANAN-007');
    const berkas = contohBerkas(layanan, DATA_PENGANTAR).map((b, i) => (i === 0 ? { ...b, file_id: fileId } : b));
    const res = await ctx.app.inject({ method: 'POST', url: '/api/v1/pengajuan', headers: bearer(tWarga2), payload: { id_layanan: 'LAYANAN-007', data_formulir: DATA_PENGANTAR, berkas } });
    expect(res.statusCode).toBe(422);
  });

  it('pemilik dan petugas bisa mengambil isi file, warga lain tidak', async () => {
    const res = await ajukanDenganFile(tWarga);
    expect(res.statusCode).toBe(201);
    const berkas = res.json().data.berkas.find((b: { file_url: string | null }) => b.file_url);
    expect(berkas.file_url).toBe(`/api/v1/berkas/${berkas.id_berkas}/file`);

    const ambil = (token: string) => ctx.app.inject({ method: 'GET', url: berkas.file_url, headers: bearer(token) });
    const pemilik = await ambil(tWarga);
    expect(pemilik.statusCode).toBe(200);
    expect(pemilik.headers['content-type']).toBe('image/png');
    expect(pemilik.rawPayload.equals(PNG)).toBe(true);
    expect((await ambil(tAdmin)).statusCode).toBe(200);
    expect((await ambil(tWarga2)).statusCode).toBe(404);
    expect((await ctx.app.inject({ method: 'GET', url: berkas.file_url })).statusCode).toBe(401);
  });

  it('admin bisa melihat semua berkas lewat antrian?semua=true, warga tidak', async () => {
    const dibuat = (await ajukanDenganFile(tWarga)).json().data;
    const res = await ctx.app.inject({ method: 'GET', url: '/api/v1/pengajuan/antrian?semua=true', headers: bearer(tAdmin) });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.some((p: { id_pengajuan: string }) => p.id_pengajuan === dibuat.id_pengajuan)).toBe(true);
    expect((await ctx.app.inject({ method: 'GET', url: '/api/v1/pengajuan/antrian?semua=true', headers: bearer(tWarga) })).statusCode).toBe(403);
  });
});

describe('File unggahan dicek sebelum data disimpan', () => {
  const FILE_TIDAK_ADA = 'FIL-00000000-0000-4000-8000-000000000000';

  it('ajukan dengan file yang tidak ada: ditolak dan TIDAK meninggalkan pengajuan tanpa berkas', async () => {
    const layanan = await ctx.c.services.layanan.detail('LAYANAN-007');
    const berkas = contohBerkas(layanan, DATA_PENGANTAR).map((b, i) => (i === 0 ? { ...b, file_id: FILE_TIDAK_ADA } : b));
    const res = await ctx.app.inject({ method: 'POST', url: '/api/v1/pengajuan', headers: bearer(tWarga), payload: { id_layanan: 'LAYANAN-007', data_formulir: DATA_PENGANTAR, berkas } });
    expect(res.statusCode).toBe(422);
    expect(await ctx.c.repos.pengajuan.listAll()).toHaveLength(0);
  });

  it('revisi dengan file milik warga lain: ditolak, status dan berkas lama tetap utuh', async () => {
    const p = (await ajukanDenganFile(tWarga)).json().data;
    const ktp = p.berkas.find((b: { id_syarat: string }) => b.id_syarat === 'SYR-007-01');
    const revisi = await ctx.app.inject({
      method: 'PATCH',
      url: `/api/v1/pengajuan/${p.id_pengajuan}/verifikasi`,
      headers: bearer(tAdmin),
      payload: { aksi: 'MINTA_REVISI', catatan: 'KTP buram, mohon unggah ulang', berkas: [{ id_berkas: ktp.id_berkas, status: 'PERLU_PERBAIKAN', catatan: 'Buram' }], version: p.version },
    });
    const perluRevisi = revisi.json().data;
    expect(perluRevisi.status_pengajuan).toBe('PERLU_REVISI');

    const fileOrangLain = (await unggah(tWarga2, PNG)).json().data.file_id as string;
    const res = await ctx.app.inject({
      method: 'PATCH',
      url: `/api/v1/pengajuan/${p.id_pengajuan}/revisi`,
      headers: bearer(tWarga),
      payload: { berkas: [{ id_syarat: 'SYR-007-01', nama_file: 'ktp.png', mime_type: 'image/png', ukuran_byte: PNG.length, file_id: fileOrangLain }], version: perluRevisi.version },
    });
    expect(res.statusCode).toBe(422);

    const sesudah = await ctx.c.services.pengajuan.detail(await ctx.c.repos.users.findByEmail(EMAIL.warga1).then((u) => u!), p.id_pengajuan);
    expect(sesudah.status_pengajuan).toBe('PERLU_REVISI');
    expect(sesudah.version).toBe(perluRevisi.version);
    expect(sesudah.berkas.map((b) => b.id_berkas).sort()).toEqual(perluRevisi.berkas.map((b: { id_berkas: string }) => b.id_berkas).sort());
  });
});
