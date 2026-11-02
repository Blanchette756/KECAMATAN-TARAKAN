import { Fragment, useEffect, useState } from 'react';
import { ambilPersyaratan, type DaftarPersyaratan } from '../api';
import { Icon, type IconName } from '../components/Icon';
import { SiteFooter } from '../components/SiteFooter';
import { SiteHeader } from '../components/SiteHeader';
import { Button, PageBanner, SectionHeading } from '../components/ui';
import { TAUTAN_WA } from '../data/kontak';
import { LAYANAN } from '../data/layanan';

const INFO: { ikon: IconName; judul: string; deskripsi: string }[] = [
  { ikon: 'tag-22', judul: 'Gratis, tanpa biaya', deskripsi: 'Seluruh layanan tidak dipungut biaya apa pun.' },
  { ikon: 'calendar-22', judul: 'Selesai maks. 1 hari kerja', deskripsi: 'Dihitung setelah seluruh persyaratan dinyatakan lengkap.' },
  { ikon: 'smartphone-22', judul: 'Ajukan secara online', deskripsi: 'Masuk dengan akun Google, unggah berkas, dan pantau statusnya.' },
];

const ALUR = [
  { judul: 'Masuk dengan Google', deskripsi: 'Pilih akun Google, lalu isi kode OTP yang dikirim ke WhatsApp Anda.' },
  { judul: 'Pilih layanan & unggah berkas', deskripsi: 'Unggah foto atau scan persyaratan sesuai layanan.' },
  { judul: 'Berkas diperiksa', deskripsi: 'Petugas mengecek kelengkapan. Jika kurang, Anda diminta memperbaiki.' },
  { judul: 'Validasi Kasi Tata Pemerintahan', deskripsi: 'Berkas diperiksa ulang dan diparaf.' },
  { judul: 'Tanda tangan Camat', deskripsi: 'Surat Anda ditandatangani Camat.' },
  { judul: 'Ambil surat', deskripsi: 'Surat siap diambil di kantor kecamatan. Bawa dokumen asli.' },
];

/** Catatan internal di data ("SP menulis ...") bukan untuk warga. */
const keteranganPublik = (keterangan?: string) => (keterangan && !keterangan.startsWith('SP menulis') ? keterangan : undefined);

function layananAwal() {
  const id = new URLSearchParams(window.location.search).get('layanan');
  return LAYANAN.find((layanan) => layanan.id === id)?.id ?? LAYANAN[0].id;
}

function DetailLayanan({ id, data, galat, denganJudul }: { id: string; data?: DaftarPersyaratan; galat: string | null; denganJudul: boolean }) {
  const { ikon, judul, deskripsi } = LAYANAN.find((layanan) => layanan.id === id)!;
  const adaFormat = data?.persyaratan.some((syarat) => syarat.keterangan?.startsWith('Format'));
  return (
    <div className="detail-layanan">
      {denganJudul && (
        <div className="detail-layanan__judul">
          <span className="detail-layanan__ikon">
            <Icon name={ikon} ukuran={28} />
          </span>
          <div>
            <h3 className="info-judul__teks">{judul}</h3>
            <p className="heading__desc">{deskripsi}</p>
          </div>
        </div>
      )}
      <div className="pil-baris">
        <span className="pil pil--aksen">Gratis</span>
        <span className="pil">Maks. 1 hari kerja*</span>
        <span className="pil">Ditandatangani Camat</span>
      </div>
      <hr className="garis only-desktop" />
      {galat && <p className="tracker__error">{galat}</p>}
      {!data && !galat && <p className="heading__desc">Memuat persyaratan…</p>}
      {data && (
        <>
          <h4 className="timeline__judul">Persyaratan ({data.persyaratan.length})</h4>
          <ol className="syarat">
            {data.persyaratan.map((syarat, urutan) => {
              const keterangan = keteranganPublik(syarat.keterangan);
              return (
                <li key={syarat.id_syarat}>
                  <span className="syarat__nomor">{urutan + 1}</span>
                  <div className="syarat__teks">
                    <p>{syarat.nama_syarat}</p>
                    {keterangan && <span className="syarat__tag">{keterangan}</span>}
                  </div>
                </li>
              );
            })}
          </ol>
        </>
      )}
      <p className="produk">
        <span className="only-desktop">Yang Anda terima:</span>
        <span className="only-mobile">Yang Anda terima</span> <strong>{judul}</strong>
      </p>
      <p className="baris__meta">*Dihitung setelah seluruh persyaratan dinyatakan lengkap oleh petugas.</p>
      <div className="detail-layanan__aksi">
        <Button label="Ajukan Online" arrow href={`/ajukan?layanan=${id}`} />
        {adaFormat && (
          <span title="Berkas belum tersedia">
            <Button label="Unduh Format Surat Keterangan Tukang" style="secondary" className="only-desktop" />
            <Button label="Unduh Format Surat Tukang" style="secondary" className="only-mobile" />
          </span>
        )}
      </div>
    </div>
  );
}

export function Pelayanan() {
  const [dipilih, setDipilih] = useState(layananAwal);
  const [semua, setSemua] = useState<Record<string, DaftarPersyaratan>>({});
  const [galat, setGalat] = useState<string | null>(null);

  useEffect(() => {
    Promise.all(LAYANAN.map(({ id }) => ambilPersyaratan(id)))
      .then((hasil) => setSemua(Object.fromEntries(hasil.map((data) => [data.id_layanan, data]))))
      .catch((error: Error) => setGalat(error.message));
  }, []);

  return (
    <>
      <SiteHeader aktif="Pelayanan" />
      <main>
        <PageBanner
          halaman="Pelayanan"
          overline={
            <>
              <span className="only-desktop">Layanan administrasi masyarakat</span>
              <span className="only-mobile">Layanan administrasi</span>
            </>
          }
          judul="Pelayanan Kecamatan Tarakan Timur"
          deskripsi={
            <>
              <span className="only-desktop">9 layanan administrasi kecamatan. Ajukan secara online: masuk, unggah berkas, lalu pantau statusnya sampai surat siap diambil.</span>
              <span className="only-mobile">Ajukan 9 layanan administrasi secara online, lalu pantau statusnya sampai surat siap diambil.</span>
            </>
          }
        />

        <section className="pelayanan-info">
          <div className="info-kartu">
            {INFO.map(({ ikon, judul, deskripsi }) => (
              <div className="info-item" key={judul}>
                <span className="info-item__ikon">
                  <Icon name={ikon} />
                </span>
                <div className="info-item__teks">
                  <h2 className="timeline__judul">{judul}</h2>
                  <p className="teks-sekunder">{deskripsi}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="alur">
          <SectionHeading
            overline="Cara mengajukan"
            judul="Alur Pelayanan"
            deskripsi={
              <>
                <span className="only-desktop">Enam langkah sederhana. Setiap langkah bisa dipantau di menu Lacak Status.</span>
                <span className="only-mobile">Enam langkah sederhana, bisa dipantau di menu Lacak Status.</span>
              </>
            }
          />
          <ol className="alur__langkah">
            {ALUR.map(({ judul, deskripsi }, urutan) => (
              <Fragment key={judul}>
                {urutan > 0 && (
                  <li className="alur__panah only-desktop" aria-hidden="true">
                    <Icon name="chevron-right-20" />
                  </li>
                )}
                <li className="alur__item">
                  <span className="alur__nomor">{urutan + 1}</span>
                  <div className="alur__teks">
                    <h3 className="timeline__judul">{judul}</h3>
                    <p className="tile__desc">{deskripsi}</p>
                  </div>
                </li>
              </Fragment>
            ))}
          </ol>
          <p className="catatan">
            <Icon name="alert-20" />
            <span>
              <span className="only-desktop">Jika berkas belum lengkap atau tidak sesuai, status berubah menjadi Perlu Perbaikan. Unggah ulang berkas yang diminta, lalu proses akan dilanjutkan.</span>
              <span className="only-mobile">Jika berkas kurang atau tidak sesuai, status menjadi Perlu Perbaikan. Unggah ulang berkas yang diminta.</span>
            </span>
          </p>
        </section>

        <section className="pilih-layanan" id="pilih-layanan">
          <SectionHeading
            overline="9 layanan utama"
            judul="Pilih Layanan"
            deskripsi={
              <>
                <span className="only-desktop">Pilih layanan untuk melihat persyaratan lengkap, lalu ajukan secara online.</span>
                <span className="only-mobile">Ketuk layanan untuk melihat persyaratan.</span>
              </>
            }
            tautan={
              <>
                <span className="only-desktop">Unduh Standar Pelayanan (PDF)</span>
                <span className="only-mobile">Unduh Standar Pelayanan</span>
              </>
            }
          />
          <div className="pilih-layanan__isi">
            <div className="pilih-layanan__daftar">
              {LAYANAN.map(({ id, ikon, judul }) => {
                const aktif = id === dipilih;
                return (
                  <Fragment key={id}>
                    <button type="button" className={`layanan-item${aktif ? ' layanan-item--aktif' : ''}`} aria-pressed={aktif} onClick={() => setDipilih(id)}>
                      <span className="layanan-item__ikon">
                        <Icon name={ikon} />
                      </span>
                      <span className="layanan-item__teks">
                        <span className="baris__judul">{judul}</span>
                        <span className="baris__meta">{semua[id] ? `${semua[id].persyaratan.length} persyaratan` : ' '}</span>
                      </span>
                      <Icon name={aktif ? 'chevron-primary-16' : 'chevron-16'} />
                    </button>
                    {aktif && (
                      <div className="only-mobile">
                        <DetailLayanan id={id} data={semua[id]} galat={galat} denganJudul={false} />
                      </div>
                    )}
                  </Fragment>
                );
              })}
            </div>
            <div className="only-desktop pilih-layanan__detail">
              <DetailLayanan id={dipilih} data={semua[dipilih]} galat={galat} denganJudul />
            </div>
          </div>
          <div className="bantuan">
            <div className="bantuan__teks">
              <h3 className="tile__title">Masih bingung soal persyaratan?</h3>
              <p className="ppid__desc">Tanya petugas lewat WhatsApp 0852-1168-6871 atau datang ke kantor kecamatan pada jam pelayanan.</p>
            </div>
            <Button label="Chat Petugas" style="accent" arrow href={TAUTAN_WA} luar className="bantuan__tombol" />
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
