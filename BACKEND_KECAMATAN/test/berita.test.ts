import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadConfig } from '../src/config/env.js';
import { createContainer } from '../src/container.js';
import { bearer, buatApp, EMAIL, login, type TestCtx } from './helpers.js';

let ctx: TestCtx;
let tAdmin: string, tWarga: string, tKasi: string, tCamat: string;

beforeEach(async () => {
  ctx = await buatApp();
  [tAdmin, tWarga, tKasi, tCamat] = await Promise.all([login(ctx.app, EMAIL.admin), login(ctx.app, EMAIL.warga1), login(ctx.app, EMAIL.kasi), login(ctx.app, EMAIL.camat)]);
});
afterEach(async () => {
  await ctx.app.close();
});

const BERITA = { judul: 'Kerja bakti serentak se-kecamatan', tanggal: '2026-11-20', ringkasan: 'Warga diajak membersihkan saluran air di lingkungan masing-masing.' };
const URL_BERITA = '/api/v1/berita';
const daftar = async () => (await ctx.app.inject({ method: 'GET', url: URL_BERITA })).json().data as { id_berita: string; judul: string; tanggal: string }[];

describe('Berita', () => {
  it('publik: daftar berita awal tanpa login, terbaru di atas', async () => {
    const data = await daftar();
    expect(data.length).toBe(5);
    const tanggal = data.map((b) => b.tanggal);
    expect(tanggal).toEqual([...tanggal].sort().reverse());
  });

  it('petugas pelayanan bisa tambah, ubah, dan hapus; perubahan langsung terlihat publik', async () => {
    const tambah = await ctx.app.inject({ method: 'POST', url: URL_BERITA, headers: bearer(tAdmin), payload: BERITA });
    expect(tambah.statusCode).toBe(201);
    const id = tambah.json().data.id_berita as string;
    expect((await daftar())[0]?.id_berita).toBe(id);

    const ubah = await ctx.app.inject({ method: 'PATCH', url: `${URL_BERITA}/${id}`, headers: bearer(tAdmin), payload: { ...BERITA, judul: '  Kerja   bakti diundur  ' } });
    expect(ubah.statusCode).toBe(200);
    expect(ubah.json().data.judul).toBe('Kerja bakti diundur');

    expect((await ctx.app.inject({ method: 'DELETE', url: `${URL_BERITA}/${id}`, headers: bearer(tAdmin) })).statusCode).toBe(200);
    expect((await daftar()).some((b) => b.id_berita === id)).toBe(false);
    expect((await ctx.app.inject({ method: 'DELETE', url: `${URL_BERITA}/${id}`, headers: bearer(tAdmin) })).statusCode).toBe(404);
  });

  it('hanya petugas pelayanan: warga, kasi, dan camat ditolak; tanpa login 401', async () => {
    const id = (await daftar())[0]!.id_berita;
    for (const token of [tWarga, tKasi, tCamat]) {
      expect((await ctx.app.inject({ method: 'POST', url: URL_BERITA, headers: bearer(token), payload: BERITA })).statusCode).toBe(403);
      expect((await ctx.app.inject({ method: 'PATCH', url: `${URL_BERITA}/${id}`, headers: bearer(token), payload: BERITA })).statusCode).toBe(403);
      expect((await ctx.app.inject({ method: 'DELETE', url: `${URL_BERITA}/${id}`, headers: bearer(token) })).statusCode).toBe(403);
    }
    expect((await ctx.app.inject({ method: 'POST', url: URL_BERITA, payload: BERITA })).statusCode).toBe(401);
    expect((await daftar()).length).toBe(5);
  });

  it('validasi: tanggal mustahil, judul kosong setelah dirapikan, karakter tersembunyi, field asing', async () => {
    const kirim = (payload: unknown) => ctx.app.inject({ method: 'POST', url: URL_BERITA, headers: bearer(tAdmin), payload: payload as Record<string, unknown> });
    expect((await kirim({ ...BERITA, tanggal: '2026-02-30' })).statusCode).toBe(422);
    expect((await kirim({ ...BERITA, judul: '       ' })).statusCode).toBe(422);
    expect((await kirim({ ...BERITA, ringkasan: 'Isi berita‮dengan pengarah teks tersembunyi' })).statusCode).toBe(422);
    expect((await kirim({ ...BERITA, tanggal: '20-11-2026' })).statusCode).toBe(400);
    expect((await kirim({ ...BERITA, penulis: 'tidak dikenal' })).statusCode).toBe(400);
    expect((await daftar()).length).toBe(5);
  });

  describe('penyimpanan di file', () => {
    let folder: string;
    beforeEach(() => {
      folder = mkdtempSync(path.join(tmpdir(), 'berita-'));
    });
    afterEach(() => {
      rmSync(folder, { recursive: true, force: true });
    });
    const configDengan = (file: string) => ({ ...loadConfig({ NODE_ENV: 'test', SEED_DEMO_PENGAJUAN: 'false' }), beritaFile: file });

    it('berita yang ditambahkan tetap ada setelah server dimulai ulang', async () => {
      const file = path.join(folder, 'runtime', 'berita.json');
      const c1 = createContainer(configDengan(file));
      const admin = (await c1.repos.users.findByEmail(EMAIL.admin))!;
      await c1.services.berita.tambah(admin, BERITA);
      expect(existsSync(file)).toBe(true);

      const c2 = createContainer(configDengan(file)); // seolah server baru menyala
      const judul = (await c2.services.berita.daftar()).map((b) => b.judul);
      expect(judul).toContain(BERITA.judul);
      expect(judul.length).toBe(6);
    });

    it('file berita rusak tidak menghentikan server: berita awal dipakai', async () => {
      const file = path.join(folder, 'berita.json');
      writeFileSync(file, '{ ini bukan JSON');
      const peringatan = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      try {
        const c = createContainer(configDengan(file));
        expect((await c.services.berita.daftar()).length).toBe(5);
        expect(peringatan).toHaveBeenCalled();
      } finally {
        peringatan.mockRestore();
      }
    });
  });
});
