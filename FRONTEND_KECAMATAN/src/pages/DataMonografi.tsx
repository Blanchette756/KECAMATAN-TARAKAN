import { useState, type CSSProperties } from 'react';
import { SiteFooter } from '../components/SiteFooter';
import { SiteHeader } from '../components/SiteHeader';
import { PageBanner, SectionHeading, SelectField, StatCard } from '../components/ui';
import { KELURAHAN } from '../data/kelurahan';
import {
  angka,
  desimal,
  MONOGRAFI,
  PENDUDUK_LAKI,
  PENDUDUK_PEREMPUAN,
  persen,
  SUMBER_MONOGRAFI,
  TAHUN_MONOGRAFI,
  TOTAL_LUAS,
  TOTAL_PENDUDUK,
} from '../data/monografi';

const KOLOM = ['Luas (km²)', 'Penduduk (jiwa)', 'Persentase', 'Kepadatan (jiwa/km²)'];
const PENDUDUK_TERBANYAK = Math.max(...Object.values(MONOGRAFI).map((k) => k.penduduk));
const PERSEN_LAKI = (PENDUDUK_LAKI / (PENDUDUK_LAKI + PENDUDUK_PEREMPUAN)) * 100;

const nilaiKolom = (luas: number, penduduk: number) => [desimal(luas), angka(penduduk), persen((penduduk / TOTAL_PENDUDUK) * 100), angka(penduduk / luas)];

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
            <SelectField nama="periode" pilihan={[`Periode: Tahun ${TAHUN_MONOGRAFI}`]} />
            <SelectField nama="kelurahan" placeholder="Semua kelurahan" pilihan={KELURAHAN} nilai={kelurahan} onUbah={setKelurahan} />
          </div>
        </div>

        <section className="section section--demografi section--ringkasan">
          <SectionHeading overline="Ringkasan" judul="Data Demografi" deskripsi={`Data tahun ${TAHUN_MONOGRAFI} • Sumber: ${SUMBER_MONOGRAFI}`} />
          <div className="stat-row">
            <StatCard angka={angka(TOTAL_PENDUDUK)} satuan="Jiwa" label="Jumlah Penduduk" />
            <StatCard angka={desimal(TOTAL_LUAS)} satuan="km²" label="Luas Wilayah" />
            <StatCard angka="7" satuan="Kelurahan" label="Jumlah Kelurahan" />
            <StatCard angka={angka(TOTAL_PENDUDUK / TOTAL_LUAS)} satuan="Jiwa/km²" label="Kepadatan Penduduk" />
          </div>
        </section>

        <section className="grafik">
          <div className="grafik__kartu">
            <div className="grafik__judul">
              <h2 className="tile__title">Penduduk per Kelurahan</h2>
              <p className="baris__meta">Jumlah jiwa tahun {TAHUN_MONOGRAFI}.</p>
            </div>
            {baris.map((nama) => (
              <div className="batang" key={nama}>
                <span className="batang__nama">{nama}</span>
                <span className="batang__jalur">
                  <span className="batang__isi" style={{ width: `${(MONOGRAFI[nama].penduduk / PENDUDUK_TERBANYAK) * 100}%` }} />
                </span>
                <span className="batang__nilai">{angka(MONOGRAFI[nama].penduduk)}</span>
              </div>
            ))}
          </div>
          <div className="grafik__kartu grafik__kartu--donat">
            <div className="grafik__judul">
              <h2 className="tile__title">Komposisi Jenis Kelamin</h2>
              <p className="baris__meta">Persentase penduduk laki-laki dan perempuan se-kecamatan.</p>
            </div>
            <div className="donat">
              <span className="donat__cincin donat__cincin--isi" style={{ '--laki': `${PERSEN_LAKI}%` } as CSSProperties}>
                {angka(TOTAL_PENDUDUK)}
              </span>
              <ul className="donat__legenda">
                <li>
                  <span className="titik titik--primer" />
                  Laki-laki <strong>{persen(PERSEN_LAKI)}</strong> ({angka(PENDUDUK_LAKI)})
                </li>
                <li>
                  <span className="titik titik--aksen" />
                  Perempuan <strong>{persen(100 - PERSEN_LAKI)}</strong> ({angka(PENDUDUK_PEREMPUAN)})
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
                <span className="only-desktop">Luas daratan, jumlah penduduk, dan kepadatan setiap kelurahan.</span>
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
                    {nilaiKolom(MONOGRAFI[nama].luas, MONOGRAFI[nama].penduduk).map((nilai, urutan) => (
                      <td key={KOLOM[urutan]}>{nilai}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
              {!kelurahan && (
                <tfoot>
                  <tr>
                    <th scope="row">Total Kecamatan Tarakan Timur</th>
                    {nilaiKolom(TOTAL_LUAS, TOTAL_PENDUDUK).map((nilai, urutan) => (
                      <td key={KOLOM[urutan]}>{nilai}</td>
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
                <dd>{angka(MONOGRAFI[nama].penduduk)} jiwa</dd>
              </div>
            ))}
          </dl>
          <p className="baris__meta">
            Sumber: {SUMBER_MONOGRAFI} · Periode: Tahun {TAHUN_MONOGRAFI}
          </p>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
