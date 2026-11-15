import { useState } from 'react';
import { Icon, type IconName } from '../components/Icon';
import { PersyaratanDialog } from '../components/PersyaratanDialog';
import { SiteFooter } from '../components/SiteFooter';
import { SiteHeader } from '../components/SiteHeader';
import { Button, NewsCard, SectionHeading, ServiceTile, StatCard } from '../components/ui';
import { tanggalBerita, useBerita } from '../data/berita';
import { ALAMAT, EMAIL, JAM_PELAYANAN, TAUTAN_PETA, TAUTAN_WA, TELEPON, WHATSAPP } from '../data/kontak';
import { KANTOR_KELURAHAN } from '../data/kelurahan';
import { CAMAT, PEJABAT_STRUKTURAL, SEKRETARIS } from '../data/pejabat';
import { angka, desimal, SUMBER_MONOGRAFI, TAHUN_MONOGRAFI, TOTAL_LUAS, TOTAL_PENDUDUK } from '../data/monografi';

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

const SOROT: { ikon: IconName; judul: string; isi: string; href: string; tautan: string }[] = [
  { ikon: 'file-text', judul: 'Profil & Sejarah', isi: 'Gambaran umum, sejarah, visi misi, dan wilayah Kecamatan Tarakan Timur.', href: '/profil-kecamatan', tautan: 'Selengkapnya' },
  { ikon: 'users', judul: 'Data Monografi', isi: 'Jumlah penduduk, luas wilayah, dan data per kelurahan yang terus diperbarui.', href: '/data-monografi', tautan: 'Selengkapnya' },
  { ikon: 'stamp', judul: 'Struktur Organisasi', isi: 'Camat, sekretaris, kepala seksi, dan para lurah yang melayani warga.', href: '/profil-kecamatan#struktur-organisasi', tautan: 'Selengkapnya' },
];

const APARATUR: { jabatan: string; nama: string }[] = [
  { jabatan: 'Camat Tarakan Timur', nama: CAMAT.nama },
  { jabatan: 'Sekretaris Camat', nama: SEKRETARIS },
  ...PEJABAT_STRUKTURAL,
];

/** Dua huruf pertama dari nama, tanpa gelar di depannya. */
const inisial = (nama: string) =>
  nama
    .replace(/^(Ir\.|Drs\.|Dr\.)\s*/i, '')
    .split(/[\s,]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((kata) => kata[0].toUpperCase())
    .join('');

function Gelombang({ warna }: { warna: string }) {
  return (
    <svg className="gelombang" viewBox="0 0 1440 90" preserveAspectRatio="none" aria-hidden="true">
      <path d="M0 45C200 95 420 5 720 38C1010 70 1220 95 1440 40V90H0Z" fill={warna} />
    </svg>
  );
}

export function Beranda() {
  const [layananDipilih, setLayananDipilih] = useState<string | null>(null);
  const { berita, galat: galatBerita } = useBerita();

  return (
    <>
      <SiteHeader aktif="Beranda" />
      <main>
        <section className="hero hero--tengah">
          <div className="hero__top">
            <div className="hero__photo" />
            <div className="hero__overlay" />
            <p className="hero__pill">Portal pelayanan publik resmi</p>
            <h1 className="hero__title">Selamat Datang di Portal Resmi Pelayanan Publik Kecamatan Tarakan Timur</h1>
            <p className="hero__lead">Akses informasi, pengajuan administrasi, dan layanan masyarakat secara mudah, transparan, dan terpercaya.</p>
            <Button label="Jelajahi Layanan Publik" style="accent" arrow href="#layanan" className="hero__cta" />
          </div>
          <Gelombang warna="var(--color-bg-canvas)" />
        </section>

        <section className="sorot" aria-label="Pintasan">
          <div className="sorot__baris">
            {SOROT.map((item) => (
              <a className="kartu-sorot" href={item.href} key={item.judul}>
                <span className="kartu-sorot__ikon">
                  <Icon name={item.ikon} />
                </span>
                <h3 className="kartu-sorot__judul">{item.judul}</h3>
                <p className="kartu-sorot__isi">{item.isi}</p>
                <span className="kartu-sorot__tautan">{item.tautan}</span>
              </a>
            ))}
          </div>
        </section>

        <section className="section section--kanvas" id="layanan">
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
            {berita?.slice(0, 3).map((item, urutan) => (
              <NewsCard key={item.id_berita} tanggal={tanggalBerita(item.tanggal)} judul={item.judul} ringkasan={item.ringkasan} className={urutan === 2 ? 'only-desktop' : ''} />
            ))}
          </div>
          {!berita && <p className="heading__desc">{galatBerita ? 'Berita belum dapat dimuat. Coba muat ulang halaman.' : 'Memuat berita…'}</p>}
          {berita?.length === 0 && <p className="heading__desc">Belum ada berita.</p>}
        </section>

        <section className="section section--demografi section--gelap" id="demografi">
          <SectionHeading
            overline="Tarakan Timur dalam angka"
            judul="Data Demografi"
            deskripsi={`Data tahun ${TAHUN_MONOGRAFI} • Sumber: ${SUMBER_MONOGRAFI}`}
            tautan="Lihat Data Monografi"
            tautanHref="/data-monografi"
          />
          <div className="stat-row">
            <StatCard angka={angka(TOTAL_PENDUDUK)} satuan="Jiwa" label="Jumlah Penduduk" />
            <StatCard angka={desimal(TOTAL_LUAS)} satuan="km²" label="Luas Wilayah" />
            <StatCard angka="7" satuan="Kelurahan" label="Jumlah Kelurahan" />
          </div>
        </section>

        <section className="section section--page" id="aparatur">
          <SectionHeading overline="Pimpinan kecamatan" judul="Aparatur Kecamatan" deskripsi="Pejabat yang melayani warga Kecamatan Tarakan Timur." tautan="Lihat struktur organisasi" tautanHref="/profil-kecamatan#struktur-organisasi" />
          <div className="aparatur" role="list">
            {APARATUR.map((orang) => (
              <article className="aparatur__kartu" role="listitem" key={orang.jabatan}>
                <span className="aparatur__avatar" aria-hidden="true">
                  {inisial(orang.nama)}
                </span>
                <h3 className="aparatur__nama">{orang.nama}</h3>
                <p className="aparatur__jabatan">{orang.jabatan}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section section--kanvas" id="kelurahan">
          <SectionHeading overline="Wilayah layanan" judul="7 Kelurahan" deskripsi="Kantor kelurahan siap membantu urusan administrasi di tingkat bawah." tautan="Lihat semua kontak" tautanHref="/kontak" />
          <div className="kelurahan">
            {KANTOR_KELURAHAN.map((k) => (
              <a className="kelurahan__kartu" href="/kontak" key={k.nama}>
                <span className="kelurahan__nama">{k.nama}</span>
                <span className="kelurahan__lurah">Lurah: {k.lurah}</span>
              </a>
            ))}
          </div>
        </section>

        <section className="hubungi" id="hubungi">
          <div className="hubungi__isi">
            <div className="hubungi__kiri">
              <p className="overline overline--accent">Hubungi kami</p>
              <h2 className="hubungi__judul">Ada yang bisa kami bantu?</h2>
              <p className="hubungi__desc">Datang langsung ke kantor kecamatan atau hubungi kami pada jam pelayanan.</p>
              <div className="hubungi__aksi">
                <Button label="Chat WhatsApp" style="accent" arrow href={TAUTAN_WA} luar />
                <Button label="Lihat di Peta" style="secondary" href={TAUTAN_PETA} luar />
              </div>
            </div>
            <ul className="hubungi__daftar">
              <li>
                <Icon name="map-pin-22" />
                <span>{ALAMAT}</span>
              </li>
              <li>
                <Icon name="phone-22" />
                <span>
                  {TELEPON} · WA {WHATSAPP}
                </span>
              </li>
              <li>
                <Icon name="mail-22" />
                <span>{EMAIL}</span>
              </li>
              <li>
                <Icon name="clock-22" />
                <span>{JAM_PELAYANAN} (Sabtu, Minggu & hari libur tutup)</span>
              </li>
            </ul>
          </div>
        </section>
      </main>
      <SiteFooter />
      {layananDipilih && <PersyaratanDialog idLayanan={layananDipilih} onTutup={() => setLayananDipilih(null)} />}
    </>
  );
}
