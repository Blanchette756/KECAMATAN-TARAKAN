import { afterEach, describe, expect, it } from 'vitest';
import { MAKS_FILE_YATIM_PER_WARGA } from '../src/constants/penomoran.js';
import { contohBerkas } from '../src/database/seed-demo.js';
import { LOGIN_PETUGAS_MAKS_GAGAL, LOGIN_PETUGAS_MAKS_GAGAL_SEMUA_IP } from '../src/services/auth.service.js';
import { simpanAkunPetugas } from '../src/services/akun-petugas.js';
import { ajukan, bearer, buatApp, DATA_PENGANTAR, EMAIL, login, patch, type TestCtx } from './helpers.js';

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const url = (id: string, aksi: string) => `/api/v1/pengajuan/${id}/${aksi}`;

let ctx: TestCtx | undefined;
afterEach(async () => {
  await ctx?.app.close();
  ctx = undefined;
});

const unggah = (token: string, nama = 'ktp.png') =>
  ctx!.app.inject({ method: 'POST', url: `/api/v1/berkas/unggah?nama_file=${nama}`, headers: { ...bearer(token), 'content-type': 'image/png' }, payload: PNG });

describe('Perbaikan isian formulir', () => {
  async function perluRevisiIsian() {
    ctx = await buatApp();
    const [tWarga, tAdmin] = await Promise.all([login(ctx.app, EMAIL.warga1), login(ctx.app, EMAIL.admin)]);
    const p = await ajukan(ctx, tWarga, 'LAYANAN-007', DATA_PENGANTAR);
    // Petugas meminta isian diperbaiki tanpa menandai satu pun berkas.
    const res = await patch(ctx.app, tAdmin, url(p.id_pengajuan, 'verifikasi'), {
      aksi: 'MINTA_REVISI',
      catatan: 'Perihal kurang jelas, mohon diperbaiki',
      version: p.version,
    });
    expect(res.statusCode).toBe(200);
    return { tWarga, tAdmin, p: res.json().data };
  }

  it('hanya isian yang diubah: kembali ke DIAJUKAN dengan isian baru, berkas tetap', async () => {
    const { tWarga, p } = await perluRevisiIsian();
    expect(p.status_pengajuan).toBe('PERLU_REVISI');
    expect(p.berkas.every((b: { status_berkas: string }) => b.status_berkas !== 'PERLU_PERBAIKAN')).toBe(true);

    const baru = { perihal: 'Pembukaan rekening tabungan', ditujukan_kepada: 'Bank Contoh' };
    const res = await patch(ctx!.app, tWarga, url(p.id_pengajuan, 'revisi'), { data_formulir: baru, berkas: [], version: p.version });
    expect(res.statusCode).toBe(200);
    const sesudah = res.json().data;
    expect(sesudah.status_pengajuan).toBe('DIAJUKAN');
    expect(sesudah.data_formulir).toEqual(baru);
    expect(sesudah.berkas).toHaveLength(p.berkas.length);
  });

  it('perbaikan kosong ditolak: isian sama dan tidak ada berkas pengganti', async () => {
    const { tWarga, p } = await perluRevisiIsian();
    const sama = await patch(ctx!.app, tWarga, url(p.id_pengajuan, 'revisi'), { data_formulir: DATA_PENGANTAR, berkas: [], version: p.version });
    expect(sama.statusCode).toBe(422);
    expect(JSON.stringify(sama.json().error.details)).toContain('Belum ada yang diperbaiki');
    const tanpaIsian = await patch(ctx!.app, tWarga, url(p.id_pengajuan, 'revisi'), { berkas: [], version: p.version });
    expect(tanpaIsian.statusCode).toBe(422);
  });

  it('isian baru tetap divalidasi: isian wajib tidak boleh dikosongkan', async () => {
    const { tWarga, p } = await perluRevisiIsian();
    const res = await patch(ctx!.app, tWarga, url(p.id_pengajuan, 'revisi'), { data_formulir: { perihal: '', ditujukan_kepada: 'Bank Contoh' }, berkas: [], version: p.version });
    expect(res.statusCode).toBe(422);
    expect(JSON.stringify(res.json().error.details)).toContain('perihal');
  });

  it('antrian boleh meminta 100 berkas per halaman', async () => {
    ctx = await buatApp();
    const tAdmin = await login(ctx.app, EMAIL.admin);
    const ok = await ctx.app.inject({ method: 'GET', url: '/api/v1/pengajuan/antrian?limit=100', headers: bearer(tAdmin) });
    expect(ok.statusCode).toBe(200);
    const lebih = await ctx.app.inject({ method: 'GET', url: '/api/v1/pengajuan/antrian?limit=101', headers: bearer(tAdmin) });
    expect(lebih.statusCode).toBe(400);
  });
});

describe('Berkas unggahan yang tidak dipakai (yatim)', () => {
  async function pengajuanDenganFile(tWarga: string, fileId: string) {
    const layanan = await ctx!.c.services.layanan.detail('LAYANAN-007');
    const berkas = contohBerkas(layanan, DATA_PENGANTAR).map((b, i) => (i === 0 ? { ...b, nama_file: 'ktp.png', mime_type: 'image/png', ukuran_byte: PNG.length, file_id: fileId } : b));
    const res = await ctx!.app.inject({ method: 'POST', url: '/api/v1/pengajuan', headers: bearer(tWarga), payload: { id_layanan: 'LAYANAN-007', data_formulir: DATA_PENGANTAR, berkas } });
    expect(res.statusCode).toBe(201);
    return res.json().data;
  }

  async function mintaRevisiKtp(tAdmin: string, p: { id_pengajuan: string; version: number; berkas: { id_syarat: string; id_berkas: string }[] }) {
    const ktp = p.berkas.find((b) => b.id_syarat === 'SYR-007-01')!;
    const res = await patch(ctx!.app, tAdmin, url(p.id_pengajuan, 'verifikasi'), {
      aksi: 'MINTA_REVISI',
      catatan: 'KTP buram, mohon unggah ulang',
      berkas: [{ id_berkas: ktp.id_berkas, status: 'PERLU_PERBAIKAN', catatan: 'Buram' }],
      version: p.version,
    });
    expect(res.statusCode).toBe(200);
    return res.json().data;
  }

  it('file lama dihapus saat diganti berkas baru, file baru tersimpan', async () => {
    ctx = await buatApp();
    const [tWarga, tAdmin] = await Promise.all([login(ctx.app, EMAIL.warga1), login(ctx.app, EMAIL.admin)]);
    const lama = (await unggah(tWarga)).json().data.file_id as string;
    const p = await pengajuanDenganFile(tWarga, lama);
    const perlu = await mintaRevisiKtp(tAdmin, p);

    const baru = (await unggah(tWarga, 'ktp-baru.png')).json().data.file_id as string;
    const res = await patch(ctx.app, tWarga, url(p.id_pengajuan, 'revisi'), {
      berkas: [{ id_syarat: 'SYR-007-01', nama_file: 'ktp-baru.png', mime_type: 'image/png', ukuran_byte: PNG.length, file_id: baru }],
      version: perlu.version,
    });
    expect(res.statusCode).toBe(200);
    expect(await ctx.c.repos.files.findMeta(lama)).toBeNull();
    expect(await ctx.c.repos.files.findMeta(baru)).not.toBeNull();
  });

  it('file yang dipakai ulang saat revisi tidak ikut terhapus', async () => {
    ctx = await buatApp();
    const [tWarga, tAdmin] = await Promise.all([login(ctx.app, EMAIL.warga1), login(ctx.app, EMAIL.admin)]);
    const file = (await unggah(tWarga)).json().data.file_id as string;
    const p = await pengajuanDenganFile(tWarga, file);
    const perlu = await mintaRevisiKtp(tAdmin, p);

    const res = await patch(ctx.app, tWarga, url(p.id_pengajuan, 'revisi'), {
      berkas: [{ id_syarat: 'SYR-007-01', nama_file: 'ktp.png', mime_type: 'image/png', ukuran_byte: PNG.length, file_id: file }],
      version: perlu.version,
    });
    expect(res.statusCode).toBe(200);
    expect(await ctx.c.repos.files.findMeta(file)).not.toBeNull();
    const berkas = res.json().data.berkas.find((b: { id_syarat: string }) => b.id_syarat === 'SYR-007-01');
    expect((await ctx.app.inject({ method: 'GET', url: berkas.file_url, headers: bearer(tWarga) })).statusCode).toBe(200);
  });

  it('pembersihan hanya membuang file yang tidak dipakai dan sudah cukup lama', async () => {
    ctx = await buatApp();
    const tWarga = await login(ctx.app, EMAIL.warga1);
    const dipakai = (await unggah(tWarga)).json().data.file_id as string;
    const yatim = (await unggah(tWarga, 'salah.png')).json().data.file_id as string;
    await pengajuanDenganFile(tWarga, dipakai);

    // File baru (kurang dari 24 jam) tidak disentuh.
    expect(await ctx.c.services.unggah.bersihkanYatim()).toBe(0);
    expect(await ctx.c.repos.files.findMeta(yatim)).not.toBeNull();

    // Setelah lewat batas umur, hanya yang yatim yang hilang.
    const nanti = new Date(Date.now() + 25 * 3_600_000).toISOString();
    expect(await ctx.c.repos.files.hapusYatimSebelum(nanti)).toBe(1);
    expect(await ctx.c.repos.files.findMeta(yatim)).toBeNull();
    expect(await ctx.c.repos.files.findMeta(dipakai)).not.toBeNull();
  });

  it('satu warga tidak bisa menumpuk unggahan tanpa batas', async () => {
    ctx = await buatApp({ RATE_LIMIT_UNGGAH: '10000' });
    const tWarga = await login(ctx.app, EMAIL.warga1);
    const tWarga2 = await login(ctx.app, EMAIL.warga2);
    for (let i = 0; i < MAKS_FILE_YATIM_PER_WARGA; i++) expect((await unggah(tWarga)).statusCode).toBe(201);
    const lebih = await unggah(tWarga);
    expect(lebih.statusCode).toBe(429);
    expect(lebih.json().error.code).toBe('TERLALU_BANYAK_UNGGAHAN');
    // Batasnya per warga: warga lain tidak terpengaruh.
    expect((await unggah(tWarga2)).statusCode).toBe(201);
  });

  it('rute unggah punya batas permintaan per menit sendiri', async () => {
    ctx = await buatApp({ RATE_LIMIT_UNGGAH: '3' });
    const tWarga = await login(ctx.app, EMAIL.warga1);
    const kode: number[] = [];
    for (let i = 0; i < 4; i++) kode.push((await unggah(tWarga)).statusCode);
    expect(kode).toEqual([201, 201, 201, 429]);
  });
});

describe('Kunci login petugas tidak bisa dipakai orang lain untuk mengunci akun', () => {
  const PASSWORD = 'rahasia-petugas-1';
  const masuk = (password: string, ip: string) =>
    ctx!.app.inject({ method: 'POST', url: '/api/v1/auth/login-petugas', remoteAddress: ip, payload: { username: 'pelayanan', password } });

  async function siapkan() {
    ctx = await buatApp();
    await simpanAkunPetugas(ctx.c.repos, { username: 'pelayanan', nama_lengkap: 'Petugas Uji', role: 'ADMIN', seksi: null, password: PASSWORD });
  }

  it('IP yang salah berkali-kali terkunci, tetapi petugas asli dari IP lain tetap bisa masuk', async () => {
    await siapkan();
    for (let i = 0; i < LOGIN_PETUGAS_MAKS_GAGAL; i++) expect((await masuk('salah-terus', '10.0.0.1')).statusCode).toBe(401);
    // IP penyerang terkunci, walau password yang dikirim benar.
    expect((await masuk(PASSWORD, '10.0.0.1')).statusCode).toBe(429);
    // Petugas asli dari IP lain tidak ikut terkunci.
    expect((await masuk(PASSWORD, '10.0.0.2')).statusCode).toBe(200);
  }, 30_000);

  it('tebakan yang disebar dari banyak IP tetap menguncikan akun itu untuk semua', async () => {
    await siapkan();
    for (let i = 0; i < LOGIN_PETUGAS_MAKS_GAGAL_SEMUA_IP; i++) expect((await masuk('tebakan', `10.1.${Math.floor(i / 200)}.${i % 200}`)).statusCode).toBe(401);
    expect((await masuk(PASSWORD, '10.9.9.9')).statusCode).toBe(429);
  }, 60_000);
});

describe('Nomor surat tidak loncat', () => {
  it('nomor yang tidak jadi dipakai dikembalikan, tetapi hanya bila masih yang terakhir', async () => {
    ctx = await buatApp();
    const r = ctx.c.repos.pengajuan;
    expect(await r.nextNomorSurat('2026')).toBe(1);
    await r.batalkanNomorSurat('2026', 1);
    expect(await r.nextNomorSurat('2026')).toBe(1);
    expect(await r.nextNomorSurat('2026')).toBe(2);
    // Nomor 1 sudah bukan yang terakhir: pembatalan basi diabaikan, nomor 2 tidak boleh dipakai dua kali.
    await r.batalkanNomorSurat('2026', 1);
    expect(await r.nextNomorSurat('2026')).toBe(3);
  });

  it('TTE yang gagal disimpan karena bentrok versi tidak menghabiskan nomor surat', async () => {
    ctx = await buatApp();
    const [tWarga, tAdmin, tKasi, tCamat] = await Promise.all([
      login(ctx.app, EMAIL.warga1),
      login(ctx.app, EMAIL.admin),
      login(ctx.app, EMAIL.kasi),
      login(ctx.app, EMAIL.camat),
    ]);
    let p = await ajukan(ctx, tWarga, 'LAYANAN-007', DATA_PENGANTAR);
    p = (await patch(ctx.app, tAdmin, url(p.id_pengajuan, 'verifikasi'), { aksi: 'SETUJUI', version: p.version })).json().data;
    p = (await patch(ctx.app, tKasi, url(p.id_pengajuan, 'paraf-kasi'), { aksi: 'SETUJUI', version: p.version })).json().data;

    // Simulasi bentrok: penyimpanan status ditolak seolah-olah petugas lain sudah mengubah berkas itu.
    const repo = ctx.c.repos.pengajuan;
    const asli = repo.updateIfVersion.bind(repo);
    repo.updateIfVersion = async () => false;
    const gagal = await patch(ctx.app, tCamat, url(p.id_pengajuan, 'tte-camat'), { aksi: 'SETUJUI', version: p.version });
    expect(gagal.statusCode).toBe(409);
    repo.updateIfVersion = asli;

    const ulang = await patch(ctx.app, tCamat, url(p.id_pengajuan, 'tte-camat'), { aksi: 'SETUJUI', version: p.version });
    expect(ulang.statusCode).toBe(200);
    expect(ulang.json().data.nomor_surat).toMatch(/\/0001\//);
  });
});
