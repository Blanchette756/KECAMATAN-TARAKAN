import { useEffect, useRef, useState, type DragEvent as ReactDragEvent, type ReactNode } from 'react';
import type { DetailPengajuan } from '../api';
import { Icon } from './Icon';

/**
 * Kunci tombol kirim supaya aksi hanya jalan sekali walau diklik dua kali cepat atau Enter ditekan berulang.
 * Memakai ref (langsung berlaku), bukan hanya state yang baru berlaku setelah render berikutnya.
 * Setelah berhasil kunci tidak dilepas, karena halaman berpindah; jika gagal, panggil `lepas()`.
 */
export function useKunciKirim() {
  const terkunci = useRef(false);
  const [mengirim, setMengirim] = useState(false);
  const mulai = () => {
    if (terkunci.current) return false;
    terkunci.current = true;
    setMengirim(true);
    return true;
  };
  const lepas = () => {
    terkunci.current = false;
    setMengirim(false);
  };
  return { mengirim, mulai, lepas };
}

const FORMAT_BERKAS = ['application/pdf', 'image/jpeg', 'image/png'];
const MAKS_UKURAN_BERKAS = 2 * 1024 * 1024;

/** Cek format dan ukuran sebelum diunggah. Mengembalikan pesan galat, atau null jika aman. */
export function cekBerkas(file: File): string | null {
  if (!FORMAT_BERKAS.includes(file.type)) return `${file.name} bukan file JPG, PNG, atau PDF.`;
  if (file.size > MAKS_UKURAN_BERKAS) return `${file.name} melebihi batas 2 MB.`;
  return null;
}

/**
 * Tanpa ini, file yang dijatuhkan sedikit di luar kotak unggah akan dibuka browser
 * dan halaman ditinggalkan, sehingga semua isian dan unggahan hilang.
 */
export function useCegahBukaFile() {
  useEffect(() => {
    const cegah = (event: DragEvent) => {
      if (event.dataTransfer?.types.includes('Files')) event.preventDefault();
    };
    window.addEventListener('dragover', cegah);
    window.addEventListener('drop', cegah);
    return () => {
      window.removeEventListener('dragover', cegah);
      window.removeEventListener('drop', cegah);
    };
  }, []);
}

/** Seret-lepas file ke satu kotak unggah. `diAtas` dipakai untuk menyorot kotak saat file diseret di atasnya. */
export function useSeretLepas(onPilih: (file: File) => void) {
  const [diAtas, setDiAtas] = useState(false);
  const props = {
    onDragOver: (event: ReactDragEvent<HTMLElement>) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
      setDiAtas(true);
    },
    onDragLeave: (event: ReactDragEvent<HTMLElement>) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDiAtas(false);
    },
    onDrop: (event: ReactDragEvent<HTMLElement>) => {
      event.preventDefault();
      setDiAtas(false);
      const file = event.dataTransfer.files[0];
      if (file) onPilih(file);
    },
  };
  return { diAtas, props };
}

/** Berkas yang sedang diunggah, per id persyaratan. */
export interface ProsesUnggah {
  nama: string;
  persen: number;
}

/** Salinan objek tanpa satu kunci (mis. berkas yang selesai diunggah). */
export function tanpaKunci<T>(objek: Record<string, T>, kunci: string): Record<string, T> {
  const salinan = { ...objek };
  delete salinan[kunci];
  return salinan;
}

/** Tanda unggah yang jelas: ikon berputar, nama file, bilah kemajuan, dan persentase. */
export function TandaUnggah({ proses }: { proses: ProsesUnggah }) {
  return (
    <div className="unggah-proses" role="status" aria-live="polite">
      <span className="pemuat" aria-hidden="true" />
      <div className="unggah-proses__teks">
        <p className="baris__judul">Mengunggah {proses.nama}…</p>
        <div className="progres-tunggal" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={proses.persen} aria-label={`Kemajuan unggah ${proses.nama}`}>
          <span style={{ width: `${proses.persen}%` }} />
        </div>
      </div>
      <span className="unggah-proses__persen">{proses.persen}%</span>
    </div>
  );
}

/** Label singkat dan warna badge mengikuti Figma; status backend lebih rinci. */
const BADGE: Record<string, { label: string; warna: string }> = {
  DIAJUKAN: { label: 'Diajukan', warna: 'netral' },
  PERLU_REVISI: { label: 'Perlu Perbaikan', warna: 'merah' },
  DIKEMBALIKAN_KE_ADMIN: { label: 'Diperiksa', warna: 'kuning' },
  MENUNGGU_PARAF_KASI: { label: 'Diperiksa', warna: 'kuning' },
  MENUNGGU_TTE_CAMAT: { label: 'Divalidasi', warna: 'garis-primer' },
  SIAP_DIAMBIL: { label: 'Selesai', warna: 'hijau' },
  SELESAI: { label: 'Selesai', warna: 'hijau' },
  DITOLAK: { label: 'Ditolak', warna: 'merah' },
};

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const { label: teks, warna } = BADGE[status] ?? BADGE.DIAJUKAN;
  return <span className={`status status--${warna}`}>{label ?? teks}</span>;
}

const TAHAP = ['Permohonan diajukan', 'Berkas diperiksa & dinyatakan lengkap', 'Divalidasi Kasi Tata Pemerintahan', 'Tanda tangan Camat', 'Selesai — siap diambil'];

/** Urutan tahap yang sedang berjalan untuk tiap status. */
const POSISI: Record<string, number> = { DIAJUKAN: 1, PERLU_REVISI: 1, DIKEMBALIKAN_KE_ADMIN: 1, MENUNGGU_PARAF_KASI: 2, MENUNGGU_TTE_CAMAT: 3, SIAP_DIAMBIL: 5, SELESAI: 5 };

export const jumlahTahapSelesai = (status: string) => POSISI[status] ?? 0;

export const tanggal = (iso: string) => new Date(iso).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Makassar' }).replace(':', '.');

export function TahapPermohonan({ data }: { data: DetailPengajuan }) {
  const posisi = POSISI[data.status_pengajuan] ?? 0;
  const gagal = data.status_pengajuan === 'PERLU_REVISI' || data.status_pengajuan === 'DITOLAK';
  return (
    <ol className="tahap">
      {TAHAP.map((judul, urutan) => {
        const kondisi = urutan < posisi ? 'selesai' : urutan === posisi ? (gagal ? 'gagal' : 'aktif') : 'menunggu';
        return (
          <li className={`tahap__item tahap__item--${kondisi}`} key={judul}>
            <span className="tahap__titik">{kondisi === 'selesai' && <Icon name="check" />}</span>
            <div>
              <p className="baris__judul">{judul}</p>
              <p className="baris__meta">{kondisi === 'aktif' ? 'Sedang berjalan' : kondisi === 'gagal' ? 'Perlu tindakan' : kondisi === 'selesai' ? 'Selesai' : 'Menunggu'}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function Riwayat({ data }: { data: DetailPengajuan }) {
  return (
    <ol className="tahap">
      {data.riwayat.map((r) => (
        <li className="tahap__item tahap__item--selesai" key={`${r.waktu}-${r.ke}`}>
          <span className="tahap__titik">
            <Icon name="check" />
          </span>
          <div>
            <p className="baris__judul">{r.label}</p>
            <p className="baris__meta">{tanggal(r.waktu)} WITA</p>
            {r.catatan && <p className="baris__meta">{r.catatan}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}

export function Kartu({ judul, aksi, children, className = '' }: { judul?: ReactNode; aksi?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`kartu ${className}`.trim()}>
      {(judul || aksi) && (
        <div className="kartu__judul">
          <h2 className="tile__title">{judul}</h2>
          {aksi}
        </div>
      )}
      {children}
    </section>
  );
}

export const BarisData = ({ label, nilai }: { label: string; nilai: ReactNode }) => (
  <div className="fakta__baris">
    <dt>{label}</dt>
    <dd>{nilai}</dd>
  </div>
);

export const ukuranFile = (byte: number) => (byte < 1024 * 1024 ? `${Math.round(byte / 1024)} KB` : `${(byte / 1024 / 1024).toFixed(1)} MB`);

export const Galat = ({ pesan }: { pesan: string | null }) =>
  pesan && (
    <p className="tracker__error" role="alert">
      {pesan}
    </p>
  );
