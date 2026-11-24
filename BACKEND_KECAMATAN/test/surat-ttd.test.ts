import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { contohPdf } from '../src/database/seed-demo.js';
import { ajukan, bearer, buatApp, DATA_PENGANTAR, EMAIL, login, patch, type TestCtx } from './helpers.js';

let ctx: TestCtx;
let tWarga: string, tWarga2: string, tAdmin: string, tKasi: string, tCamat: string;

beforeEach(async () => {
  ctx = await buatApp();
  [tWarga, tWarga2, tAdmin, tKasi, tCamat] = await Promise.all([
    login(ctx.app, EMAIL.warga1),
    login(ctx.app, EMAIL.warga2),
    login(ctx.app, EMAIL.admin),
    login(ctx.app, EMAIL.kasi),
    login(ctx.app, EMAIL.camat),
  ]);
});
afterEach(async () => {
  await ctx.app.close();
});

const url = (id: string, aksi: string) => `/api/v1/pengajuan/${id}/${aksi}`;
const PDF = contohPdf('Surat bertanda tangan TTE');

/** Pengajuan yang sudah diverifikasi petugas dan diparaf Kasi, menunggu tanda tangan Camat. */
async function menungguTtd(idLayanan = 'LAYANAN-007') {
  let p = await ajukan(ctx, tWarga, idLayanan, DATA_PENGANTAR);
  p = (await patch(ctx.app, tAdmin, url(p.id_pengajuan, 'verifikasi'), { aksi: 'SETUJUI', version: p.version })).json().data;
  p = (await patch(ctx.app, tKasi, url(p.id_pengajuan, 'paraf-kasi'), { aksi: 'SETUJUI', version: p.version })).json().data;
  expect(p.status_pengajuan).toBe('MENUNGGU_TTE_CAMAT');
  return p;
}

const unggah = (id: string, token: string, isi: Buffer, tipe = 'application/pdf', nama = 'surat ttd.pdf') =>
  ctx.app.inject({ method: 'POST', url: `${url(id, 'surat')}?nama_file=${encodeURIComponent(nama)}`, headers: { ...bearer(token), 'content-type': tipe }, payload: isi });
const ambilSurat = (id: string, token: string) => ctx.app.inject({ method: 'GET', url: url(id, 'surat'), headers: bearer(token) });
const detail = async (id: string, token: string) => (await ctx.app.inject({ method: 'GET', url: `/api/v1/pengajuan/${id}`, headers: bearer(token) })).json().data;

describe('Surat bertanda tangan TTE', () => {
  it('Camat tidak menandatangani di situs, tetapi masih bisa mengembalikan', async () => {
    const p = await menungguTtd();
    const ttd = await patch(ctx.app, tCamat, url(p.id_pengajuan, 'tte-camat'), { aksi: 'SETUJUI', version: p.version });
    expect(ttd.statusCode).toBe(409);
    expect(ttd.json().error.code).toBe('TTE_DI_APLIKASI');

    const kembali = await patch(ctx.app, tCamat, url(p.id_pengajuan, 'tte-camat'), { aksi: 'KEMBALIKAN', catatan: 'Nama pemohon di draf salah', version: p.version });
    expect(kembali.statusCode).toBe(200);
    expect(kembali.json().data.status_pengajuan).toBe('DIKEMBALIKAN_KE_ADMIN');
  });

  it('berkas menunggu tanda tangan masuk antrean petugas pelayanan', async () => {
    const p = await menungguTtd();
    const antrian = (await ctx.app.inject({ method: 'GET', url: '/api/v1/pengajuan/antrian', headers: bearer(tAdmin) })).json();
    expect(antrian.data.map((x: { id_pengajuan: string }) => x.id_pengajuan)).toContain(p.id_pengajuan);
  });

  it('petugas unggah PDF lalu kirim; pemohon baru bisa mengunduh setelah dikirim', async () => {
    const p = await menungguTtd();
    const res = await unggah(p.id_pengajuan, tAdmin, PDF);
    expect(res.statusCode).toBe(200);
    // Unggah tidak mengubah status maupun versi.
    expect(res.json().data.status_pengajuan).toBe('MENUNGGU_TTE_CAMAT');
    expect(res.json().data.version).toBe(p.version);
    expect(res.json().data.surat).toMatchObject({ nama_file: 'surat ttd.pdf', ukuran_byte: PDF.length, file_url: url(p.id_pengajuan, 'surat') });

    // Petugas bisa memeriksa suratnya sebelum dikirim; pemohon belum.
    expect((await ambilSurat(p.id_pengajuan, tAdmin)).statusCode).toBe(200);
    expect((await ambilSurat(p.id_pengajuan, tWarga)).statusCode).toBe(404);
    expect((await detail(p.id_pengajuan, tWarga)).surat).toBeNull();

    const kirim = await patch(ctx.app, tAdmin, url(p.id_pengajuan, 'terbitkan'), { version: p.version, nomor_surat: '  470/123/CTT/XI/2026 ' });
    expect(kirim.statusCode).toBe(200);
    const d = kirim.json().data;
    // Layanan ini diambil di kantor: dokumen tetap siap diambil, dan salinan PDF-nya bisa diunduh.
    expect(d.status_pengajuan).toBe('SIAP_DIAMBIL');
    expect(d.nomor_surat).toBe('470/123/CTT/XI/2026');
    expect(d.file_surat_selesai).toBe(`surat://${p.id_pengajuan}`);

    const unduh = await ambilSurat(p.id_pengajuan, tWarga);
    expect(unduh.statusCode).toBe(200);
    expect(unduh.headers['content-type']).toBe('application/pdf');
    expect(unduh.headers['cache-control']).toBe('private, no-store');
    expect(unduh.rawPayload.equals(PDF)).toBe(true);
    expect((await detail(p.id_pengajuan, tWarga)).surat.nama_file).toBe('surat ttd.pdf');

    const daftar = (await ctx.app.inject({ method: 'GET', url: '/api/v1/pengajuan/saya', headers: bearer(tWarga) })).json().data;
    expect(daftar.find((x: { id_pengajuan: string }) => x.id_pengajuan === p.id_pengajuan).ada_surat).toBe(true);

    // Warga lain tidak bisa mengunduh, dan surat yang sudah dikirim tidak bisa diganti lagi.
    expect((await ambilSurat(p.id_pengajuan, tWarga2)).statusCode).toBe(404);
    expect((await unggah(p.id_pengajuan, tAdmin, PDF)).statusCode).toBe(409);
  });

  it('unggahan baru menggantikan surat lama', async () => {
    const p = await menungguTtd();
    await unggah(p.id_pengajuan, tAdmin, contohPdf('Versi salah'), 'application/pdf', 'salah.pdf');
    await unggah(p.id_pengajuan, tAdmin, PDF, 'application/pdf', 'benar');
    const d = await detail(p.id_pengajuan, tAdmin);
    // Nama tanpa .pdf dilengkapi supaya file yang diunduh warga bisa dibuka.
    expect(d.surat.nama_file).toBe('benar.pdf');
    expect((await ambilSurat(p.id_pengajuan, tAdmin)).rawPayload.equals(PDF)).toBe(true);
  });

  it('hanya PDF asli yang diterima, hanya dari petugas pelayanan, hanya saat menunggu tanda tangan', async () => {
    const p = await menungguTtd();
    expect((await unggah(p.id_pengajuan, tAdmin, Buffer.from('bukan pdf sama sekali'))).statusCode).toBe(422);
    expect((await unggah(p.id_pengajuan, tAdmin, Buffer.alloc(0))).statusCode).toBe(422);
    expect((await unggah(p.id_pengajuan, tAdmin, PDF, 'image/png')).statusCode).toBe(415);
    expect((await unggah(p.id_pengajuan, tWarga, PDF)).statusCode).toBe(403);
    expect((await unggah(p.id_pengajuan, tCamat, PDF)).statusCode).toBe(403);
    expect((await unggah(p.id_pengajuan, tKasi, PDF)).statusCode).toBe(403);

    const baru = await ajukan(ctx, tWarga, 'LAYANAN-007', DATA_PENGANTAR);
    const res = await unggah(baru.id_pengajuan, tAdmin, PDF);
    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe('TRANSISI_TIDAK_VALID');
  });

  it('berkas yang dipegang petugas lain tidak bisa diunggah atau dikirim sebelum diambil alih', async () => {
    const p = await menungguTtd();
    const tersimpan = (await ctx.c.repos.pengajuan.findById(p.id_pengajuan))!;
    await ctx.c.repos.pengajuan.updateIfVersion({ ...tersimpan, id_penangan: 'USR-PETUGAS-LAIN' }, tersimpan.version);
    const versi = tersimpan.version + 1;

    const res = await unggah(p.id_pengajuan, tAdmin, PDF);
    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe('DITANGANI_PETUGAS_LAIN');
    const kirim = await patch(ctx.app, tAdmin, url(p.id_pengajuan, 'terbitkan'), { version: versi });
    expect(kirim.json().error.code).toBe('DITANGANI_PETUGAS_LAIN');
  });

  it('layanan unduh daring wajib punya PDF, lalu langsung SELESAI', async () => {
    const layanan = ctx.c.store.layanan.get('LAYANAN-007')!;
    ctx.c.store.layanan.set('LAYANAN-007', { ...layanan, mode_penyerahan: 'UNDUH' });
    const p = await menungguTtd();

    const tanpaPdf = await patch(ctx.app, tAdmin, url(p.id_pengajuan, 'terbitkan'), { version: p.version });
    expect(tanpaPdf.statusCode).toBe(422);

    await unggah(p.id_pengajuan, tAdmin, PDF);
    const res = await patch(ctx.app, tAdmin, url(p.id_pengajuan, 'terbitkan'), { version: p.version });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.status_pengajuan).toBe('SELESAI');
    expect(res.json().data.tgl_selesai).not.toBeNull();

    const lacak = await ctx.app.inject({
      method: 'POST',
      url: '/api/v1/pengajuan/lacak',
      payload: { no_registrasi: p.no_registrasi, last_4_digit_hp: (await ctx.c.repos.users.findByEmail(EMAIL.warga1))!.no_hp!.slice(-4) },
    });
    expect(lacak.json().data.pesan).toBe('Surat dapat diunduh setelah login.');

    const stat = (await ctx.app.inject({ method: 'GET', url: '/api/v1/pengajuan/statistik', headers: bearer(tAdmin) })).json().data;
    expect(stat.durasi.total_hingga_terbit.sampel).toBe(1);
  });
});
