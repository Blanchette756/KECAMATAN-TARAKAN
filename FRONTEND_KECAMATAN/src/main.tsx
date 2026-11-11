import '@fontsource/inter/400.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/inter/800.css';
import { StrictMode, useEffect, type JSX } from 'react';
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

const akar = document.getElementById('root')!;
pasangAnimasiMuncul(akar);

createRoot(akar).render(
  <StrictMode>
    <Aplikasi />
  </StrictMode>,
);
