import { useState } from 'react';
import type { IconName } from '../components/Icon';
import { LacakStatus } from '../components/LacakStatus';
import { PersyaratanDialog } from '../components/PersyaratanDialog';
import { SiteFooter } from '../components/SiteFooter';
import { SiteHeader } from '../components/SiteHeader';
import { Button, NewsCard, SectionHeading, ServiceTile, StatCard } from '../components/ui';
import { BERITA } from '../data/berita';

// Judul dan deskripsi mengikuti Figma; `id` menunjuk layanan di backend.
const LAYANAN: { id: string; ikon: IconName; judul: string; deskripsi: string }[][] = [
  [
    { id: 'LAYANAN-001', ikon: 'ship', judul: 'Surat Keterangan Hak Milik Kapal', deskripsi: 'Bukti kepemilikan kapal milik warga.' },
    { id: 'LAYANAN-002', ikon: 'heart', judul: 'Dispensasi Nikah', deskripsi: 'Surat dispensasi untuk keperluan pernikahan.' },
    { id: 'LAYANAN-003', ikon: 'users', judul: 'Legalisasi Surat Keterangan Ahli Waris', deskripsi: 'Pengesahan surat ahli waris dari kelurahan.' },
  ],
  [
    { id: 'LAYANAN-005', ikon: 'file-text', judul: 'Surat Keterangan', deskripsi: 'Keterangan sesuai keperluan, termasuk kehilangan alas hak tanah.' },
    { id: 'LAYANAN-006', ikon: 'award', judul: 'Surat Rekomendasi', deskripsi: 'Rekomendasi kecamatan sesuai keperluan pemohon.' },
    { id: 'LAYANAN-008', ikon: 'stamp', judul: 'Legalisasi Surat/Dokumen', deskripsi: 'Pengesahan asli surat atau dokumen oleh Camat.' },
  ],
];

export function Beranda() {
  const [layananDipilih, setLayananDipilih] = useState<string | null>(null);

  return (
    <>
      <SiteHeader aktif="Beranda" />
      <main>
        <section className="hero">
          <div className="hero__top">
            <div className="hero__photo" />
            <div className="hero__overlay" />
            <p className="hero__pill">Portal pelayanan publik resmi</p>
            <h1 className="hero__title">Selamat Datang di Portal Resmi Pelayanan Publik Kecamatan Tarakan Timur</h1>
            <p className="hero__lead">Akses informasi, pengajuan administrasi, dan layanan masyarakat secara mudah, transparan, dan terpercaya.</p>
            <Button label="Jelajahi Layanan Publik" style="accent" arrow href="#layanan" className="hero__cta" />
          </div>
          <div className="hero__tracker">
            <LacakStatus />
          </div>
        </section>

        <section className="section" id="layanan">
          <SectionHeading
            overline="Pelayanan warga"
            judul="Layanan Utama"
            deskripsi={
              <>
                <span className="only-desktop">Pilih kebutuhan administrasi Anda. Setiap layanan dilengkapi panduan persyaratan dan alur yang jelas.</span>
                <span className="only-mobile">Pilih kebutuhan administrasi Anda. Setiap layanan dilengkapi panduan persyaratan.</span>
              </>
            }
          />
          {LAYANAN.map((baris, nomorBaris) => (
            <div className="tile-row" key={nomorBaris}>
              {baris.map(({ id, ...layanan }, kolom) => (
                <ServiceTile
                  key={id}
                  {...layanan}
                  onLihatPersyaratan={() => setLayananDipilih(id)}
                  className={nomorBaris === 1 && kolom > 0 ? 'only-desktop' : ''}
                />
              ))}
            </div>
          ))}
          <Button label="Lihat semua 9 layanan" style="secondary" arrow href="/pelayanan" className="only-mobile" />
        </section>

        <section className="section section--page">
          <SectionHeading overline="Informasi pemerintah" judul="Berita Terkini" tautan="Lihat semua berita" tautanHref="/informasi-publik" />
          <div className="news-row">
            {BERITA.slice(0, 3).map((berita, urutan) => (
              <NewsCard key={berita.judul} {...berita} className={urutan === 2 ? 'only-desktop' : ''} />
            ))}
          </div>
        </section>

        <section className="section section--demografi" id="demografi">
          <SectionHeading
            overline="Tarakan Timur dalam angka"
            judul="Data Demografi"
            deskripsi="Data publik semester I tahun 2026 • Sumber: Kecamatan Tarakan Timur"
            tautan="Lihat Data Monografi"
            tautanHref="/data-monografi"
          />
          <div className="stat-row">
            <StatCard angka="82.743" satuan="Jiwa" label="Jumlah Penduduk" />
            <StatCard angka="58,20" satuan="km²" label="Luas Wilayah" />
            <StatCard angka="7" satuan="Kelurahan" label="Jumlah Kelurahan" />
          </div>
        </section>
      </main>
      <SiteFooter />
      {layananDipilih && <PersyaratanDialog idLayanan={layananDipilih} onTutup={() => setLayananDipilih(null)} />}
    </>
  );
}
