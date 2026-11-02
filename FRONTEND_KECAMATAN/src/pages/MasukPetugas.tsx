import { useState, type FormEvent } from 'react';
import { ApiError, masukTiruan } from '../api';
import { Galat } from '../components/portal';
import { SiteFooter } from '../components/SiteFooter';
import { SiteHeader } from '../components/SiteHeader';
import { Button, SelectField } from '../components/ui';
import { simpanSesi } from '../sesi';

// Figma tidak punya layar masuk petugas. Layar ini khusus login tiruan pada tahap demo.
const AKUN: Record<string, string> = {
  'Petugas Pelayanan': 'admin@example.com',
  'Kasi Tata Pemerintahan': 'kasi.tapem@example.com',
  Camat: 'camat@example.com',
};

export function MasukPetugas() {
  const [galat, setGalat] = useState<string | null>(null);

  const masuk = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const peran = String(new FormData(event.currentTarget).get('peran'));
    try {
      simpanSesi(await masukTiruan(AKUN[peran]));
      window.location.assign('/admin');
    } catch (error) {
      setGalat(error instanceof ApiError ? error.message : 'Gagal masuk.');
    }
  };

  return (
    <>
      <SiteHeader aktif="" />
      <main className="masuk">
        <form className="masuk__form masuk__form--tunggal" onSubmit={masuk}>
          <h1 className="masuk__judul">Masuk Petugas</h1>
          <p className="teks-sekunder">Mode demo: pilih peran untuk mencoba alur pemeriksaan berkas.</p>
          <SelectField label="Peran" nama="peran" pilihan={Object.keys(AKUN)} />
          <Galat pesan={galat} />
          <Button label="Masuk" arrow type="submit" />
        </form>
      </main>
      <SiteFooter />
    </>
  );
}
