import { useState, type FormEvent } from 'react';
import { ApiError, lacakPengajuan, type HasilLacak } from '../api';
import { Icon } from './Icon';
import { Button, InputField } from './ui';

const POLA_KODE = /^[A-Za-z]{3}-[0-9]{8}-[A-Za-z0-9]{4}$/;
const POLA_HP = /^[0-9]{4}$/;

const formatWaktu = (iso: string) =>
  new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Makassar' }).format(new Date(iso)) + ' WITA';

export function LacakStatus() {
  const [memuat, setMemuat] = useState(false);
  const [hasil, setHasil] = useState<HasilLacak | null>(null);
  const [galat, setGalat] = useState<string | null>(null);

  async function kirim(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const kode = String(form.get('no_registrasi')).trim();
    const hp = String(form.get('last_4_digit_hp')).trim();

    setHasil(null);
    if (!POLA_KODE.test(kode)) return setGalat('Format kode tidak sesuai. Contoh: REQ-20261102-K7Q2.');
    if (!POLA_HP.test(hp)) return setGalat('Masukkan 4 digit terakhir nomor HP.');

    setGalat(null);
    setMemuat(true);
    try {
      setHasil(await lacakPengajuan(kode, hp));
    } catch (error) {
      setGalat(error instanceof ApiError ? error.message : 'Terjadi kesalahan. Coba lagi beberapa saat lagi.');
    } finally {
      setMemuat(false);
    }
  }

  return (
    <div className="tracker">
      <div className="tracker__head">
        <div className="tracker__text">
          <h2 className="tracker__title">Lacak Status Permohonan</h2>
          <p className="tracker__desc">Pantau proses layanan Anda secara cepat dan aman.</p>
        </div>
        <p className="tracker__secure">
          <Icon name="lock" />
          Data Anda terlindungi
        </p>
      </div>

      <form className="tracker__form" onSubmit={kirim} noValidate>
        <InputField label="Kode Booking" name="no_registrasi" placeholder="Contoh: REQ-20261102-K7Q2" />
        <InputField label="4 Digit Terakhir No. HP" name="last_4_digit_hp" placeholder="Contoh: 1234" inputMode="numeric" maxLength={4} />
        <Button label={memuat ? 'Memeriksa…' : 'Cek Status'} type="submit" disabled={memuat} />
      </form>

      {galat && (
        <p className="tracker__error" role="alert">
          {galat}
        </p>
      )}

      {hasil && (
        <div className="result" aria-live="polite">
          <p className="overline">{hasil.no_registrasi}</p>
          <h3 className="tile__title">{hasil.nama_layanan}</h3>
          <p className="result__status">{hasil.label_status}</p>
          {hasil.pesan && <p className="tracker__desc">{hasil.pesan}</p>}
          <ol className="result__history">
            {hasil.riwayat.map((langkah) => (
              <li key={`${langkah.status}-${langkah.waktu}`}>
                <span>{langkah.label}</span>
                <span className="tracker__desc">{formatWaktu(langkah.waktu)}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
