import type { ReactNode } from 'react';
import type { DetailPengajuan } from '../api';
import { Icon } from './Icon';

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
