import type { User } from '../types/user.js';
import { conflict, forbidden, validationFailed } from '../utils/errors.js';
import type { ServiceDeps } from './deps.js';
import { KARAKTER_KONTROL, KARAKTER_TERSEMBUNYI } from './form-validator.js';

export interface InputProfil {
  nama_lengkap: string;
  nik: string;
  no_hp: string;
  alamat: string;
  id_kelurahan: string;
}

export interface ProfilWarga {
  nama_lengkap: string;
  email: string | null;
  nik: string | null;
  no_hp: string | null;
  alamat: string | null;
  id_kelurahan: string | null;
}

const keProfil = (u: User): ProfilWarga => ({
  nama_lengkap: u.nama_lengkap,
  email: u.email,
  nik: u.nik,
  no_hp: u.no_hp,
  alamat: u.alamat,
  id_kelurahan: u.id_kelurahan,
});

/** "+62 812-3456-7890" atau "0812 3456 7890" → "081234567890". */
export function rapikanNoHp(hp: string): string {
  const angka = hp.replace(/[\s.\-()]/g, '');
  return angka.startsWith('+62') ? `0${angka.slice(3)}` : angka.startsWith('62') ? `0${angka.slice(2)}` : angka;
}

/** Profil warga: NIK, HP, alamat, dan kelurahan wajib diisi sebelum mengajukan permohonan. */
export class ProfilService {
  constructor(private readonly deps: ServiceDeps) {}

  async lihat(user: User): Promise<ProfilWarga> {
    if (user.role !== 'WARGA') throw forbidden('Profil ini khusus warga');
    return keProfil(user);
  }

  async simpan(user: User, input: InputProfil): Promise<User> {
    if (user.role !== 'WARGA') throw forbidden('Profil ini khusus warga');
    const { repos } = this.deps;
    const data = {
      nama_lengkap: input.nama_lengkap.trim().replace(/\s+/g, ' '),
      nik: input.nik.replace(/\s/g, ''),
      no_hp: rapikanNoHp(input.no_hp),
      alamat: input.alamat.trim().replace(/\s+/g, ' '),
      id_kelurahan: input.id_kelurahan,
    };
    const masalah: string[] = [];
    if (data.nama_lengkap.length < 2 || data.nama_lengkap.length > 120) masalah.push('nama: 2-120 karakter');
    if (!/^[0-9]{16}$/.test(data.nik)) masalah.push('nik: harus 16 angka sesuai KTP');
    if (!/^08[0-9]{8,12}$/.test(data.no_hp)) masalah.push('no_hp: nomor HP Indonesia, misalnya 081234567890');
    if (data.alamat.length < 5 || data.alamat.length > 250) masalah.push('alamat: 5-250 karakter');
    for (const [nama, nilai] of [
      ['nama', data.nama_lengkap],
      ['alamat', data.alamat],
    ] as const) {
      if (KARAKTER_KONTROL.test(nilai) || KARAKTER_TERSEMBUNYI.test(nilai)) masalah.push(`${nama}: berisi karakter yang tidak diizinkan`);
    }
    const kelurahan = await repos.master.listKelurahan();
    if (!kelurahan.some((k) => k.id_kelurahan === data.id_kelurahan)) masalah.push('kelurahan: pilih salah satu kelurahan di Kecamatan Tarakan Timur');
    if (masalah.length > 0) throw validationFailed('Data profil belum benar', masalah);

    const pemilikNik = await repos.users.findByNik(data.nik);
    if (pemilikNik && pemilikNik.id_user !== user.id_user) {
      throw conflict('NIK_TERDAFTAR', 'NIK ini sudah dipakai akun lain. Bila ini NIK Anda, hubungi petugas kecamatan.');
    }
    try {
      await repos.users.updateProfil(user.id_user, data);
    } catch (err) {
      // Dua akun menyimpan NIK yang sama pada saat bersamaan: UNIQUE KEY di database menolak yang kedua.
      if ((err as { code?: string }).code === 'ER_DUP_ENTRY') throw conflict('NIK_TERDAFTAR', 'NIK ini sudah dipakai akun lain.');
      throw err;
    }
    return { ...user, ...data };
  }
}
