import { useId, useState, type ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

/** Mata terbuka = tampilkan password; mata dicoret = sembunyikan. Digambar langsung karena ikon Figma tidak punya ikon mata. */
const IkonMata = ({ coret }: { coret: boolean }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
    <circle cx="12" cy="12" r="3" />
    {coret && <path d="M3 3l18 18" />}
  </svg>
);

/**
 * Kolom password dengan tombol ikon mata untuk melihat isinya. Banyak petugas berusia lanjut, jadi tombolnya
 * besar (mudah ditekan di HP) dan isian bisa diperiksa sebelum dikirim, mengurangi salah ketik.
 */
export function KolomPassword({
  label,
  nilai,
  onUbah,
  autoComplete,
  nama,
  keterangan,
}: {
  label: string;
  nilai: string;
  onUbah: (nilai: string) => void;
  autoComplete: 'current-password' | 'new-password';
  nama?: string;
  keterangan?: string;
}) {
  const id = useId();
  const [terlihat, setTerlihat] = useState(false);
  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      <span className="sandi">
        <input
          id={id}
          className="field__input sandi__input"
          name={nama}
          type={terlihat ? 'text' : 'password'}
          autoComplete={autoComplete}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          value={nilai}
          onChange={(event) => onUbah(event.target.value)}
        />
        <button
          type="button"
          className="sandi__tombol"
          aria-label={terlihat ? 'Sembunyikan password' : 'Tampilkan password'}
          aria-pressed={terlihat}
          aria-controls={id}
          title={terlihat ? 'Sembunyikan password' : 'Tampilkan password'}
          onClick={() => setTerlihat(!terlihat)}
        >
          <IkonMata coret={terlihat} />
        </button>
      </span>
      {keterangan && <span className="baris__meta">{keterangan}</span>}
    </div>
  );
}

interface ButtonProps {
  label: string;
  style?: 'primary' | 'accent' | 'secondary';
  arrow?: boolean;
  type?: 'button' | 'submit';
  disabled?: boolean;
  /** Jika diisi, tombol menjadi tautan. */
  href?: string;
  size?: 'medium' | 'small';
  /** Tautan keluar situs, dibuka di tab baru. */
  luar?: boolean;
  onClick?: () => void;
  className?: string;
}

const PANAH = { primary: 'arrow-white', accent: 'arrow-dark', secondary: 'arrow-primary' } as const;

export function Button({ label, style = 'primary', arrow = false, type = 'button', disabled = false, href, size = 'medium', luar = false, onClick, className = '' }: ButtonProps) {
  const kelas = `btn btn--${style}${size === 'medium' ? '' : ` btn--${size}`} ${className}`.trim();
  const isi = (
    <>
      {label}
      {arrow && <Icon name={PANAH[style]} />}
    </>
  );
  if (href) {
    return (
      <a className={kelas} href={href} target={luar ? '_blank' : undefined} rel={luar ? 'noreferrer' : undefined}>
        {isi}
      </a>
    );
  }
  return (
    <button type={type} className={kelas} disabled={disabled} onClick={onClick}>
      {isi}
    </button>
  );
}

export function FotoPlaceholder({ keterangan, className = '' }: { keterangan: string; className?: string }) {
  return (
    <div className={`news__photo ${className}`.trim()}>
      <Icon name="image" />
      {keterangan}
    </div>
  );
}

interface PageBannerProps {
  halaman: string;
  overline: ReactNode;
  judul: string;
  deskripsi: ReactNode;
}

export function PageBanner({ halaman, overline, judul, deskripsi }: PageBannerProps) {
  return (
    <section className="banner">
      <div className="banner__photo" />
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Icon name="home" />
        <a href="/">Beranda</a>
        <Icon name="chevron-right" />
        <span className="breadcrumb__current" aria-current="page">
          {halaman}
        </span>
      </nav>
      <p className="hero__pill">{overline}</p>
      <h1 className="banner__title">{judul}</h1>
      <p className="banner__desc">{deskripsi}</p>
    </section>
  );
}

export function Logo({ variant }: { variant: 'header' | 'footer' | 'sidebar' }) {
  return <img className={`logo logo--${variant}`} src="/foto/lambang-kota-tarakan.png" alt="Lambang Kota Tarakan" />;
}

interface InputFieldProps {
  label: string;
  name: string;
  placeholder: string;
  inputMode?: 'text' | 'numeric';
  maxLength?: number;
}

export function InputField({ label, name, placeholder, inputMode = 'text', maxLength }: InputFieldProps) {
  return (
    <label className="field">
      <span className="field__label">{label}</span>
      <input className="field__input" name={name} placeholder={placeholder} inputMode={inputMode} maxLength={maxLength} autoComplete="off" />
    </label>
  );
}

interface SelectFieldProps {
  label?: string;
  nama: string;
  /** Pilihan kosong di urutan pertama. */
  placeholder?: string;
  pilihan: string[];
  nilai?: string;
  onUbah?: (nilai: string) => void;
}

export function SelectField({ label, nama, placeholder, pilihan, nilai, onUbah }: SelectFieldProps) {
  return (
    <label className="field">
      {label && <span className="field__label">{label}</span>}
      <select className="field__input field__select" name={nama} aria-label={label ? undefined : nama} value={nilai} onChange={onUbah && ((event) => onUbah(event.target.value))} defaultValue={nilai === undefined ? '' : undefined}>
        {placeholder && <option value="">{placeholder}</option>}
        {pilihan.map((isi) => (
          <option key={isi} value={isi}>
            {isi}
          </option>
        ))}
      </select>
    </label>
  );
}

export function TextareaField({ label, nama, placeholder }: { label: string; nama: string; placeholder: string }) {
  return (
    <label className="field">
      <span className="field__label">{label}</span>
      <textarea className="field__input field__textarea" name={nama} placeholder={placeholder} />
    </label>
  );
}

interface SectionHeadingProps {
  overline: string;
  judul: string;
  deskripsi?: ReactNode;
  tautan?: ReactNode;
  tautanHref?: string;
}

export function SectionHeading({ overline, judul, deskripsi, tautan, tautanHref = '#' }: SectionHeadingProps) {
  return (
    <div className="heading">
      <div className="heading__left">
        <p className="overline">{overline}</p>
        <h2 className="heading__title">{judul}</h2>
      </div>
      <div className="heading__right">
        {deskripsi && <p className="heading__desc">{deskripsi}</p>}
        {tautan && (
          <a className="link" href={tautanHref}>
            {tautan}
          </a>
        )}
      </div>
    </div>
  );
}

interface ServiceTileProps {
  ikon: IconName;
  judul: string;
  deskripsi: string;
  onLihatPersyaratan: () => void;
  className?: string;
}

export function ServiceTile({ ikon, judul, deskripsi, onLihatPersyaratan, className = '' }: ServiceTileProps) {
  return (
    <article className={`tile ${className}`.trim()}>
      <span className="tile__icon">
        <Icon name={ikon} />
      </span>
      <h3 className="tile__title">{judul}</h3>
      <p className="tile__desc">{deskripsi}</p>
      <button type="button" className="link link--button" onClick={onLihatPersyaratan}>
        Lihat persyaratan
      </button>
    </article>
  );
}

/**
 * Foto berita bila ada; tanpa foto (atau foto gagal dimuat) tetap tampil kotak placeholder seperti sebelumnya.
 * `loading="lazy"` supaya HP tidak mengunduh foto berita yang belum digulir.
 */
export function FotoBerita({ url, alt, keterangan, className = '' }: { url: string | null; alt: string; keterangan: string; className?: string }) {
  const [gagal, setGagal] = useState(false);
  if (!url || gagal) return <FotoPlaceholder keterangan={keterangan} className={className} />;
  return <img className={`news__photo news__photo--gambar ${className}`.trim()} src={url} alt={alt} loading="lazy" decoding="async" onError={() => setGagal(true)} />;
}

interface NewsCardProps {
  tanggal: string;
  judul: string;
  ringkasan: string;
  /** Alamat foto berita; null = tanpa foto. */
  foto?: string | null;
  className?: string;
}

export function NewsCard({ tanggal, judul, ringkasan, foto = null, className = '' }: NewsCardProps) {
  return (
    <article className={`news ${className}`.trim()}>
      <FotoBerita url={foto} alt={judul} keterangan="Foto berita" />
      <div className="news__body">
        <p className="overline">{tanggal}</p>
        <h3 className="news__title">{judul}</h3>
        <p className="news__desc">{ringkasan}</p>
      </div>
    </article>
  );
}

export function StatCard({ angka, satuan, label }: { angka: string; satuan: string; label: string }) {
  return (
    <div className="stat">
      <div className="stat__value">
        <span className="stat__number">{angka}</span>
        <span>{satuan}</span>
      </div>
      <span>{label}</span>
    </div>
  );
}
