import { BATAS_BERITA, BATAS_FOTO_BERITA_BYTE, MIME_FOTO_BERITA, type Berita, type BeritaDenganFoto, type FotoBerita, type MimeFotoBerita } from '../types/berita.js';
import type { User } from '../types/user.js';
import { badRequest, forbidden, notFound, validationFailed } from '../utils/errors.js';
import { newId } from '../utils/ids.js';
import type { ServiceDeps } from './deps.js';
import { KARAKTER_KONTROL, KARAKTER_TERSEMBUNYI } from './form-validator.js';

export interface InputBerita {
  judul: string;
  tanggal: string;
  ringkasan: string;
}

/** Tanggal YYYY-MM-DD yang benar-benar ada di kalender (mis. 2026-02-30 ditolak). */
function tanggalValid(tanggal: string): boolean {
  const [th = 0, bl = 0, hr = 0] = tanggal.split('-').map(Number);
  const d = new Date(Date.UTC(th, bl - 1, hr));
  return th >= 2000 && th <= 2100 && d.getUTCFullYear() === th && d.getUTCMonth() === bl - 1 && d.getUTCDate() === hr;
}

/** Tanda tangan awal file JPG/PNG (sama seperti pemeriksaan berkas warga). */
const CEK_FOTO: Record<MimeFotoBerita, (data: Buffer) => boolean> = {
  'image/jpeg': (d) => d[0] === 0xff && d[1] === 0xd8 && d[2] === 0xff,
  'image/png': (d) => d.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
};

const urutTerbaru =(a: Berita, b: Berita) => b.tanggal.localeCompare(a.tanggal) || (b.diperbarui_pada ?? '').localeCompare(a.diperbarui_pada ?? '');

/**
 * Berita kecamatan untuk halaman publik (Beranda, Informasi Publik).
 * Hanya Petugas Pelayanan (ADMIN) yang boleh menambah, mengubah, atau menghapus.
 */
export class BeritaService {
  constructor(private readonly deps: ServiceDeps) {}

  /** Publik: terbaru di atas. */
  async daftar(): Promise<BeritaDenganFoto[]> {
    const { repos } = this.deps;
    const [berita, foto] = await Promise.all([repos.berita.list(), repos.fotoBerita.listMeta()]);
    const fotoById = new Map(foto.map((f) => [f.id_berita, f.diperbarui_pada]));
    return berita.sort(urutTerbaru).map((b) => ({ ...b, foto_diperbarui: fotoById.get(b.id_berita) ?? null }));
  }

  async tambah(user: User, input: InputBerita): Promise<BeritaDenganFoto> {
    this.wajibPetugasPelayanan(user);
    const berita: Berita = { id_berita: newId('BRT'), ...this.rapikan(input), diperbarui_pada: this.deps.now().toISOString() };
    await this.deps.repos.berita.create(berita);
    await this.catat(user, 'BERITA_TAMBAH', berita.id_berita);
    return { ...berita, foto_diperbarui: null };
  }

  async ubah(user: User, id: string, input: InputBerita): Promise<BeritaDenganFoto> {
    this.wajibPetugasPelayanan(user);
    const lama = await this.deps.repos.berita.findById(id);
    if (!lama) throw notFound('Berita tidak ditemukan');
    const berita: Berita = { ...lama, ...this.rapikan(input), diperbarui_pada: this.deps.now().toISOString() };
    await this.deps.repos.berita.update(berita);
    await this.catat(user, 'BERITA_UBAH', id);
    return { ...berita, foto_diperbarui: await this.versiFoto(id) };
  }

  async hapus(user: User, id: string): Promise<{ id_berita: string }> {
    this.wajibPetugasPelayanan(user);
    if (!(await this.deps.repos.berita.delete(id))) throw notFound('Berita tidak ditemukan');
    // Di MySQL foto ikut terhapus lewat foreign key; di memori dihapus di sini. Aman bila sudah tidak ada.
    await this.deps.repos.fotoBerita.hapus(id);
    await this.catat(user, 'BERITA_HAPUS', id);
    return { id_berita: id };
  }

  /** Pasang atau ganti foto berita. Isi file diperiksa sendiri; tipe dari klien tidak dipercaya. */
  async simpanFoto(user: User, id: string, mime: string, data: Buffer): Promise<BeritaDenganFoto> {
    this.wajibPetugasPelayanan(user);
    const berita = await this.deps.repos.berita.findById(id);
    if (!berita) throw notFound('Berita tidak ditemukan');
    if (!(MIME_FOTO_BERITA as readonly string[]).includes(mime)) throw badRequest('Foto harus berformat JPG atau PNG');
    const mime_type = mime as MimeFotoBerita;
    if (data.length === 0 || !CEK_FOTO[mime_type](data)) throw validationFailed('Isi file bukan foto JPG/PNG yang sah');
    if (data.length > BATAS_FOTO_BERITA_BYTE) throw validationFailed('Ukuran foto maksimal 10 MB');
    const info: FotoBerita = { id_berita: id, mime_type, ukuran_byte: data.length, diperbarui_pada: this.deps.now().toISOString() };
    await this.deps.repos.fotoBerita.simpan(info, data);
    await this.catat(user, 'BERITA_UBAH', id);
    return { ...berita, foto_diperbarui: info.diperbarui_pada };
  }

  async hapusFoto(user: User, id: string): Promise<BeritaDenganFoto> {
    this.wajibPetugasPelayanan(user);
    const berita = await this.deps.repos.berita.findById(id);
    if (!berita) throw notFound('Berita tidak ditemukan');
    if (await this.deps.repos.fotoBerita.hapus(id)) await this.catat(user, 'BERITA_UBAH', id);
    return { ...berita, foto_diperbarui: null };
  }

  /** Publik: isi foto untuk ditampilkan di halaman. */
  async bacaFoto(id: string): Promise<{ info: FotoBerita; data: Buffer }> {
    const foto = await this.deps.repos.fotoBerita.baca(id);
    if (!foto) throw notFound('Foto berita tidak ditemukan');
    return foto;
  }

  private async versiFoto(id: string): Promise<string | null> {
    return (await this.deps.repos.fotoBerita.listMeta()).find((f) => f.id_berita === id)?.diperbarui_pada ?? null;
  }

  private wajibPetugasPelayanan(user: User) {
    if (user.role !== 'ADMIN') throw forbidden('Hanya petugas pelayanan yang dapat mengelola berita');
  }

  /** Rapikan spasi lalu periksa ulang: batas panjang di skema dihitung sebelum spasi dibuang. */
  private rapikan(input: InputBerita): InputBerita {
    const judul = input.judul.trim().replace(/\s+/g, ' ');
    const ringkasan = input.ringkasan.replace(/\r\n?/g, '\n').trim().replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n');
    const tanggal = input.tanggal.trim();
    const masalah: string[] = [];
    if (judul.length < BATAS_BERITA.judulMin) masalah.push(`judul: minimal ${BATAS_BERITA.judulMin} karakter`);
    if (ringkasan.length < BATAS_BERITA.ringkasanMin) masalah.push(`ringkasan: minimal ${BATAS_BERITA.ringkasanMin} karakter`);
    for (const [nama, nilai] of [
      ['judul', judul],
      ['ringkasan', ringkasan],
    ] as const) {
      if (KARAKTER_KONTROL.test(nilai) || KARAKTER_TERSEMBUNYI.test(nilai)) masalah.push(`${nama}: berisi karakter yang tidak diizinkan`);
    }
    if (!tanggalValid(tanggal)) masalah.push('tanggal: bukan tanggal yang valid');
    if (masalah.length > 0) throw validationFailed('Data berita tidak valid', masalah);
    return { judul, tanggal, ringkasan };
  }

  private async catat(user: User, aksi: 'BERITA_TAMBAH' | 'BERITA_UBAH' | 'BERITA_HAPUS', id: string) {
    await this.deps.repos.audit.add({ id_log: newId('LOG'), waktu: this.deps.now().toISOString(), id_user: user.id_user, role: user.role, aksi, target_id: id });
  }
}
