import { useEffect, useState } from 'react';
import { Icon, type IconName } from '../components/Icon';
import { SiteFooter } from '../components/SiteFooter';
import { SiteHeader } from '../components/SiteHeader';
import { FotoPlaceholder, PageBanner, SectionHeading } from '../components/ui';
import { KANTOR_KELURAHAN, type KantorKelurahan } from '../data/kelurahan';
import { angka, desimal, TAHUN_MONOGRAFI, TOTAL_LUAS, TOTAL_PENDUDUK } from '../data/monografi';
import { CAMAT, PEJABAT_STRUKTURAL, SEKRETARIS } from '../data/pejabat';

const BAGIAN: { id: string; label: string; ikon: IconName; ringkas: string }[] = [
  { id: 'gambaran-umum', label: 'Gambaran Umum', ikon: 'file-text', ringkas: 'Letak, fungsi, dan data pokok Kecamatan Tarakan Timur.' },
  { id: 'sejarah', label: 'Sejarah', ikon: 'award', ringkas: 'Perjalanan pembentukan wilayah dari 1981 sampai sekarang.' },
  { id: 'visi-misi', label: 'Visi & Misi', ikon: 'stamp', ringkas: 'Arah pembangunan kecamatan.' },
  { id: 'wilayah', label: 'Wilayah', ikon: 'map-pin-md', ringkas: 'Tujuh kelurahan beserta lurah dan alamat kantornya.' },
  { id: 'struktur-organisasi', label: 'Struktur Organisasi', ikon: 'users', ringkas: 'Camat, sekretaris, dan para kepala seksi.' },
];

// Bagian aktif diambil dari bagian # pada alamat; kosong berarti pengunjung belum memilih.
const bacaBagian = () => BAGIAN.find(({ id }) => id === window.location.hash.slice(1))?.id ?? null;

const FAKTA = [
  { label: 'Provinsi', nilai: 'Kalimantan Utara' },
  { label: 'Kota', nilai: 'Tarakan' },
  { label: 'Jumlah kelurahan', nilai: '7 kelurahan' },
  { label: 'Pusat pemerintahan', nilai: 'Kelurahan Kampung Empat' },
  { label: 'Luas wilayah', nilai: `${desimal(TOTAL_LUAS)} km²` },
  { label: `Jumlah penduduk (${TAHUN_MONOGRAFI})`, nilai: `${angka(TOTAL_PENDUDUK)} jiwa` },
];

const SEJARAH = [
  {
    tahun: '1981',
    judul: 'Menjadi kecamatan di Kota Administratif Tarakan',
    deskripsi: 'PP No. 47 Tahun 1981 membagi Kota Administratif Tarakan menjadi dua kecamatan: Tarakan Barat dan Tarakan Timur.',
  },
  {
    tahun: '1997',
    judul: 'Bagian dari Kotamadya Tarakan',
    deskripsi: 'UU No. 29 Tahun 1997 menetapkan Tarakan Timur sebagai salah satu kecamatan Kotamadya Tarakan, dengan pusat pemerintahan di Kelurahan Kampung Empat.',
  },
  {
    tahun: '1999',
    judul: 'Penataan menjadi empat kecamatan',
    deskripsi: 'Wilayah Kota Tarakan ditata menjadi empat kecamatan: Tarakan Timur, Tarakan Barat, Tarakan Tengah, dan Tarakan Utara.',
  },
  {
    tahun: '2012',
    judul: 'Pembentukan dua kelurahan baru',
    deskripsi: 'Perda Kota Tarakan No. 7 Tahun 2012 membentuk Kelurahan Pantai Amal dan Kelurahan Mamburungan Timur di wilayah Kecamatan Tarakan Timur.',
  },
];

// Teks dalam kurung siku adalah placeholder Figma yang menunggu data resmi.
const MISI = [1, 2, 3, 4].map((nomor) => `[Misi ke-${nomor} sesuai dokumen Renstra kecamatan]`);

function KartuKelurahan({ nama, lurah, alamat }: KantorKelurahan) {
  return (
    <article className="tile tile--auto">
      <span className="tile__icon">
        <Icon name="map-pin-md" />
      </span>
      <h3 className="tile__title">Kelurahan {nama}</h3>
      <p className="tile__desc">
        Lurah: {lurah}
        <br />
        Kantor: {alamat}
      </p>
    </article>
  );
}

function KartuJabatan({ jabatan, nama }: { jabatan: string; nama: string }) {
  return (
    <div className="org-card">
      <span className="org-card__avatar">
        <Icon name="user" />
      </span>
      <p className="org-card__jabatan">{jabatan}</p>
      <p className="org-card__nama">{nama}</p>
    </div>
  );
}

export function ProfilKecamatan() {
  const [bagianAktif, setBagianAktif] = useState<string | null>(bacaBagian);

  useEffect(() => {
    const ikutiAlamat = () => {
      setBagianAktif(bacaBagian());
      window.scrollTo({ top: 0 });
    };
    window.addEventListener('hashchange', ikutiAlamat);
    return () => window.removeEventListener('hashchange', ikutiAlamat);
  }, []);

  return (
    <>
      <SiteHeader aktif="Profil Kecamatan" />
      <main>
        <PageBanner
          halaman="Profil Kecamatan"
          overline="Mengenal Tarakan Timur"
          judul="Profil Kecamatan Tarakan Timur"
          deskripsi="Gambaran umum, sejarah singkat, visi dan misi, wilayah kelurahan, serta struktur organisasi Kecamatan Tarakan Timur."
        />

        {bagianAktif ? (
          <nav className="section-nav" aria-label="Bagian halaman">
            <a href="/profil-kecamatan" className="section-nav__item section-nav__item--kembali">
              ← Semua bagian
            </a>
            {BAGIAN.map(({ id, label }) => (
              <a key={id} href={`#${id}`} className={`section-nav__item${id === bagianAktif ? ' section-nav__item--active' : ''}`} aria-current={id === bagianAktif ? 'true' : undefined}>
                {label}
              </a>
            ))}
          </nav>
        ) : (
          <section className="section pilih-bagian">
            <SectionHeading overline="Pilih bagian" judul="Apa yang ingin Anda ketahui?" deskripsi="Pilih salah satu bagian untuk melihat isinya." />
            <div className="pilih-bagian__grid">
              {BAGIAN.map(({ id, label, ikon, ringkas }) => (
                <a className="tile tile--auto tile--tautan" href={`#${id}`} key={id}>
                  <span className="tile__icon">
                    <Icon name={ikon} />
                  </span>
                  <h3 className="tile__title">{label}</h3>
                  <p className="tile__desc">{ringkas}</p>
                </a>
              ))}
            </div>
          </section>
        )}

        {bagianAktif === 'gambaran-umum' && (
          <section className="profil-umum" id="gambaran-umum">
          <FotoPlaceholder keterangan="Foto kantor Kecamatan Tarakan Timur (placeholder)" className="profil-umum__foto" />
          <div className="profil-umum__teks">
            <p className="overline">Gambaran umum</p>
            <h2 className="heading__title">Kecamatan di pesisir timur Pulau Tarakan</h2>
            <p className="teks-sekunder">
              Kecamatan Tarakan Timur adalah salah satu dari empat kecamatan di Kota Tarakan, Provinsi Kalimantan Utara. Wilayahnya terdiri atas tujuh kelurahan, sebagian di antaranya berada di kawasan pesisir yang berbatasan dengan Laut Sulawesi.
            </p>
            <p className="teks-sekunder">
              Kantor kecamatan menyelenggarakan pelayanan administrasi masyarakat, koordinasi pemerintahan kelurahan, ketenteraman dan ketertiban umum, serta pemberdayaan masyarakat.
            </p>
            <dl className="fakta">
              {FAKTA.map(({ label, nilai }) => (
                <div className="fakta__baris" key={label}>
                  <dt>{label}</dt>
                  <dd>{nilai}</dd>
                </div>
              ))}
            </dl>
          </div>
          </section>
        )}

        {bagianAktif === 'sejarah' && (
          <section className="sejarah" id="sejarah">
          <div className="sejarah__judul">
            <p className="overline">Sejarah singkat</p>
            <h2 className="heading__title">Perjalanan Tarakan Timur</h2>
            <p className="heading__desc">
              <span className="only-desktop">Ringkasan berdasarkan peraturan pembentukan wilayah. Lengkapi dengan narasi sejarah resmi kecamatan.</span>
              <span className="only-mobile">Ringkasan berdasarkan peraturan pembentukan wilayah.</span>
            </p>
          </div>
          <ol className="timeline">
            {SEJARAH.map(({ tahun, judul, deskripsi }) => (
              <li className="timeline__item" key={tahun}>
                <span className="timeline__rail">
                  <img src="/icons/timeline-dot.svg" alt="" width={14} height={14} />
                </span>
                <div className="timeline__isi">
                  <p className="timeline__tahun">{tahun}</p>
                  <h3 className="timeline__judul">{judul}</h3>
                  <p className="teks-sekunder">{deskripsi}</p>
                </div>
              </li>
            ))}
          </ol>
          </section>
        )}

        {bagianAktif === 'visi-misi' && (
          <section className="section section--visi" id="visi-misi">
          <SectionHeading overline="Arah pembangunan" judul="Visi & Misi" deskripsi={
              <>
                <span className="only-desktop">Isi sesuai dokumen Rencana Strategis (Renstra) Kecamatan Tarakan Timur yang berlaku.</span>
                <span className="only-mobile">Isi sesuai dokumen Renstra kecamatan yang berlaku.</span>
              </>
            } />
          <div className="visi-misi">
            <div className="visi">
              <p className="overline overline--accent">Visi</p>
              <p className="visi__teks">“[Tuliskan visi resmi Kecamatan Tarakan Timur sesuai dokumen Renstra]”</p>
            </div>
            <div className="misi">
              <p className="overline">Misi</p>
              <ol className="misi__daftar">
                {MISI.map((misi, urutan) => (
                  <li key={misi}>
                    <span className="misi__nomor">{urutan + 1}</span>
                    <span className="teks-sekunder">{misi}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
          </section>
        )}

        {bagianAktif === 'wilayah' && (
          <section className="section" id="wilayah">
          <SectionHeading overline="Wilayah administrasi" judul="7 Kelurahan di Tarakan Timur" deskripsi={<span className="only-desktop">Setiap kelurahan memiliki kantor pelayanan untuk layanan administrasi tingkat kelurahan.</span>} />
          <div className="wilayah-grid">
            {KANTOR_KELURAHAN.map((kelurahan) => (
              <KartuKelurahan key={kelurahan.nama} {...kelurahan} />
            ))}
            <FotoPlaceholder keterangan="Peta wilayah (placeholder)" className="wilayah-grid__peta only-desktop" />
          </div>
          </section>
        )}

        {bagianAktif === 'struktur-organisasi' && (
          <section className="section section--page section--struktur" id="struktur-organisasi">
          <SectionHeading
            overline="Struktur organisasi"
            judul="Perangkat Kecamatan"
            deskripsi={
              <>
                <span className="only-desktop">Pejabat Kantor Kecamatan Tarakan Timur tahun 2026.</span>
                <span className="only-mobile">Pejabat kecamatan tahun 2026.</span>
              </>
            }
          />
          <div className="bagan">
            <KartuJabatan jabatan="Camat" nama={CAMAT.nama} />
            <span className="bagan__garis" />
            <KartuJabatan jabatan="Sekretaris Camat" nama={SEKRETARIS} />
            <span className="bagan__garis" />
            <span className="bagan__garis-datar bagan__garis-datar--lima" />
            <div className="bagan__seksi">
              {PEJABAT_STRUKTURAL.map(({ jabatan, nama }) => (
                <div className="bagan__cabang" key={jabatan}>
                  <span className="bagan__garis bagan__garis--pendek" />
                  <KartuJabatan jabatan={jabatan} nama={nama} />
                </div>
              ))}
            </div>
          </div>
          </section>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
