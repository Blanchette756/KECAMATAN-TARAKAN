import type { IconName } from '../components/Icon';

// Judul dan deskripsi mengikuti Figma; persyaratan diambil dari backend lewat `id`.
export const LAYANAN: { id: string; ikon: IconName; judul: string; deskripsi: string }[] = [
  { id: 'LAYANAN-001', ikon: 'ship-20', judul: 'Surat Keterangan Hak Milik Kapal', deskripsi: 'Bukti kepemilikan kapal milik warga.' },
  { id: 'LAYANAN-002', ikon: 'heart-20', judul: 'Dispensasi Nikah', deskripsi: 'Surat dispensasi untuk keperluan pernikahan.' },
  { id: 'LAYANAN-003', ikon: 'users-20', judul: 'Legalisasi Surat Keterangan Ahli Waris', deskripsi: 'Pengesahan surat ahli waris dari kelurahan.' },
  { id: 'LAYANAN-004', ikon: 'hammer-20', judul: 'Legalisasi Surat Keterangan Tukang', deskripsi: 'Pengesahan surat keterangan tukang pembuat kapal.' },
  { id: 'LAYANAN-005', ikon: 'file-text-sm', judul: 'Surat Keterangan', deskripsi: 'Keterangan sesuai keperluan, termasuk kehilangan alas hak tanah.' },
  { id: 'LAYANAN-006', ikon: 'award-20', judul: 'Surat Rekomendasi', deskripsi: 'Rekomendasi kecamatan sesuai keperluan pemohon.' },
  { id: 'LAYANAN-007', ikon: 'send-20', judul: 'Surat Pengantar', deskripsi: 'Surat pengantar kecamatan sesuai keperluan pemohon.' },
  { id: 'LAYANAN-008', ikon: 'stamp-20', judul: 'Legalisasi Surat/Dokumen', deskripsi: 'Pengesahan asli surat atau dokumen oleh Camat.' },
  { id: 'LAYANAN-009', ikon: 'copy-20', judul: 'Legalisir Fotokopi Dokumen', deskripsi: 'Pengesahan fotokopi surat atau dokumen oleh Camat.' },
];
