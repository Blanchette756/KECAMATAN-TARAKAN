import { useState } from 'react';
import { SiteFooter } from '../components/SiteFooter';
import { SiteHeader } from '../components/SiteHeader';
import { Button, PageBanner, SectionHeading, SelectField, StatCard } from '../components/ui';
import { KELURAHAN } from '../data/kelurahan';

const KOLOM = ['Luas Wilayah (km²)', 'Jumlah Penduduk', 'Jumlah KK', 'Jumlah RT', 'Kepadatan (Jiwa/km²)'];
const KOSONG = '—';

// Data per kelurahan belum ada; tanda "—" mengikuti Figma sampai data monografi resmi tersedia.
export function DataMonografi() {
  const [kelurahan, setKelurahan] = useState('');
  const baris = kelurahan ? [kelurahan] : KELURAHAN;

  return (
    <>
      <SiteHeader aktif="Data Monografi" />
      <main>
        <PageBanner
          halaman="Data Monografi"
          overline="Tarakan Timur dalam angka"
          judul="Data Monografi Kecamatan"
          deskripsi="Ringkasan data kependudukan dan wilayah Kecamatan Tarakan Timur beserta rincian per kelurahan."
        />

        <div className="toolbar toolbar--filter">
          <div className="filter">
            <SelectField nama="periode" pilihan={['Periode: Semester I 2026']} />
            <SelectField nama="kelurahan" placeholder="Semua kelurahan" pilihan={KELURAHAN} nilai={kelurahan} onUbah={setKelurahan} />
          </div>
          <div className="filter__unduh" title="Berkas belum tersedia sampai data resmi diisi">
            <Button label="Unduh PDF" style="secondary" className="only-desktop" />
            <Button label="Unduh Data (XLSX)" />
          </div>
        </div>

        <section className="section section--demografi section--ringkasan">
          <SectionHeading overline="Ringkasan" judul="Data Demografi" deskripsi="Data publik semester I tahun 2026 • Sumber: Kecamatan Tarakan Timur" />
          <div className="stat-row">
            <StatCard angka="82.743" satuan="Jiwa" label="Jumlah Penduduk" />
            <StatCard angka="58,20" satuan="km²" label="Luas Wilayah" />
            <StatCard angka="7" satuan="Kelurahan" label="Jumlah Kelurahan" />
            <StatCard angka={KOSONG} satuan="KK" label="Jumlah Kepala Keluarga" />
          </div>
        </section>

        <section className="grafik">
          <div className="grafik__kartu">
            <div className="grafik__judul">
              <h2 className="tile__title">Penduduk per Kelurahan</h2>
              <p className="baris__meta">Grafik terisi otomatis dari data monografi resmi.</p>
            </div>
            {baris.map((nama) => (
              <div className="batang" key={nama}>
                <span className="batang__nama">{nama}</span>
                <span className="batang__jalur" />
                <span className="batang__nilai">{KOSONG}</span>
              </div>
            ))}
          </div>
          <div className="grafik__kartu grafik__kartu--donat">
            <div className="grafik__judul">
              <h2 className="tile__title">Komposisi Jenis Kelamin</h2>
              <p className="baris__meta">Persentase penduduk laki-laki dan perempuan.</p>
            </div>
            <div className="donat">
              <span className="donat__cincin">{KOSONG}</span>
              <ul className="donat__legenda">
                <li>
                  <span className="titik titik--primer" />
                  Laki-laki <strong>— %</strong>
                </li>
                <li>
                  <span className="titik titik--aksen" />
                  Perempuan <strong>— %</strong>
                </li>
              </ul>
            </div>
          </div>
        </section>

        <section className="section rincian">
          <SectionHeading
            overline="Data per kelurahan"
            judul="Rincian Wilayah"
            deskripsi={
              <>
                <span className="only-desktop">Angka diisi dari data monografi resmi semester berjalan.</span>
                <span className="only-mobile">Jumlah penduduk per kelurahan.</span>
              </>
            }
          />
          <div className="tabel-bungkus only-desktop">
            <table className="tabel">
              <thead>
                <tr>
                  <th scope="col">Kelurahan</th>
                  {KOLOM.map((kolom) => (
                    <th scope="col" key={kolom}>
                      {kolom}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {baris.map((nama) => (
                  <tr key={nama}>
                    <th scope="row">{nama}</th>
                    {KOLOM.map((kolom) => (
                      <td key={kolom}>{KOSONG}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
              {!kelurahan && (
                <tfoot>
                  <tr>
                    <th scope="row">Total Kecamatan Tarakan Timur</th>
                    {KOLOM.map((kolom) => (
                      <td key={kolom}>{KOSONG}</td>
                    ))}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
          <dl className="rincian__mobile only-mobile">
            {baris.map((nama) => (
              <div className="fakta__baris" key={nama}>
                <dt>{nama}</dt>
                <dd>— jiwa</dd>
              </div>
            ))}
          </dl>
          <p className="baris__meta">Sumber: [instansi sumber data] · Periode: Semester I 2026 · Diperbarui: [tanggal]</p>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
