import { useState, type FormEvent } from 'react';
import { Icon, type IconName } from '../components/Icon';
import { SiteFooter } from '../components/SiteFooter';
import { SiteHeader } from '../components/SiteHeader';
import { Button, InputField, PageBanner, SectionHeading, SelectField, TextareaField } from '../components/ui';
import { KELURAHAN } from '../data/kelurahan';
import { ALAMAT, TAUTAN_PETA, TAUTAN_WA } from '../data/kontak';

const INFO: { ikon: IconName; judul: string; isi: string }[] = [
  { ikon: 'map-pin-22', judul: 'Alamat Kantor', isi: ALAMAT },
  { ikon: 'phone-22', judul: 'Telepon', isi: '(0551) 22490 · WhatsApp 0852-1168-6871' },
  { ikon: 'mail-22', judul: 'Email', isi: 'kecamatan.tarakantimur@gmail.com' },
  { ikon: 'clock-22', judul: 'Jam Pelayanan', isi: 'Senin–Kamis 08.00–16.00 WITA · Jumat 08.00–11.00 WITA' },
  { ikon: 'globe-22', judul: 'Media Sosial', isi: 'Instagram · Facebook · YouTube [akun resmi]' },
];

const KATEGORI = ['Pertanyaan', 'Saran', 'Pengaduan Layanan'];

export function Kontak() {
  const [galat, setGalat] = useState<string | null>(null);

  // Backend belum punya penyimpanan pesan, jadi pesan diteruskan ke WhatsApp kecamatan.
  const kirim = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const isi = (nama: string) => String(form.get(nama) ?? '').trim();
    if (!isi('nama') || !isi('hp') || !isi('kategori') || !isi('subjek')) {
      setGalat('Lengkapi kolom bertanda *.');
      return;
    }
    if (!form.get('setuju')) {
      setGalat('Centang pernyataan sebelum mengirim.');
      return;
    }
    setGalat(null);
    const teks = [`[${isi('kategori')}] ${isi('subjek')}`, isi('pesan'), `Dari: ${isi('nama')} (${isi('hp')})`, isi('email')].filter(Boolean).join('\n\n');
    window.open(`${TAUTAN_WA}?text=${encodeURIComponent(teks)}`, '_blank', 'noreferrer');
  };

  return (
    <>
      <SiteHeader aktif="Kontak" />
      <main>
        <PageBanner
          halaman="Kontak"
          overline="Hubungi kami"
          judul="Kontak & Pengaduan"
          deskripsi="Sampaikan pertanyaan, saran, atau pengaduan layanan. Petugas menindaklanjuti pada hari dan jam kerja."
        />

        <section className="kontak">
          <div className="kontak__info">
            <div className="kontak__kartu">
              <h2 className="tile__title">Informasi Kontak</h2>
              {INFO.map(({ ikon, judul, isi }) => (
                <div className="info-item" key={judul}>
                  <span className="info-item__ikon">
                    <Icon name={ikon} />
                  </span>
                  <div className="info-item__teks">
                    <h3 className="timeline__judul">{judul}</h3>
                    <p className="teks-sekunder">{isi}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="kontak__peta">
              <Icon name="map-pin-32" />
              <p>Peta lokasi kantor (sematan Google Maps)</p>
              <Button label="Buka di Google Maps" style="accent" size="small" arrow href={TAUTAN_PETA} luar />
            </div>
          </div>

          <div className="kontak__form">
            <form className="form-pesan" onSubmit={kirim} noValidate>
              <div className="form-pesan__judul">
                <h2 className="info-judul__teks">Kirim Pesan atau Pengaduan</h2>
                <p className="tile__desc">Kolom bertanda * wajib diisi. Data Anda hanya digunakan untuk menindaklanjuti pesan ini.</p>
              </div>
              <div className="form-pesan__baris">
                <InputField label="Nama Lengkap *" name="nama" placeholder="Masukkan nama lengkap" />
                <InputField label="No. HP / WhatsApp *" name="hp" placeholder="Contoh: 0812xxxxxxxx" />
              </div>
              <div className="form-pesan__baris">
                <InputField label="Email" name="email" placeholder="nama@email.com" />
                <SelectField label="Kategori *" nama="kategori" placeholder="Pilih kategori pesan" pilihan={KATEGORI} />
              </div>
              <InputField label="Subjek *" name="subjek" placeholder="Ringkasan singkat pesan Anda" />
              <TextareaField label="Pesan" nama="pesan" placeholder="Tuliskan pesan, pertanyaan, atau pengaduan Anda" />
              <label className="persetujuan">
                <input type="checkbox" name="setuju" />
                <span>Saya menyatakan informasi yang saya sampaikan benar dan dapat dipertanggungjawabkan.</span>
              </label>
              {galat && (
                <p className="tracker__error" role="alert">
                  {galat}
                </p>
              )}
              <Button label="Kirim Pesan" arrow type="submit" className="form-pesan__kirim" />
            </form>
            <a className="saluran" href="https://www.lapor.go.id" target="_blank" rel="noreferrer">
              <span className="saluran__ikon">
                <Icon name="megaphone" />
              </span>
              <span className="pengumuman__teks">
                <span className="baris__judul">Pengaduan nasional melalui SP4N-LAPOR!</span>
                <span className="tile__desc teks-sekunder">Sampaikan pengaduan pelayanan publik di lapor.go.id.</span>
              </span>
            </a>
          </div>
        </section>

        <section className="section section--page" id="kontak-kelurahan">
          <SectionHeading overline="Kantor kelurahan" judul="Kontak Kelurahan" deskripsi={<span className="only-desktop">Hubungi kantor kelurahan untuk layanan administrasi tingkat kelurahan.</span>} />
          <div className="wilayah-grid">
            {KELURAHAN.map((nama) => (
              <article className="tile tile--auto" key={nama}>
                <span className="tile__icon">
                  <Icon name="map-pin-md" />
                </span>
                <h3 className="tile__title">Kelurahan {nama}</h3>
                <p className="tile__desc">
                  Alamat: [alamat kantor]
                  <br />
                  Telepon: [nomor telepon]
                </p>
                <a className="link" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`Kantor Kelurahan ${nama} Tarakan`)}`} target="_blank" rel="noreferrer">
                  Petunjuk arah
                </a>
              </article>
            ))}
            <div className="ppid">
              <p className="overline overline--accent">Bantuan cepat</p>
              <h3 className="tile__title">Tanya layanan lewat WhatsApp</h3>
              <p className="ppid__desc">WhatsApp layanan: 0852-1168-6871</p>
              <Button label="Chat Petugas" style="accent" size="small" arrow href={TAUTAN_WA} luar />
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
