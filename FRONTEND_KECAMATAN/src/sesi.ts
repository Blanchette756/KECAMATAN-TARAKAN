export interface Pengguna {
  id_user: string;
  nama_lengkap: string;
  /** Petugas tidak wajib punya email atau nomor HP. */
  email: string | null;
  role: 'WARGA' | 'ADMIN' | 'KASI' | 'CAMAT';
  no_hp_tersamar: string | null;
}

interface Sesi {
  token: string;
  user: Pengguna;
}

const KUNCI = 'sesi-kecamatan';

// sessionStorage: sesi hilang saat tab ditutup, jadi token tidak tertinggal di komputer umum.
export function ambilSesi(): Sesi | null {
  try {
    return JSON.parse(sessionStorage.getItem(KUNCI) ?? 'null') as Sesi | null;
  } catch {
    return null;
  }
}

export const simpanSesi = (sesi: Sesi) => sessionStorage.setItem(KUNCI, JSON.stringify(sesi));
export const hapusSesi = () => sessionStorage.removeItem(KUNCI);

export const inisial = (nama: string) =>
  nama
    .replace(/\(.*\)/, '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((kata) => kata[0])
    .join('')
    .toUpperCase();
