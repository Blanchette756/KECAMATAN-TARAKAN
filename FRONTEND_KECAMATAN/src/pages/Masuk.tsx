import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { ApiError, masukTiruan } from '../api';
import { Icon } from '../components/Icon';
import { Galat } from '../components/portal';
import { SiteFooter } from '../components/SiteFooter';
import { SiteHeader } from '../components/SiteHeader';
import { Button } from '../components/ui';
import { ambilSesi, inisial, simpanSesi, type Pengguna } from '../sesi';

const KEUNGGULAN = ['Masuk cepat dengan akun Google, aman dengan kode OTP WhatsApp', 'Ajukan 9 layanan administrasi dan unggah berkas dari HP', 'Pantau status: diperiksa, divalidasi, ditandatangani, selesai'];
const LANGKAH = ['Akun Google', 'Nomor WhatsApp', 'Kode OTP'];
const AKUN_CONTOH = 'warga1@example.com';

function tujuanSetelahMasuk() {
  const tujuan = new URLSearchParams(window.location.search).get('ke');
  // Hanya jalur di dalam situs, supaya tautan masuk tidak bisa dipakai mengalihkan ke situs lain.
  return tujuan?.startsWith('/') && !tujuan.startsWith('//') ? tujuan : '/permohonan';
}

function Penanda({ aktif }: { aktif: number }) {
  return (
    <>
      <ol className="langkah only-desktop">
        {LANGKAH.map((judul, urutan) => (
          <li key={judul} className={`langkah__item${urutan < aktif ? ' langkah__item--selesai' : urutan === aktif ? ' langkah__item--aktif' : ''}`}>
            <span className="langkah__nomor">{urutan < aktif ? <Icon name="check" /> : urutan + 1}</span>
            {judul}
          </li>
        ))}
      </ol>
      <div className="only-mobile langkah-hp">
        <p className="baris__meta">
          Langkah {aktif + 1} dari 3 · {LANGKAH[aktif]}
        </p>
        <div className="progres">
          {LANGKAH.map((judul, urutan) => (
            <span key={judul} className={urutan <= aktif ? 'progres__isi' : ''} />
          ))}
        </div>
      </div>
    </>
  );
}

export function Masuk() {
  const [langkah, setLangkah] = useState(0);
  const [akun, setAkun] = useState<{ token: string; user: Pengguna } | null>(null);
  const [nomor, setNomor] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [sisa, setSisa] = useState(45);
  const [galat, setGalat] = useState<string | null>(null);
  const kotak = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (ambilSesi()) window.location.replace(tujuanSetelahMasuk());
  }, []);

  useEffect(() => {
    if (langkah !== 2 || sisa === 0) return;
    const pewaktu = setTimeout(() => setSisa(sisa - 1), 1000);
    return () => clearTimeout(pewaktu);
  }, [langkah, sisa]);

  const lanjutGoogle = async () => {
    setGalat(null);
    try {
      setAkun(await masukTiruan(AKUN_CONTOH));
      setLangkah(1);
    } catch (error) {
      setGalat(error instanceof ApiError ? error.message : 'Gagal masuk.');
    }
  };

  const kirimOtp = (event: FormEvent) => {
    event.preventDefault();
    if (nomor.replace(/\D/g, '').length < 10) {
      setGalat('Masukkan nomor WhatsApp yang valid.');
      return;
    }
    setGalat(null);
    setLangkah(2);
  };

  const isiOtp = (urutan: number, nilai: string) => {
    const angka = nilai.replace(/\D/g, '').slice(-1);
    setOtp(otp.map((lama, i) => (i === urutan ? angka : lama)));
    if (angka) kotak.current[urutan + 1]?.focus();
  };

  const mundurOtp = (urutan: number, event: KeyboardEvent) => {
    if (event.key === 'Backspace' && !otp[urutan]) kotak.current[urutan - 1]?.focus();
  };

  const verifikasi = (event: FormEvent) => {
    event.preventDefault();
    if (otp.join('').length < 6 || !akun) {
      setGalat('Isi 6 digit kode OTP.');
      return;
    }
    simpanSesi(akun);
    window.location.assign(tujuanSetelahMasuk());
  };

  const nomorTersamar = nomor.replace(/\D/g, '').replace(/^(\d{4})\d+(\d{4})$/, '$1-xxxx-$2');

  return (
    <>
      <SiteHeader aktif="" />
      <main className="masuk">
        <div className="masuk__kartu">
          <aside className="masuk__sisi only-desktop">
            <div className="masuk__atas">
              <p className="overline overline--accent">Portal layanan online</p>
              <h2 className="info-judul__teks">Satu akun Google untuk semua layanan kecamatan</h2>
              <ul className="masuk__daftar">
                {KEUNGGULAN.map((isi) => (
                  <li key={isi}>
                    <span className="centang">
                      <Icon name="check" ukuran={12} />
                    </span>
                    {isi}
                  </li>
                ))}
              </ul>
            </div>
            <p className="masuk__kaki">Gratis · Selesai maks. 1 hari kerja setelah berkas lengkap</p>
          </aside>

          <div className="masuk__form">
            <Penanda aktif={langkah} />

            {langkah === 0 && (
              <>
                <h1 className="masuk__judul">Masuk ke Portal Layanan</h1>
                <p className="teks-sekunder">Gunakan akun Google (Gmail) Anda. Tidak perlu membuat kata sandi dan tidak perlu mengunggah KTP untuk masuk.</p>
                <button type="button" className="tombol-google" onClick={lanjutGoogle}>
                  <span className="tombol-google__ikon" aria-hidden="true" />
                  Lanjutkan dengan Google
                </button>
                <Galat pesan={galat} />
                <div className="cara-masuk">
                  <p className="baris__judul">Cara masuk</p>
                  <p className="tile__desc">1. Pilih akun Google Anda</p>
                  <p className="tile__desc">2. Masukkan nomor WhatsApp</p>
                  <p className="tile__desc">3. Isi kode OTP yang dikirim ke WhatsApp</p>
                </div>
                <p className="baris__meta">Belum punya akun Google? Buat akun Gmail secara gratis, lalu kembali ke halaman ini.</p>
                <p className="baris__meta">Butuh bantuan? WhatsApp 0852-1168-6871</p>
                <p className="baris__meta">
                  Petugas kecamatan? <a className="tautan-polos" href="/masuk-petugas">Masuk sebagai petugas</a>
                </p>
              </>
            )}

            {langkah === 1 && akun && (
              <form className="masuk__isi" onSubmit={kirimOtp} noValidate>
                <div className="akun-terpilih">
                  <span className="akun__inisial">{inisial(akun.user.nama_lengkap)}</span>
                  <span className="akun__teks">
                    <span className="akun__nama">{akun.user.nama_lengkap}</span>
                    <span className="baris__meta">{akun.user.email}</span>
                  </span>
                  <button type="button" className="tautan-polos" onClick={() => setLangkah(0)}>
                    Ganti akun
                  </button>
                </div>
                <h1 className="masuk__judul">Verifikasi Nomor WhatsApp</h1>
                <p className="teks-sekunder">Kami akan mengirim kode OTP ke WhatsApp Anda. Nomor ini juga dipakai untuk mengabarkan status permohonan.</p>
                <label className="field">
                  <span className="field__label">Nomor WhatsApp</span>
                  <input className="field__input" name="hp" inputMode="tel" placeholder="Contoh: 0812 3456 7890" value={nomor} onChange={(event) => setNomor(event.target.value)} />
                </label>
                <Galat pesan={galat} />
                <Button label="Kirim Kode OTP ke WhatsApp" arrow type="submit" />
                <p className="catatan catatan--kecil">
                  <Icon name="lock" />
                  <span>Sudah pernah masuk? Langkah ini dilewati dan kode langsung dikirim ke nomor yang tersimpan.</span>
                </p>
              </form>
            )}

            {langkah === 2 && akun && (
              <form className="masuk__isi" onSubmit={verifikasi} noValidate>
                <button type="button" className="tautan-polos tautan-polos--kembali" onClick={() => setLangkah(1)}>
                  ‹ Ubah nomor WhatsApp
                </button>
                <h1 className="masuk__judul">Masukkan Kode OTP</h1>
                <p className="teks-sekunder">
                  Kode 6 digit telah dikirim ke WhatsApp {nomorTersamar} untuk akun {akun.user.email}.
                </p>
                <div className="otp">
                  {otp.map((angka, urutan) => (
                    <input
                      key={urutan}
                      ref={(el) => {
                        kotak.current[urutan] = el;
                      }}
                      className="otp__kotak"
                      inputMode="numeric"
                      maxLength={1}
                      aria-label={`Digit ${urutan + 1}`}
                      value={angka}
                      onChange={(event) => isiOtp(urutan, event.target.value)}
                      onKeyDown={(event) => mundurOtp(urutan, event)}
                    />
                  ))}
                </div>
                <p className="tile__desc">
                  Belum menerima kode? <strong>{sisa > 0 ? `Kirim ulang dalam 00:${String(sisa).padStart(2, '0')}` : 'Kirim ulang'}</strong>
                </p>
                <p className="catatan catatan--kecil">
                  <Icon name="alert-20" />
                  <span>Mode demo: WhatsApp belum tersambung, jadi isi 6 angka apa saja.</span>
                </p>
                <Galat pesan={galat} />
                <Button label="Verifikasi & Masuk" arrow type="submit" />
                <p className="baris__meta">Jangan berikan kode OTP kepada siapa pun, termasuk petugas.</p>
              </form>
            )}
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
