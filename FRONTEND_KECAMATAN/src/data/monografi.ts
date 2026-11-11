// Sumber: Profil Kecamatan Tarakan Timur 2025, Tabel 1.1 (luas daratan) dan Tabel 3.2.1 (penduduk).
// Rincian laki-laki/perempuan per kelurahan sengaja tidak dipakai: di tabel sumber, angka laki-laki
// Mamburungan (6.108) tidak cocok dengan jumlahnya (11.735). Jumlah per kelurahan dan total kecamatan konsisten.
export const SUMBER_MONOGRAFI = 'Profil Kecamatan Tarakan Timur 2025';
export const TAHUN_MONOGRAFI = '2025';

export const MONOGRAFI: Record<string, { luas: number; penduduk: number }> = {
  'Gunung Lingkas': { luas: 1.79, penduduk: 6418 },
  'Kampung Empat': { luas: 4.38, penduduk: 5620 },
  'Kampung Enam': { luas: 11.3, penduduk: 7068 },
  'Lingkas Ujung': { luas: 1.84, penduduk: 12342 },
  Mamburungan: { luas: 12.67, penduduk: 11735 },
  'Mamburungan Timur': { luas: 6.9, penduduk: 4441 },
  'Pantai Amal': { luas: 20.23, penduduk: 11789 },
};

export const PENDUDUK_LAKI = 30716;
export const PENDUDUK_PEREMPUAN = 28697;
export const TOTAL_PENDUDUK = Object.values(MONOGRAFI).reduce((n, k) => n + k.penduduk, 0);
export const TOTAL_LUAS = Object.values(MONOGRAFI).reduce((n, k) => n + k.luas, 0);

export const angka = (n: number) => n.toLocaleString('id-ID', { maximumFractionDigits: 0 });
export const desimal = (n: number) => n.toLocaleString('id-ID', { maximumFractionDigits: 2 });
export const persen = (n: number) => `${n.toLocaleString('id-ID', { maximumFractionDigits: 1 })}%`;
