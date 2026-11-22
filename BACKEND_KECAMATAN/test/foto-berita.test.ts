import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { bearer, buatApp, EMAIL, login, type TestCtx } from './helpers.js';

let ctx: TestCtx;
let tAdmin: string, tWarga: string, tKasi: string;

beforeEach(async () => {
  ctx = await buatApp();
  [tAdmin, tWarga, tKasi] = await Promise.all([login(ctx.app, EMAIL.admin), login(ctx.app, EMAIL.warga1), login(ctx.app, EMAIL.kasi)]);
});
afterEach(async () => {
  await ctx.app.close();
});

const URL_BERITA = '/api/v1/berita';
/** JPEG/PNG terkecil yang cukup untuk lolos pemeriksaan tanda tangan file. */
const JPG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(200, 1)]);
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(200, 2)]);

async function beritaBaru(): Promise<string> {
  const res = await ctx.app.inject({
    method: 'POST',
    url: URL_BERITA,
    headers: bearer(tAdmin),
    payload: { judul: 'Kerja bakti serentak', tanggal: '2026-11-20', ringkasan: 'Warga diajak membersihkan saluran air bersama.' },
  });
  expect(res.statusCode).toBe(201);
  expect(res.json().data.foto_diperbarui).toBeNull();
  return res.json().data.id_berita as string;
}

const unggah = (id: string, token: string, isi: Buffer, tipe: string) =>
  ctx.app.inject({ method: 'POST', url: `${URL_BERITA}/${id}/foto`, headers: { ...bearer(token), 'content-type': tipe }, payload: isi });
const fotoDi = async (id: string) => ((await ctx.app.inject({ method: 'GET', url: URL_BERITA })).json().data as { id_berita: string; foto_diperbarui: string | null }[]).find((b) => b.id_berita === id)?.foto_diperbarui;

describe('Foto berita', () => {
  it('petugas pelayanan memasang foto; daftar publik menandai berita berfoto dan foto bisa dibaca tanpa login', async () => {
    const id = await beritaBaru();
    const res = await unggah(id, tAdmin, JPG, 'image/jpeg');
    expect(res.statusCode).toBe(200);
    const versi = res.json().data.foto_diperbarui as string;
    expect(versi).toBeTruthy();
    expect(await fotoDi(id)).toBe(versi);

    const foto = await ctx.app.inject({ method: 'GET', url: `${URL_BERITA}/${id}/foto?v=${encodeURIComponent(versi)}` });
    expect(foto.statusCode).toBe(200);
    expect(foto.headers['content-type']).toBe('image/jpeg');
    expect(foto.headers['cache-control']).toContain('immutable');
    expect(foto.rawPayload.equals(JPG)).toBe(true);
  });

  it('mengganti foto menimpa foto lama; menghapus foto dan menghapus berita ikut membuang fotonya', async () => {
    const id = await beritaBaru();
    await unggah(id, tAdmin, JPG, 'image/jpeg');
    expect((await unggah(id, tAdmin, PNG, 'image/png')).statusCode).toBe(200);
    const foto = await ctx.app.inject({ method: 'GET', url: `${URL_BERITA}/${id}/foto` });
    expect(foto.headers['content-type']).toBe('image/png');

    const hapus = await ctx.app.inject({ method: 'DELETE', url: `${URL_BERITA}/${id}/foto`, headers: bearer(tAdmin) });
    expect(hapus.statusCode).toBe(200);
    expect(hapus.json().data.foto_diperbarui).toBeNull();
    expect((await ctx.app.inject({ method: 'GET', url: `${URL_BERITA}/${id}/foto` })).statusCode).toBe(404);

    await unggah(id, tAdmin, JPG, 'image/jpeg');
    expect((await ctx.app.inject({ method: 'DELETE', url: `${URL_BERITA}/${id}`, headers: bearer(tAdmin) })).statusCode).toBe(200);
    expect((await ctx.c.repos.fotoBerita.listMeta()).some((f) => f.id_berita === id)).toBe(false);
  });

  it('mengubah judul berita tidak menghilangkan fotonya', async () => {
    const id = await beritaBaru();
    await unggah(id, tAdmin, JPG, 'image/jpeg');
    const res = await ctx.app.inject({
      method: 'PATCH',
      url: `${URL_BERITA}/${id}`,
      headers: bearer(tAdmin),
      payload: { judul: 'Kerja bakti serentak (diperbarui)', tanggal: '2026-11-20', ringkasan: 'Warga diajak membersihkan saluran air bersama.' },
    });
    expect(res.json().data.foto_diperbarui).toBeTruthy();
  });

  it('menolak selain JPG/PNG, isi palsu, file di atas 10 MB, berita yang tidak ada, dan peran selain petugas pelayanan', async () => {
    const id = await beritaBaru();
    expect((await unggah(id, tAdmin, Buffer.from('%PDF-1.4 isi'), 'application/pdf')).statusCode).toBe(415);
    expect((await unggah(id, tAdmin, Buffer.from('bukan foto sama sekali'), 'image/jpeg')).statusCode).toBe(422);
    expect((await unggah(id, tAdmin, Buffer.concat([JPG, Buffer.alloc(10 * 1024 * 1024)]), 'image/jpeg')).statusCode).toBe(413);
    expect((await unggah('BRT-tidak-ada', tAdmin, JPG, 'image/jpeg')).statusCode).toBe(404);
    expect((await unggah(id, tKasi, JPG, 'image/jpeg')).statusCode).toBe(403);
    expect((await unggah(id, tWarga, JPG, 'image/jpeg')).statusCode).toBe(403);
    expect((await ctx.app.inject({ method: 'DELETE', url: `${URL_BERITA}/${id}/foto`, headers: bearer(tWarga) })).statusCode).toBe(403);
    expect(await fotoDi(id)).toBeNull();
  });
});
