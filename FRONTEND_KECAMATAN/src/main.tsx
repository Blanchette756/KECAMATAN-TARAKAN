import '@fontsource/inter/400.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/inter/800.css';
import { Component, StrictMode, useEffect, type JSX, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/tokens.css';
import './styles/halaman.css';
import './styles/portal.css';
import './styles/components.css';
import './styles/animasi.css';
import { pasangAnimasiMuncul } from './animasi';
import { Admin } from './pages/Admin';
import { Ajukan } from './pages/Ajukan';
import { Beranda } from './pages/Beranda';
import { DataMonografi } from './pages/DataMonografi';
import { InformasiPublik } from './pages/InformasiPublik';
import { KebijakanPrivasi } from './pages/KebijakanPrivasi';
import { Kontak } from './pages/Kontak';
import { Masuk } from './pages/Masuk';
import { MasukPetugas } from './pages/MasukPetugas';
import { Pelayanan } from './pages/Pelayanan';
import { PermohonanSaya } from './pages/PermohonanSaya';
import { Profil } from './pages/Profil';
import { ProfilKecamatan } from './pages/ProfilKecamatan';

const RUTE: Record<string, () => JSX.Element | null> = {
  '/profil-kecamatan': ProfilKecamatan,
  '/informasi-publik': InformasiPublik,
  '/pelayanan': Pelayanan,
  '/data-monografi': DataMonografi,
  '/kontak': Kontak,
  '/masuk': Masuk,
  '/masuk-petugas': MasukPetugas,
  '/ajukan': Ajukan,
  '/permohonan': PermohonanSaya,
  '/profil': Profil,
  '/kebijakan-privasi': KebijakanPrivasi,
  '/admin': Admin,
};

const Halaman = RUTE[window.location.pathname] ?? Beranda;

function Aplikasi() {
  // Tujuan tautan seperti /#layanan baru ada setelah React merender, jadi browser tidak bisa menggulir sendiri.
  useEffect(() => {
    document.getElementById(window.location.hash.slice(1))?.scrollIntoView({ behavior: 'instant' });
  }, []);
  return <Halaman />;
}

/**
 * Tanpa ini, satu galat saat menampilkan halaman membuat seluruh layar putih tanpa penjelasan.
 * Sekarang pengunjung mendapat pesan dan tombol muat ulang.
 */
class BatasGalat extends Component<{ children: ReactNode }, { gagal: boolean }> {
  state = { gagal: false };

  static getDerivedStateFromError() {
    return { gagal: true };
  }

  componentDidCatch(error: unknown) {
    console.error(error);
  }

  render() {
    if (!this.state.gagal) return this.props.children;
    return (
      <main style={{ maxWidth: 480, margin: '15vh auto', padding: '0 24px', fontFamily: 'Inter, system-ui, sans-serif', lineHeight: 1.5 }}>
        <h1 style={{ fontSize: 24, margin: '0 0 12px' }}>Halaman tidak dapat ditampilkan</h1>
        <p style={{ margin: '0 0 20px' }}>
          Terjadi gangguan saat memuat halaman ini. Muat ulang halaman. Bila masih sama, perbarui browser Anda atau hubungi petugas kecamatan lewat WhatsApp.
        </p>
        <button type="button" onClick={() => window.location.reload()} style={{ padding: '12px 20px', fontSize: 16, borderRadius: 999, border: 0, background: '#ffcc00', fontWeight: 700 }}>
          Muat ulang
        </button>{' '}
        <a href="/" style={{ marginLeft: 12 }}>
          Ke beranda
        </a>
      </main>
    );
  }
}

const akar = document.getElementById('root')!;
pasangAnimasiMuncul(akar);

createRoot(akar).render(
  <StrictMode>
    <BatasGalat>
      <Aplikasi />
    </BatasGalat>
  </StrictMode>,
);
