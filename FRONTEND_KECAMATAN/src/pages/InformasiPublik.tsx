import { useState } from 'react';
import { Icon } from '../components/Icon';
import { SiteFooter } from '../components/SiteFooter';
import { SiteHeader } from '../components/SiteHeader';
import { Button, FotoPlaceholder, NewsCard, PageBanner } from '../components/ui';
import { tanggalBerita, useBerita } from '../data/berita';

// Nama unit mengikuti susunan organisasi kecamatan ("06. Nama Pejabat.xlsx").
const PENGUMUMAN = [
  { hari: '24', bulan: 'OKT', judul: 'Jadwal pelayanan kantor kecamatan selama cuti bersama', meta: 'Pengumuman · Sekretariat' },
  { hari: '15', bulan: 'OKT', judul: 'Pelayanan administrasi keliling bulan November', meta: 'Pengumuman · Seksi Tata Pemerintahan' },
  { hari: '07', bulan: 'OKT', judul: 'Pemutakhiran data RT/RW se-Kecamatan Tarakan Timur', meta: 'Pengumuman · Seksi Tata Pemerintahan' },
  { hari: '30', bulan: 'SEP', judul: 'Pendaftaran pelatihan UMKM tingkat kecamatan', meta: 'Pengumuman · Seksi Pemberdayaan Masyarakat' },
];

// Berkasnya belum diserahkan kecamatan, jadi belum bisa diunduh.
const DOKUMEN = [
  'Standar Pelayanan Kecamatan Tarakan Timur',
  'Maklumat Pelayanan',
  'Rencana Strategis (Renstra)',
  'Rencana Kerja (Renja)',
  'Laporan Kinerja Instansi Pemerintah (LKjIP)',
];

const TAB = ['Semua', 'Berita', 'Pengumuman', 'Dokumen Publik'];

/** Jumlah kartu berita yang langsung tampil di mobile sebelum "Muat lebih banyak". */
const KARTU_AWAL_MOBILE = 2;
const PENGUMUMAN_AWAL_MOBILE = 3;
const KARTU_PER_HALAMAN = 4;

/** Tab bisa dibuka langsung dari menu atas, mis. /informasi-publik?tab=Pengumuman. */
const tabAwal = () => {
  const diminta = new URLSearchParams(window.location.search).get('tab');
  return diminta && TAB.includes(diminta) ? diminta : 'Semua';
};

export function InformasiPublik() {
  const [tab, setTab] = useState(tabAwal);
  const [cari, setCari] = useState('');
  const [muatSemua, setMuatSemua] = useState(false);
  const [halaman, setHalaman] = useState(1);
  const { berita: semuaBerita, galat: galatBerita } = useBerita();
  const daftarBerita = semuaBerita ?? [];
  const jumlahTab: Record<string, number> = {
    Semua: daftarBerita.length + PENGUMUMAN.length + DOKUMEN.length,
    Berita: daftarBerita.length,
    Pengumuman: PENGUMUMAN.length,
    'Dokumen Publik': DOKUMEN.length,
  };

  const kata = cari.trim().toLowerCase();
  const cocok = (...teks: string[]) => teks.join(' ').toLowerCase().includes(kata);

  const tampilkanBerita = tab === 'Semua' || tab === 'Berita';
  const beritaBelumAda = tampilkanBerita && semuaBerita === null;
  const berita = tampilkanBerita ? daftarBerita.filter((b) => cocok(b.judul, b.ringkasan)) : [];
  const pengumuman = tab === 'Semua' || tab === 'Pengumuman' ? PENGUMUMAN.filter((p) => cocok(p.judul, p.meta)) : [];
  const dokumen = tab === 'Semua' || tab === 'Dokumen Publik' ? DOKUMEN.filter((judul) => cocok(judul)) : [];

  const [utama, ...lainnya] = berita;
  const jumlahHalaman = Math.ceil(lainnya.length / KARTU_PER_HALAMAN);
  const halamanAktif = Math.min(halaman, Math.max(jumlahHalaman, 1));
  const kartuDesktop = lainnya.slice((halamanAktif - 1) * KARTU_PER_HALAMAN, halamanAktif * KARTU_PER_HALAMAN);
  const adaHasil = berita.length + pengumuman.length + dokumen.length > 0;

  return (
    <>
      <SiteHeader aktif="Informasi Publik" />
      <main>
        <PageBanner
          halaman="Informasi Publik"
          overline="Transparansi informasi"
          judul="Informasi Publik"
          deskripsi="Berita kegiatan, pengumuman resmi, dan dokumen publik Kecamatan Tarakan Timur yang dapat diakses masyarakat."
        />

        <div className="toolbar">
          <div className="chips">
            {TAB.map((label) => (
              <button key={label} type="button" className={`chip${label === tab ? ' chip--selected' : ''}`} aria-pressed={label === tab} onClick={() => setTab(label)}>
                {label}
                <span className="chip__jumlah">{jumlahTab[label]}</span>
              </button>
            ))}
          </div>
          <label className="search">
            <Icon name="search" />
            <input
              className="search__input"
              type="search"
              placeholder="Cari berita, pengumuman, atau dokumen…"
              aria-label="Cari berita, pengumuman, atau dokumen"
              value={cari}
              onChange={(event) => setCari(event.target.value)}
            />
          </label>
        </div>

        <div className="info-konten">
          {beritaBelumAda && <p className="info-kosong">{galatBerita ? 'Berita belum dapat dimuat. Coba muat ulang halaman.' : 'Memuat berita…'}</p>}
          {!adaHasil && !beritaBelumAda && <p className="info-kosong">{kata ? `Tidak ada hasil untuk “${cari.trim()}”.` : 'Belum ada informasi.'}</p>}

          {utama && (
            <div className="info-utama">
              <article className="sorotan">
                <FotoPlaceholder keterangan="Foto berita utama" className="sorotan__foto" />
                <div className="sorotan__isi">
                  <span className="badge">Sorotan</span>
                  <p className="overline">{tanggalBerita(utama.tanggal)}</p>
                  <h2 className="sorotan__judul">{utama.judul}</h2>
                  <p className="teks-sekunder">{utama.ringkasan}</p>
                </div>
              </article>

              {lainnya.length > 0 && (
                <>
                  <div className="info-judul">
                    <div className="heading__left">
                      <p className="overline">Kabar kecamatan</p>
                      <h2 className="info-judul__teks">Berita Terbaru</h2>
                    </div>
                    <p className="info-judul__jumlah only-desktop">
                      Menampilkan {kartuDesktop.length} dari {lainnya.length} berita
                    </p>
                  </div>
                  <div className="info-berita">
                    {lainnya.map((item, urutan) => {
                      const diDesktop = kartuDesktop.includes(item);
                      const diMobile = muatSemua || urutan < KARTU_AWAL_MOBILE;
                      if (!diDesktop && !diMobile) return null;
                      const kelas = diDesktop && diMobile ? '' : diDesktop ? 'only-desktop' : 'only-mobile';
                      return <NewsCard key={item.id_berita} tanggal={tanggalBerita(item.tanggal)} judul={item.judul} ringkasan={item.ringkasan} className={kelas} />;
                    })}
                  </div>
                  {jumlahHalaman > 1 && (
                    <nav className="pagination only-desktop" aria-label="Halaman berita">
                      <button type="button" className="page" aria-label="Halaman sebelumnya" disabled={halamanAktif === 1} onClick={() => setHalaman(halamanAktif - 1)}>
                        <Icon name="chevron-left-16" />
                      </button>
                      {Array.from({ length: jumlahHalaman }, (_, i) => i + 1).map((nomor) => (
                        <button key={nomor} type="button" className={`page${nomor === halamanAktif ? ' page--active' : ''}`} aria-current={nomor === halamanAktif ? 'page' : undefined} onClick={() => setHalaman(nomor)}>
                          {nomor}
                        </button>
                      ))}
                      <button type="button" className="page" aria-label="Halaman berikutnya" disabled={halamanAktif === jumlahHalaman} onClick={() => setHalaman(halamanAktif + 1)}>
                        <Icon name="chevron-right-16" />
                      </button>
                    </nav>
                  )}
                  {!muatSemua && lainnya.length > KARTU_AWAL_MOBILE && (
                    <Button label="Muat lebih banyak" style="secondary" className="only-mobile" onClick={() => setMuatSemua(true)} />
                  )}
                </>
              )}
            </div>
          )}

          <aside className={`info-sidebar${berita.length === 0 ? ' info-sidebar--penuh' : ''}`}>
            {pengumuman.length > 0 && (
              <section className="panel">
                <div className="panel__head">
                  <h2 className="tile__title">Pengumuman</h2>
                  {tab === 'Semua' && (
                    <button type="button" className="link link--button" onClick={() => setTab('Pengumuman')}>
                      <span className="only-desktop">Lihat semua</span>
                      <span className="only-mobile">Semua</span>
                    </button>
                  )}
                </div>
                {pengumuman.map(({ hari, bulan, judul, meta }, urutan) => (
                  <article key={judul} className={`pengumuman${tab === 'Semua' && urutan >= PENGUMUMAN_AWAL_MOBILE ? ' only-desktop' : ''}`}>
                    <p className="pengumuman__tanggal">
                      <span className="pengumuman__hari">{hari}</span>
                      <span className="pengumuman__bulan">{bulan}</span>
                    </p>
                    <div className="pengumuman__teks">
                      <h3 className="baris__judul">{judul}</h3>
                      <p className="baris__meta">{meta}</p>
                    </div>
                  </article>
                ))}
              </section>
            )}

            {dokumen.length > 0 && (
              <section className="panel">
                <div className="panel__head">
                  <h2 className="tile__title">Dokumen Publik</h2>
                </div>
                {dokumen.map((judul) => (
                  <article key={judul} className="dokumen">
                    <span className="dokumen__ikon">
                      <Icon name="file-text-sm" />
                    </span>
                    <div className="dokumen__teks">
                      <h3 className="baris__judul">{judul}</h3>
                      <p className="baris__meta">PDF · Segera tersedia</p>
                    </div>
                  </article>
                ))}
              </section>
            )}

            <section className="ppid">
              <p className="overline overline--accent">PPID Pembantu</p>
              <h2 className="tile__title">Butuh informasi yang belum tersedia?</h2>
              <p className="ppid__desc">Ajukan permohonan informasi publik sesuai UU Keterbukaan Informasi Publik.</p>
              <Button label="Ajukan Permohonan" size="small" arrow href="/kontak" />
            </section>
          </aside>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
