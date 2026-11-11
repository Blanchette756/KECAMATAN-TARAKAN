import { POLA_USERNAME } from '../constants/pola.js';
import type { Repositories } from '../repositories/interfaces.js';
import type { Seksi } from '../types/common.js';
import type { User } from '../types/user.js';
import { conflict, forbidden, notFound, validationFailed } from '../utils/errors.js';
import { newId, randomKode } from '../utils/ids.js';
import { cocokPassword, hashPassword, PANJANG_PASSWORD_MIN } from '../utils/password.js';
import type { ServiceDeps } from './deps.js';

export type PeranPetugas = 'ADMIN' | 'KASI' | 'CAMAT';
export const PERAN_PETUGAS: readonly PeranPetugas[] = ['ADMIN', 'KASI', 'CAMAT'];
export const SEKSI: readonly Seksi[] = ['TATA_PEMERINTAHAN', 'KESRA', 'EKONOMI', 'TRANTIB'];

export interface InputAkunPetugas {
  username: string;
  nama_lengkap: string;
  role: PeranPetugas;
  seksi: Seksi | null;
  password: string;
}

export interface PerubahanAkunPetugas {
  nama_lengkap?: string;
  role?: PeranPetugas;
  seksi?: Seksi | null;
  aktif?: boolean;
  /** Diisi untuk mereset password. */
  password?: string;
}

export interface AkunPetugas {
  id_user: string;
  username: string;
  nama_lengkap: string;
  role: User['role'];
  seksi: Seksi | null;
  aktif: boolean;
}

const keAkun = (user: User, username: string): AkunPetugas => ({
  id_user: user.id_user,
  username,
  nama_lengkap: user.nama_lengkap,
  role: user.role,
  seksi: user.seksi,
  aktif: user.aktif,
});

function periksaPassword(password: string): string[] {
  if (password.length < PANJANG_PASSWORD_MIN) return [`password: minimal ${PANJANG_PASSWORD_MIN} karakter`];
  if (password.length > 200) return ['password: maksimal 200 karakter'];
  return [];
}

function periksaData(a: { nama_lengkap: string; role: PeranPetugas; seksi: Seksi | null }): string[] {
  const masalah: string[] = [];
  const nama = a.nama_lengkap.trim();
  if (nama.length < 2 || nama.length > 120) masalah.push('nama: 2-120 karakter');
  if (!PERAN_PETUGAS.includes(a.role)) masalah.push(`peran: pilih ${PERAN_PETUGAS.join(', ')}`);
  if (a.role === 'KASI' && (a.seksi === null || !SEKSI.includes(a.seksi))) masalah.push('seksi: wajib dipilih untuk Kasi');
  if (a.role !== 'KASI' && a.seksi !== null) masalah.push('seksi: hanya untuk Kasi');
  return masalah;
}

/** Daftar masalah input akun baru; kosong bila valid. */
export function periksaAkunPetugas(a: InputAkunPetugas): string[] {
  const masalah: string[] = [];
  const username = a.username.trim().toLowerCase();
  if (username.length < 3 || username.length > 50 || !new RegExp(POLA_USERNAME).test(username)) {
    masalah.push('username: 3-50 karakter, hanya huruf kecil, angka, titik, garis bawah, atau tanda hubung');
  }
  return [...masalah, ...periksaData(a), ...periksaPassword(a.password)];
}

/** Buat akun petugas, atau perbarui nama/peran/password bila username sudah ada. Dipakai service dan tes. */
export async function simpanAkunPetugas(repos: Repositories, a: InputAkunPetugas): Promise<{ id_user: string; baru: boolean }> {
  const masalah = periksaAkunPetugas(a);
  if (masalah.length > 0) throw validationFailed('Data akun tidak valid', masalah);
  const user: User = {
    id_user: `USR-PTG-${randomKode(6)}`,
    id_kelurahan: null,
    nik: null,
    nama_lengkap: a.nama_lengkap.trim(),
    email: null,
    no_hp: null,
    role: a.role,
    seksi: a.role === 'KASI' ? a.seksi : null,
    alamat: null,
    aktif: true,
  };
  return repos.users.simpanPetugas(user, a.username, await hashPassword(a.password));
}

/**
 * Akun petugas dikelola Petugas Pelayanan lewat panel admin. Akun pertama dibuat dari
 * PETUGAS_AWAL_USERNAME/PASSWORD di environment variables, karena belum ada yang bisa membuatkannya.
 */
export class AkunPetugasService {
  constructor(private readonly deps: ServiceDeps) {}

  /** Buat akun Petugas Pelayanan pertama dari konfigurasi bila username itu belum ada. */
  async pastikanAkunAwal(): Promise<'dibuat' | 'sudah_ada' | null> {
    const awal = this.deps.config.petugasAwal;
    if (!awal) return null;
    if (await this.deps.repos.users.findKredensial(awal.username)) return 'sudah_ada';
    await simpanAkunPetugas(this.deps.repos, { username: awal.username, nama_lengkap: awal.nama, role: 'ADMIN', seksi: null, password: awal.password });
    return 'dibuat';
  }

  async daftar(user: User): Promise<AkunPetugas[]> {
    this.wajibPengelola(user);
    return (await this.deps.repos.users.listPetugas()).map((a) => keAkun(a.user, a.username));
  }

  async tambah(user: User, input: InputAkunPetugas): Promise<AkunPetugas> {
    this.wajibPengelola(user);
    const username = input.username.trim().toLowerCase();
    const masalah = periksaAkunPetugas(input);
    if (masalah.length > 0) throw validationFailed('Data akun tidak valid', masalah);
    if (await this.deps.repos.users.findKredensial(username)) throw conflict('USERNAME_DIPAKAI', `Username "${username}" sudah dipakai`);
    const { id_user } = await simpanAkunPetugas(this.deps.repos, { ...input, username });
    await this.catat(user, 'AKUN_TAMBAH', id_user);
    const baru = await this.deps.repos.users.findKredensialById(id_user);
    if (!baru) throw new Error('Akun hilang setelah disimpan');
    return keAkun(baru.user, baru.username);
  }

  async ubah(user: User, idUser: string, input: PerubahanAkunPetugas): Promise<AkunPetugas> {
    this.wajibPengelola(user);
    const { repos } = this.deps;
    const akun = await repos.users.findKredensialById(idUser);
    if (!akun || akun.user.role === 'WARGA') throw notFound('Akun petugas tidak ditemukan');

    const role = input.role ?? (akun.user.role as PeranPetugas);
    const data = {
      nama_lengkap: (input.nama_lengkap ?? akun.user.nama_lengkap).trim(),
      role,
      seksi: role === 'KASI' ? (input.seksi !== undefined ? input.seksi : akun.user.seksi) : null,
      aktif: input.aktif ?? akun.user.aktif,
    };
    const masalah = [...periksaData(data), ...(input.password !== undefined ? periksaPassword(input.password) : [])];
    if (masalah.length > 0) throw validationFailed('Data akun tidak valid', masalah);

    if (idUser === user.id_user) {
      if (!data.aktif || data.role !== 'ADMIN') throw validationFailed('Akun sendiri tidak bisa dinonaktifkan atau diganti perannya');
      if (input.password !== undefined) throw validationFailed('Ganti password akun sendiri lewat menu Ganti Password');
    }
    // Harus selalu ada minimal satu Petugas Pelayanan aktif yang bisa mengelola akun.
    const masihAdmin = data.aktif && data.role === 'ADMIN';
    if (akun.user.aktif && akun.user.role === 'ADMIN' && !masihAdmin) {
      const adminLain = (await repos.users.listPetugas()).filter((a) => a.user.id_user !== idUser && a.user.aktif && a.user.role === 'ADMIN');
      if (adminLain.length === 0) throw conflict('ADMIN_TERAKHIR', 'Harus ada minimal satu akun Petugas Pelayanan yang aktif');
    }

    await repos.users.updatePetugas(idUser, data, input.password !== undefined ? await hashPassword(input.password) : null);
    // Akun yang dinonaktifkan atau direset passwordnya harus login ulang.
    if (!data.aktif || input.password !== undefined) await repos.sesi.deleteByUser(idUser);
    await this.catat(user, 'AKUN_UBAH', idUser);
    return keAkun({ ...akun.user, ...data }, akun.username);
  }

  async gantiPasswordSendiri(user: User, passwordLama: string, passwordBaru: string): Promise<void> {
    if (user.role === 'WARGA') throw forbidden();
    const akun = await this.deps.repos.users.findKredensialById(user.id_user);
    if (!akun) throw forbidden('Akun ini tidak memakai password');
    if (!(await cocokPassword(passwordLama, akun.password_hash))) throw validationFailed('Password lama salah');
    const masalah = periksaPassword(passwordBaru);
    if (passwordBaru === passwordLama) masalah.push('password: password baru harus berbeda dari yang lama');
    if (masalah.length > 0) throw validationFailed('Password baru tidak valid', masalah);
    const u = akun.user;
    await this.deps.repos.users.updatePetugas(u.id_user, { nama_lengkap: u.nama_lengkap, role: u.role, seksi: u.seksi, aktif: u.aktif }, await hashPassword(passwordBaru));
    await this.catat(user, 'GANTI_PASSWORD', u.id_user);
  }

  private wajibPengelola(user: User) {
    if (user.role !== 'ADMIN') throw forbidden('Hanya Petugas Pelayanan yang dapat mengelola akun petugas');
  }

  private async catat(user: User, aksi: 'AKUN_TAMBAH' | 'AKUN_UBAH' | 'GANTI_PASSWORD', target: string) {
    await this.deps.repos.audit.add({ id_log: newId('LOG'), waktu: this.deps.now().toISOString(), id_user: user.id_user, role: user.role, aksi, target_id: target });
  }
}
