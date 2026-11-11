import { useEffect, useState, type FormEvent } from 'react';
import { ambilKelurahan, ambilProfil, ApiError, simpanProfil, type InputProfil } from '../api';
import { Galat, Kartu, useKunciKirim } from '../components/portal';
import { SiteFooter } from '../components/SiteFooter';
import { SiteHeader } from '../components/SiteHeader';
import { Button } from '../components/ui';
import { ambilSesi, simpanSesi, tujuanAman } from '../sesi';

const KOSONG: InputProfil = { nama_lengkap: '', nik: '', no_hp: '', alamat: '', id_kelurahan: '' };

/** Data pemohon untuk surat. Wajib diisi warga sebelum mengajukan permohonan pertama. */
export function Profil() {
  const sesi = ambilSesi();
  const [isian, setIsian] = useState<InputProfil | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [kelurahan, setKelurahan] = useState<{ id_kelurahan: string; nama: string }[]>([]);
  const [galat, setGalat] = useState<string | null>(null);
  const { mengirim, mulai, lepas } = useKunciKirim();
  const baru = sesi?.user.profil_lengkap === false;

  useEffect(() => {
    if (!sesi) return window.location.replace('/masuk?ke=/profil');
    if (sesi.user.role !== 'WARGA') return window.location.replace('/admin');
    Promise.all([ambilProfil(), ambilKelurahan()])
      .then(([p, k]) => {
        setEmail(p.email);
        setKelurahan(k);
        setIsian({ nama_lengkap: p.nama_lengkap, nik: p.nik ?? '', no_hp: p.no_hp ?? '', alamat: p.alamat ?? '', id_kelurahan: p.id_kelurahan ?? '' });
      })
      .catch((error: Error) => {
        setGalat(error.message);
        setIsian(KOSONG);
      });
  }, []);

  if (!sesi) return null;

  const ubah = (kunci: keyof InputProfil, nilai: string) => isian && setIsian({ ...isian, [kunci]: nilai });

  const simpan = async (event: FormEvent) => {
    event.preventDefault();
    if (!isian) return;
    const kosong = (Object.keys(isian) as (keyof InputProfil)[]).filter((k) => !isian[k].trim());
    if (kosong.length > 0) return setGalat('Lengkapi semua isian bertanda *.');
    if (!/^[0-9]{16}$/.test(isian.nik.replace(/\s/g, ''))) return setGalat('NIK harus 16 angka sesuai KTP.');
    if (!mulai()) return;
    setGalat(null);
    try {
      const { user } = await simpanProfil(isian);
      simpanSesi({ token: sesi.token, user });
      window.location.assign(tujuanAman('/permohonan'));
    } catch (error) {
      setGalat(error instanceof ApiError ? error.message : 'Gagal menyimpan profil.');
      lepas();
    }
  };

  return (
    <>
      <SiteHeader aktif="Pelayanan" />
      <main className="portal">
        <div className="kepala">
          <div className="kepala__baris">
            <div>
              <h1 className="kepala__judul">{baru ? 'Lengkapi Profil' : 'Profil Saya'}</h1>
              <p className="heading__desc">
                {baru ? 'Satu kali saja. Data ini dipakai untuk surat yang Anda ajukan, jadi isi sesuai KTP.' : 'Data pemohon untuk surat. Pastikan sesuai KTP.'}
              </p>
            </div>
          </div>
        </div>
        <div className="portal__isi">
          <Kartu>
            {!isian ? (
              <p className="heading__desc">Memuat…</p>
            ) : (
              <form className="berita-form" onSubmit={simpan} noValidate>
                <label className="field">
                  <span className="field__label">Akun Google</span>
                  <input className="field__input" value={email ?? ''} readOnly />
                </label>
                <label className="field">
                  <span className="field__label">Nama lengkap sesuai KTP *</span>
                  <input className="field__input" name="nama" autoComplete="name" maxLength={120} value={isian.nama_lengkap} onChange={(event) => ubah('nama_lengkap', event.target.value)} />
                </label>
                <label className="field">
                  <span className="field__label">NIK *</span>
                  <input className="field__input" name="nik" inputMode="numeric" maxLength={20} placeholder="16 angka di KTP" value={isian.nik} onChange={(event) => ubah('nik', event.target.value)} />
                </label>
                <label className="field">
                  <span className="field__label">Nomor HP/WhatsApp *</span>
                  <input className="field__input" name="hp" inputMode="tel" autoComplete="tel" maxLength={20} placeholder="Contoh: 0812 3456 7890" value={isian.no_hp} onChange={(event) => ubah('no_hp', event.target.value)} />
                  <span className="baris__meta">4 angka terakhirnya dipakai untuk melacak status permohonan tanpa masuk.</span>
                </label>
                <label className="field">
                  <span className="field__label">Alamat *</span>
                  <textarea className="field__input field__textarea" name="alamat" autoComplete="street-address" maxLength={250} placeholder="Jalan, nomor rumah, RT" value={isian.alamat} onChange={(event) => ubah('alamat', event.target.value)} />
                </label>
                <label className="field">
                  <span className="field__label">Kelurahan *</span>
                  <select className="field__input field__select" value={isian.id_kelurahan} onChange={(event) => ubah('id_kelurahan', event.target.value)}>
                    <option value="">Pilih kelurahan</option>
                    {kelurahan.map((k) => (
                      <option key={k.id_kelurahan} value={k.id_kelurahan}>
                        {k.nama}
                      </option>
                    ))}
                  </select>
                </label>
                <Galat pesan={galat} />
                <div className="berita-form__aksi">
                  <Button label={mengirim ? 'Menyimpan…' : baru ? 'Simpan & Lanjutkan' : 'Simpan'} arrow={!mengirim} type="submit" disabled={mengirim} />
                  {!baru && <Button label="Kembali" style="secondary" href="/permohonan" />}
                </div>
              </form>
            )}
          </Kartu>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
