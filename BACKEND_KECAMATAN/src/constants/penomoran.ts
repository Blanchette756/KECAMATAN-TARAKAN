/**
 * Format nomor surat resmi. Format asli kecamatan belum diterima,
 * jadi sementara diberi awalan DUMMY agar tidak tertukar dengan nomor sungguhan.
 * Ganti fungsi ini saat format resmi dari kecamatan sudah ada.
 */
export function formatNomorSurat(kodeLayanan: string, urutan: number, tahun: string): string {
  return `DUMMY/${kodeLayanan}/${String(urutan).padStart(4, '0')}/CTT/${tahun}`;
}

/** Prefix kode lacak: REQ-YYYYMMDD-XXXX */
export const PREFIX_REGISTRASI = 'REQ';
export const PANJANG_KODE_ACAK = 4;
export const POLA_NO_REGISTRASI = '^REQ-[0-9]{8}-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}$';

/** Batas pengajuan yang masih berjalan per warga (mencegah spam). */
export const MAKS_PENGAJUAN_AKTIF_PER_WARGA = 10;

/**
 * Batas file unggahan per warga yang belum dipakai pengajuan mana pun. Mencegah satu akun memenuhi database
 * dengan unggahan berulang. Satu pengajuan paling banyak belasan berkas, dan tombol "Ganti" meninggalkan file lama.
 */
export const MAKS_FILE_YATIM_PER_WARGA = 40;

/** File yang tidak pernah dipakai pengajuan dihapus setelah selama ini (jam). */
export const UMUR_FILE_YATIM_JAM = 24;
