// Sumber: "09. Kontak.xlsx" (kontak resmi kecamatan dan kelurahan, 2026).
// Telepon kantor tidak ada di berkas itu, jadi diambil dari Standar Pelayanan 2026.
export const ALAMAT = 'Jl. Sei Mahakam RT 10 No. 01, Kelurahan Kampung Empat, Kecamatan Tarakan Timur, Kota Tarakan 77125';
export const ALAMAT_SINGKAT = 'Jl. Sei Mahakam RT 10 No. 01, Kel. Kampung Empat';
export const TELEPON = '(0551) 22490';
export const WHATSAPP = '0857-1106-1099';
export const TAUTAN_WA = 'https://wa.me/6285711061099';
export const EMAIL = 'ctt@tarakankota.go.id';
export const MEDIA_SOSIAL = 'TikTok · Instagram · Facebook';

export const JAM_PELAYANAN = '07.30–12.00 dan 13.00–16.30 WITA';
export const JAM_PELAYANAN_SINGKAT = '07.30–16.30 WITA';

export const tautanPeta = (lat: number, lng: number) => `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
export const TAUTAN_PETA = tautanPeta(3.298755, 117.624008);
