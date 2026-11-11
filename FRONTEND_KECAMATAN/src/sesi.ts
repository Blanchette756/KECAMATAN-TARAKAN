export interface Pengguna {
  id_user: string;
  nama_lengkap: string;
  /** Petugas tidak wajib punya email atau nomor HP. */
  email: string | null;
  role: 'WARGA' | 'ADMIN' | 'KASI' | 'CAMAT';
  no_hp_tersamar: string | null;
  /** Warga baru dari Google belum mengisi NIK, HP, alamat, dan kelurahan. */
  profil_lengkap: boolean;
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

/**
 * Alamat tujuan dari `?ke=` hanya boleh di dalam situs ini. Diurai sebagai URL supaya bentuk seperti
 * "/\evil.com" (dibaca browser sebagai "//evil.com") tidak bisa mengalihkan ke situs lain.
 */
export function tujuanAman(cadangan: string): string {
  const diminta = new URLSearchParams(window.location.search).get('ke');
  if (!diminta?.startsWith('/')) return cadangan;
  try {
    const url = new URL(diminta, window.location.origin);
    return url.origin === window.location.origin ? url.pathname + url.search + url.hash : cadangan;
  } catch {
    return cadangan;
  }
}

export const inisial = (nama: string) =>
  nama
    .replace(/\(.*\)/, '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((kata) => kata[0])
    .join('')
    .toUpperCase();
