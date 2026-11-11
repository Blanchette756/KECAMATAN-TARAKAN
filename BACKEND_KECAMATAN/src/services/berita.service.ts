import { BATAS_BERITA, type Berita } from '../types/berita.js';
import type { User } from '../types/user.js';
import { forbidden, notFound, validationFailed } from '../utils/errors.js';
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

const urutTerbaru = (a: Berita, b: Berita) => b.tanggal.localeCompare(a.tanggal) || (b.diperbarui_pada ?? '').localeCompare(a.diperbarui_pada ?? '');

/**
 * Berita kecamatan untuk halaman publik (Beranda, Informasi Publik).
 * Hanya Petugas Pelayanan (ADMIN) yang boleh menambah, mengubah, atau menghapus.
 */
export class BeritaService {
  constructor(private readonly deps: ServiceDeps) {}

  /** Publik: terbaru di atas. */
  async daftar(): Promise<Berita[]> {
    return (await this.deps.repos.berita.list()).sort(urutTerbaru);
  }

  async tambah(user: User, input: InputBerita): Promise<Berita> {
    this.wajibPetugasPelayanan(user);
    const berita: Berita = { id_berita: newId('BRT'), ...this.rapikan(input), diperbarui_pada: this.deps.now().toISOString() };
    await this.deps.repos.berita.create(berita);
    await this.catat(user, 'BERITA_TAMBAH', berita.id_berita);
    return berita;
  }

  async ubah(user: User, id: string, input: InputBerita): Promise<Berita> {
    this.wajibPetugasPelayanan(user);
    const lama = await this.deps.repos.berita.findById(id);
    if (!lama) throw notFound('Berita tidak ditemukan');
    const berita: Berita = { ...lama, ...this.rapikan(input), diperbarui_pada: this.deps.now().toISOString() };
    await this.deps.repos.berita.update(berita);
    await this.catat(user, 'BERITA_UBAH', id);
    return berita;
  }

  async hapus(user: User, id: string): Promise<{ id_berita: string }> {
    this.wajibPetugasPelayanan(user);
    if (!(await this.deps.repos.berita.delete(id))) throw notFound('Berita tidak ditemukan');
    await this.catat(user, 'BERITA_HAPUS', id);
    return { id_berita: id };
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
