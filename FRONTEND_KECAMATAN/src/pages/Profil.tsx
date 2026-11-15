import { useEffect, useState, type FormEvent } from 'react';
import { ambilKelurahan, ambilProfil, ApiError, simpanProfil, type InputProfil } from '../api';
import { Galat, Kartu, useKunciKirim } from '../components/portal';
import { SiteFooter } from '../components/SiteFooter';
import { SiteHeader } from '../components/SiteHeader';
import { Button } from '../components/ui';
import { ambilSesi, simpanSesi, tujuanAman } from '../sesi';

const KOSONG: InputProfil = { nama_lengkap: '', nik: '', no_hp: '', alamat: '', id_kelurahan: '' };

const KODE_PROVINSI = new Set([11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 31, 32, 33, 34, 35, 36, 51, 52, 53, 61, 62, 63, 64, 65, 71, 72, 73, 74, 75, 76, 81, 82, 91, 92, 93, 94, 95, 96]);

/** Sama dengan pemeriksaan di server: 16 angka dengan provinsi, tanggal lahir, dan bulan yang masuk akal. */
function nikValid(nik: string) {
  if (!/^[0-9]{16}$/.test(nik) || !KODE_PROVINSI.has(Number(nik.slice(0, 2)))) return false;
  const tanggal = Number(nik.slice(6, 8));
  const hari = tanggal > 40 ? tanggal - 40 : tanggal;
  const bulan = Number(nik.slice(8, 10));
  return hari >= 1 && hari <= 31 && bulan >= 1 && bulan <= 12 && Number(nik.slice(2, 4)) > 0 && Number(nik.slice(4, 6)) > 0;
}

const hanyaAngka = (teks: string, panjang: number) => teks.replace(/[^0-9]/g, '').slice(0, panjang);
const hanyaHuruf = (teks: string) => teks.replace(/[^\p{L} .'’-]/gu, '');

/** Data pemohon untuk surat. Wajib diisi warga sebelum mengajukan permohonan pertama. */
export function Profil() {
  const sesi = ambilSesi();
  const [isian, setIsian] = useState<InputProfil | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  /** NIK dan HP yang sudah tersimpan hanya ditampilkan tersamar; kosong berarti profil belum pernah diisi. */
  const [tersamar, setTersamar] = useState<{ nik: string | null; hp: string | null }>({ nik: null, hp: null });
  const [kelurahan, setKelurahan] = useState<{ id_kelurahan: string; nama: string }[]>([]);
  const [galat, setGalat] = useState<string | null>(null);
  const { mengirim, mulai, lepas } = useKunciKirim();
  const baru = sesi?.user.profil_lengkap === false;
  const nikTersimpan = tersamar.nik !== null;
  const hpTersimpan = tersamar.hp !== null;

  useEffect(() => {
    if (!sesi) return window.location.replace('/masuk?ke=/profil');
    if (sesi.user.role !== 'WARGA') return window.location.replace('/admin');
    Promise.all([ambilProfil(), ambilKelurahan()])
      .then(([p, k]) => {
        setEmail(p.email);
        setTersamar({ nik: p.nik_tersamar, hp: p.no_hp_tersamar });
        setKelurahan(k);
        setIsian({ nama_lengkap: p.nama_lengkap, nik: '', no_hp: '', alamat: p.alamat ?? '', id_kelurahan: p.id_kelurahan ?? '' });
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
    const kosong = (Object.keys(isian) as (keyof InputProfil)[]).filter((k) => !isian[k].trim() && !(k === 'nik' && nikTersimpan) && !(k === 'no_hp' && hpTersimpan));
    if (kosong.length > 0) return setGalat('Lengkapi semua isian bertanda *.');
    if (!/^\p{L}[\p{L} .'’-]+$/u.test(isian.nama_lengkap.trim())) return setGalat('Nama hanya boleh berisi huruf, tanpa angka atau simbol lain.');
    if (!nikTersimpan && !nikValid(isian.nik)) return setGalat('NIK harus 16 angka dan sesuai dengan NIK di KTP.');
    if (isian.no_hp && !/^08[0-9]{8,12}$/.test(isian.no_hp)) return setGalat('Nomor HP hanya angka, diawali 08, contoh: 081234567890.');
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
                  <input className="field__input" name="nama" autoComplete="name" maxLength={120} value={isian.nama_lengkap} onChange={(event) => ubah('nama_lengkap', hanyaHuruf(event.target.value))} />
                </label>
                {nikTersimpan ? (
                  <label className="field">
                    <span className="field__label">NIK</span>
                    <input className="field__input" value={tersamar.nik ?? ''} readOnly />
                    <span className="baris__meta">NIK disembunyikan demi keamanan dan tidak dapat diubah sendiri. Hubungi petugas kecamatan bila salah.</span>
                  </label>
                ) : (
                  <label className="field">
                    <span className="field__label">NIK *</span>
                    <input className="field__input" name="nik" inputMode="numeric" autoComplete="off" maxLength={16} placeholder="16 angka di KTP" value={isian.nik} onChange={(event) => ubah('nik', hanyaAngka(event.target.value, 16))} />
                    <span className="baris__meta">Hanya angka, 16 digit. Setelah disimpan, NIK akan disembunyikan.</span>
                  </label>
                )}
                {hpTersimpan && (
                  <label className="field">
                    <span className="field__label">Nomor HP/WhatsApp tersimpan</span>
                    <input className="field__input" value={tersamar.hp ?? ''} readOnly />
                  </label>
                )}
                <label className="field">
                  <span className="field__label">{hpTersimpan ? 'Ganti nomor HP/WhatsApp (kosongkan bila tidak diganti)' : 'Nomor HP/WhatsApp *'}</span>
                  <input className="field__input" name="hp" inputMode="numeric" autoComplete="tel" maxLength={14} placeholder="Contoh: 081234567890" value={isian.no_hp} onChange={(event) => ubah('no_hp', hanyaAngka(event.target.value, 14))} />
                  <span className="baris__meta">Hanya angka. Nomor tidak ditampilkan lagi kepada siapa pun, termasuk petugas.</span>
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
