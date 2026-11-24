import type { Role } from '../types/common.js';

/**
 * Status pengajuan, mengikuti SP CCTI Kecamatan Tarakan Timur: petugas pelayanan memeriksa berkas,
 * Kasi Tata Pemerintahan memaraf, Camat menandatangani, lalu petugas memberi nomor dan menyerahkan surat.
 *
 * Camat menandatangani di aplikasi TTE (barcode/QR BSrE), bukan di situs ini. Setelah itu Petugas Pelayanan
 * mengunggah PDF bertanda tangan dan menekan Kirim (TERBITKAN_SURAT), sehingga pemohon bisa mengunduhnya.
 */
export const STATUS = [
  'DIAJUKAN', // menunggu verifikasi Admin Pelayanan
  'PERLU_REVISI', // Admin meminta warga memperbaiki berkas/isian
  'DIKEMBALIKAN_KE_ADMIN', // Kasi/Camat mengembalikan ke Admin untuk diperbaiki
  'MENUNGGU_PARAF_KASI',
  'MENUNGGU_TTE_CAMAT', // Camat menandatangani di aplikasi TTE; petugas lalu mengunggah surat bertanda tangan
  'SIAP_DIAMBIL', // khusus layanan yang dokumen fisiknya diambil di kantor (legalisasi/legalisir)
  'SELESAI',
  'DITOLAK',
] as const;
export type StatusPengajuan = (typeof STATUS)[number];

export const STATUS_LABEL: Record<StatusPengajuan, string> = {
  DIAJUKAN: 'Diajukan – menunggu verifikasi petugas',
  PERLU_REVISI: 'Berkas perlu diperbaiki',
  DIKEMBALIKAN_KE_ADMIN: 'Sedang diperiksa ulang petugas',
  MENUNGGU_PARAF_KASI: 'Menunggu paraf Kepala Seksi',
  MENUNGGU_TTE_CAMAT: 'Menunggu tanda tangan Camat',
  SIAP_DIAMBIL: 'Selesai – siap diambil di kantor kecamatan',
  SELESAI: 'Selesai',
  DITOLAK: 'Pengajuan ditolak',
};

export const STATUS_AKHIR: readonly StatusPengajuan[] = ['SELESAI', 'DITOLAK'];

export type AksiWorkflow =
  | 'AJUKAN'
  | 'KIRIM_REVISI'
  | 'ADMIN_SETUJUI'
  | 'ADMIN_MINTA_REVISI'
  | 'ADMIN_TOLAK'
  | 'KASI_PARAF'
  | 'KASI_KEMBALIKAN'
  | 'KASI_TOLAK'
  /** Hanya ada di riwayat lama (simulasi TTE di situs). Tidak lagi di tabel TRANSISI. */
  | 'CAMAT_TTE'
  | 'CAMAT_KEMBALIKAN'
  | 'CAMAT_TOLAK'
  | 'TERBITKAN_SURAT'
  | 'SERAHKAN';

export interface Transisi {
  aksi: AksiWorkflow;
  role: Role;
  dari: readonly StatusPengajuan[];
  /** AUTO_SELESAI: SELESAI atau SIAP_DIAMBIL, tergantung mode penyerahan layanan. */
  ke: StatusPengajuan | 'AUTO_SELESAI';
  wajibCatatan: boolean;
}

/** Tabel transisi alur kerja. Transisi yang tidak tercantum di sini ditolak WorkflowService. */
export const TRANSISI: readonly Transisi[] = [
  { aksi: 'KIRIM_REVISI', role: 'WARGA', dari: ['PERLU_REVISI'], ke: 'DIAJUKAN', wajibCatatan: false },

  { aksi: 'ADMIN_SETUJUI', role: 'ADMIN', dari: ['DIAJUKAN', 'DIKEMBALIKAN_KE_ADMIN'], ke: 'MENUNGGU_PARAF_KASI', wajibCatatan: false },
  { aksi: 'ADMIN_MINTA_REVISI', role: 'ADMIN', dari: ['DIAJUKAN', 'DIKEMBALIKAN_KE_ADMIN'], ke: 'PERLU_REVISI', wajibCatatan: true },
  { aksi: 'ADMIN_TOLAK', role: 'ADMIN', dari: ['DIAJUKAN', 'DIKEMBALIKAN_KE_ADMIN'], ke: 'DITOLAK', wajibCatatan: true },

  { aksi: 'KASI_PARAF', role: 'KASI', dari: ['MENUNGGU_PARAF_KASI'], ke: 'MENUNGGU_TTE_CAMAT', wajibCatatan: false },
  { aksi: 'KASI_KEMBALIKAN', role: 'KASI', dari: ['MENUNGGU_PARAF_KASI'], ke: 'DIKEMBALIKAN_KE_ADMIN', wajibCatatan: true },
  { aksi: 'KASI_TOLAK', role: 'KASI', dari: ['MENUNGGU_PARAF_KASI'], ke: 'DITOLAK', wajibCatatan: true },

  { aksi: 'CAMAT_KEMBALIKAN', role: 'CAMAT', dari: ['MENUNGGU_TTE_CAMAT'], ke: 'DIKEMBALIKAN_KE_ADMIN', wajibCatatan: true },
  { aksi: 'CAMAT_TOLAK', role: 'CAMAT', dari: ['MENUNGGU_TTE_CAMAT'], ke: 'DITOLAK', wajibCatatan: true },

  // Petugas mengunggah surat yang sudah ditandatangani Camat di aplikasi TTE, lalu mengirimkannya ke pemohon.
  { aksi: 'TERBITKAN_SURAT', role: 'ADMIN', dari: ['MENUNGGU_TTE_CAMAT'], ke: 'AUTO_SELESAI', wajibCatatan: false },

  { aksi: 'SERAHKAN', role: 'ADMIN', dari: ['SIAP_DIAMBIL'], ke: 'SELESAI', wajibCatatan: false },
];

/** Status yang muncul di antrian kerja tiap role. */
export const ANTRIAN_PER_ROLE: Record<Exclude<Role, 'WARGA'>, readonly StatusPengajuan[]> = {
  ADMIN: ['DIAJUKAN', 'DIKEMBALIKAN_KE_ADMIN', 'MENUNGGU_TTE_CAMAT', 'SIAP_DIAMBIL'],
  KASI: ['MENUNGGU_PARAF_KASI'],
  // Camat tetap bisa melihat (dan mengembalikan/menolak) surat yang menunggu tanda tangannya.
  CAMAT: ['MENUNGGU_TTE_CAMAT'],
};
