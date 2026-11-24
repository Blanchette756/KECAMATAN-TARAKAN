/**
 * Surat yang sudah ditandatangani Camat di aplikasi TTE (PDF dengan barcode/QR tanda tangan elektronik).
 * Diunggah Petugas Pelayanan, satu surat per pengajuan; unggahan baru menggantikan yang lama.
 */
export const MIME_SURAT = 'application/pdf';
export const BATAS_SURAT_BYTE = 10 * 1024 * 1024;

export interface SuratSelesai {
  id_pengajuan: string;
  nama_file: string;
  ukuran_byte: number;
  /** id_user Petugas Pelayanan yang mengunggah. */
  diunggah_oleh: string;
  /** ISO-8601. Juga dipakai sebagai penanda versi file di klien. */
  diunggah_pada: string;
}

/** Penanda di pengajuan.file_surat_selesai bahwa suratnya tersimpan di tabel surat_selesai. */
export const AWALAN_SURAT = 'surat://';
