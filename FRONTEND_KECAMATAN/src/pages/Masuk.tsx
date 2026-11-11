import { useEffect, useRef, useState } from 'react';
import { ApiError, googleConfig, masukGoogle, masukTiruan } from '../api';
import { Icon } from '../components/Icon';
import { Galat } from '../components/portal';
import { SiteFooter } from '../components/SiteFooter';
import { SiteHeader } from '../components/SiteHeader';
import { WHATSAPP } from '../data/kontak';
import { muatGoogle } from '../google';
import { ambilSesi, simpanSesi, tujuanAman, type Pengguna } from '../sesi';

const KEUNGGULAN = ['Masuk dengan akun Google, tanpa membuat kata sandi baru', 'Ajukan 9 layanan administrasi dan unggah berkas dari HP', 'Pantau status: diperiksa, divalidasi, ditandatangani, selesai'];

/** Sesudah masuk: warga yang profilnya belum lengkap diarahkan ke Lengkapi Profil dulu. */
function lanjut(hasil: { token: string; user: Pengguna }) {
  simpanSesi(hasil);
  const tujuan = tujuanAman('/permohonan');
  window.location.assign(hasil.user.profil_lengkap ? tujuan : `/profil?ke=${encodeURIComponent(tujuan)}`);
}

export function Masuk() {
  const tombol = useRef<HTMLDivElement>(null);
  const [siap, setSiap] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);

  useEffect(() => {
    if (ambilSesi()) {
      window.location.replace(tujuanAman('/permohonan'));
      return;
    }
    let batal = false;
    (async () => {
      try {
        const { client_id } = await googleConfig();
        if (!client_id) throw new ApiError('Login Google belum diaktifkan. Hubungi petugas kecamatan.');
        const google = await muatGoogle();
        if (batal || !tombol.current) return;
        google.initialize({
          client_id,
          ux_mode: 'popup',
          callback: async ({ credential }) => {
            setGalat(null);
            try {
              lanjut(await masukGoogle(credential));
            } catch (error) {
              setGalat(error instanceof ApiError ? error.message : 'Gagal masuk.');
            }
          },
        });
        google.renderButton(tombol.current, { theme: 'outline', size: 'large', text: 'continue_with', shape: 'pill', width: 320, locale: 'id' });
        setSiap(true);
      } catch (error) {
        if (!batal) setGalat(error instanceof Error ? error.message : 'Tombol Google gagal dimuat.');
      }
    })();
    return () => {
      batal = true;
    };
  }, []);

  const masukDummy = async () => {
    try {
      lanjut(await masukTiruan('warga1@example.com'));
    } catch (error) {
      setGalat(error instanceof ApiError ? error.message : 'Gagal masuk.');
    }
  };

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
            <h1 className="masuk__judul">Masuk ke Portal Layanan</h1>
            <p className="teks-sekunder">Gunakan akun Google (Gmail) Anda. Tidak perlu membuat kata sandi dan tidak perlu mengunggah KTP untuk masuk.</p>
            <div ref={tombol} aria-busy={!siap} />
            {!siap && !galat && <p className="baris__meta">Memuat tombol Google…</p>}
            <Galat pesan={galat} />
            <div className="cara-masuk">
              <p className="baris__judul">Cara masuk</p>
              <p className="tile__desc">1. Pilih akun Google Anda</p>
              <p className="tile__desc">2. Saat pertama kali masuk, lengkapi NIK, nomor HP, dan alamat</p>
              <p className="tile__desc">3. Ajukan permohonan dan pantau statusnya</p>
            </div>
            <p className="baris__meta">
              Belum punya akun Google?{' '}
              <a className="tautan-polos" href="https://accounts.google.com/signup" target="_blank" rel="noreferrer">
                Buat akun Gmail
              </a>{' '}
              secara gratis, lalu kembali ke halaman ini.
            </p>
            <p className="baris__meta">
              Dengan masuk, Anda menyetujui <a className="tautan-polos" href="/kebijakan-privasi">Kebijakan Privasi</a>. Butuh bantuan? WhatsApp {WHATSAPP}
            </p>
            <p className="baris__meta">
              Petugas kecamatan? <a className="tautan-polos" href="/masuk-petugas">Masuk sebagai petugas</a>
            </p>
            {import.meta.env.DEV && (
              <button type="button" className="tautan-polos" onClick={masukDummy}>
                Mode pengembangan: masuk dengan akun dummy warga
              </button>
            )}
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
