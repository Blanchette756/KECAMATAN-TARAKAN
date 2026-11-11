import { useEffect, useState, type FormEvent } from 'react';
import { ApiError, masukPetugas, masukTiruan } from '../api';
import { Galat, useKunciKirim } from '../components/portal';
import { SiteFooter } from '../components/SiteFooter';
import { SiteHeader } from '../components/SiteHeader';
import { Button, SelectField } from '../components/ui';
import { ambilSesi, simpanSesi } from '../sesi';

// Figma tidak punya layar masuk petugas. Akun petugas dibuat Petugas Pelayanan lewat menu Kelola Akun.

// Hanya saat `npm run dev`: masuk cepat dengan akun dummy. Backend production juga menolaknya.
const AKUN_DEMO: Record<string, string> = {
  'Petugas Pelayanan': 'admin@example.com',
  'Kasi Tata Pemerintahan': 'kasi.tapem@example.com',
  Camat: 'camat@example.com',
};

export function MasukPetugas() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [galat, setGalat] = useState<string | null>(null);
  const { mengirim, mulai, lepas } = useKunciKirim();

  useEffect(() => {
    const sesi = ambilSesi();
    if (sesi && sesi.user.role !== 'WARGA') window.location.replace('/admin');
  }, []);

  const masuk = async (event: FormEvent) => {
    event.preventDefault();
    if (!username.trim() || !password) return setGalat('Isi username dan password.');
    if (!mulai()) return;
    setGalat(null);
    try {
      simpanSesi(await masukPetugas(username.trim(), password));
      window.location.assign('/admin');
    } catch (error) {
      setGalat(error instanceof ApiError ? error.message : 'Gagal masuk.');
      setPassword('');
      lepas();
    }
  };

  const masukDemo = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const peran = String(new FormData(event.currentTarget).get('peran'));
    try {
      simpanSesi(await masukTiruan(AKUN_DEMO[peran]));
      window.location.assign('/admin');
    } catch (error) {
      setGalat(error instanceof ApiError ? error.message : 'Gagal masuk.');
    }
  };

  return (
    <>
      <SiteHeader aktif="" />
      <main className="masuk">
        <form className="masuk__form masuk__form--tunggal" onSubmit={masuk} noValidate>
          <h1 className="masuk__judul">Masuk Petugas</h1>
          <p className="teks-sekunder">Khusus petugas Kantor Kecamatan Tarakan Timur.</p>
          <label className="field">
            <span className="field__label">Username</span>
            <input
              className="field__input"
              name="username"
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              value={username}
              onChange={(event) => setUsername(event.target.value)}
            />
          </label>
          <label className="field">
            <span className="field__label">Password</span>
            <input className="field__input" name="password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>
          <Galat pesan={galat} />
          <Button label={mengirim ? 'Memeriksa…' : 'Masuk'} arrow={!mengirim} type="submit" disabled={mengirim} />
          <p className="baris__meta">Lupa password atau belum punya akun? Hubungi Petugas Pelayanan kecamatan.</p>
        </form>

        {import.meta.env.DEV && (
          <form className="masuk__form masuk__form--tunggal" onSubmit={masukDemo}>
            <p className="baris__judul">Mode pengembangan</p>
            <p className="baris__meta">Masuk cepat dengan akun dummy. Tidak muncul di situs yang sudah di-deploy.</p>
            <SelectField label="Peran" nama="peran" pilihan={Object.keys(AKUN_DEMO)} />
            <Button label="Masuk dengan akun dummy" style="secondary" type="submit" />
          </form>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
