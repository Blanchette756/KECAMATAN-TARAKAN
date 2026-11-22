import type { Ringkas } from './api';

/**
 * Rekap berkas untuk diekspor ke CSV, seperti rekening koran: semua berkas yang diajukan dalam rentang tanggal.
 * Pemisah titik koma karena Excel berbahasa Indonesia memakai `;` sebagai pemisah daftar; dengan koma,
 * seluruh baris masuk ke satu kolom. BOM di awal supaya Excel membaca UTF-8 (huruf seperti "é" tidak rusak).
 */
const PEMISAH = ';';
const ZONA = 'Asia/Makassar';

/** Tanggal WITA dalam bentuk YYYY-MM-DD (format bawaan input tanggal). */
export const tanggalWita = (iso: string | Date) => new Intl.DateTimeFormat('en-CA', { timeZone: ZONA }).format(new Date(iso));

/** Tanggal 1 bulan ini (WITA), YYYY-MM-DD. */
export const awalBulanWita = () => `${tanggalWita(new Date()).slice(0, 8)}01`;

/** "2026-11-23 01:30": dikenali Excel sebagai tanggal dan tetap terbaca bila dibuka sebagai teks. */
function waktuWita(iso: string | null | undefined): string {
  if (!iso) return '';
  const bagian = new Intl.DateTimeFormat('en-CA', { timeZone: ZONA, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    .formatToParts(new Date(iso))
    .reduce<Record<string, string>>((hasil, { type, value }) => ({ ...hasil, [type]: value }), {});
  return `${bagian.year}-${bagian.month}-${bagian.day} ${bagian.hour}:${bagian.minute}`;
}

/** Berkas yang diajukan antara `dari` dan `sampai` (YYYY-MM-DD, keduanya termasuk), menurut tanggal WITA. */
export const dalamRentang = (item: Ringkas, dari: string, sampai: string) => {
  const tgl = tanggalWita(item.tgl_pengajuan);
  return tgl >= dari && tgl <= sampai;
};

/**
 * Satu sel CSV. Teks yang diawali = + - @ diberi petik satu supaya Excel tidak menjalankannya sebagai rumus
 * (nama atau isian dari warga tidak boleh bisa menjalankan rumus di komputer kantor).
 */
function sel(nilai: string | number): string {
  let teks = String(nilai);
  if (/^[=+\-@\t\r]/.test(teks)) teks = `'${teks}`;
  return /[";\n\r]/.test(teks) ? `"${teks.replace(/"/g, '""')}"` : teks;
}

const KOLOM = ['No', 'Kode Permohonan', 'Tanggal Diajukan (WITA)', 'Pemohon', 'Layanan', 'Status', 'Petugas Pelayanan', 'Nomor Surat', 'Tanggal Selesai (WITA)'];

/** Isi CSV, urut dari yang paling lama diajukan (seperti mutasi rekening). */
export function buatCsv(daftar: Ringkas[], namaLayanan: (item: Ringkas) => string): string {
  const urut = [...daftar].sort((a, b) => a.tgl_pengajuan.localeCompare(b.tgl_pengajuan));
  const baris = urut.map((item, i) =>
    [
      i + 1,
      item.no_registrasi,
      waktuWita(item.tgl_pengajuan),
      item.pemohon?.nama_lengkap ?? '',
      namaLayanan(item),
      item.label_status,
      item.penangan?.nama_lengkap ?? '',
      item.nomor_surat ?? '',
      waktuWita(item.tgl_selesai),
    ].map(sel),
  );
  return '﻿' + [KOLOM.map(sel), ...baris].map((b) => b.join(PEMISAH)).join('\r\n') + '\r\n';
}

/** Unduh teks sebagai file .csv tanpa server (berkas sudah ada di halaman). */
export function unduhCsv(namaFile: string, isi: string) {
  const url = URL.createObjectURL(new Blob([isi], { type: 'text/csv;charset=utf-8' }));
  const tautan = document.createElement('a');
  tautan.href = url;
  tautan.download = namaFile;
  document.body.appendChild(tautan);
  tautan.click();
  tautan.remove();
  // Beri waktu browser mulai mengunduh sebelum alamat sementaranya dibuang.
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
