import { useEffect, useState, type FormEvent } from 'react';
import { ambilLayanan, ApiError, kirimPengajuan, unggahBerkas, type DetailLayananApi, type HasilUnggah, type Kondisi, type SyaratLengkap } from '../api';
import { Icon } from '../components/Icon';
import { BarisData, cekBerkas, Galat, Kartu, ukuranFile, useCegahBukaFile, useKunciKirim, useSeretLepas } from '../components/portal';
import { SiteFooter } from '../components/SiteFooter';
import { SiteHeader } from '../components/SiteHeader';
import { Button } from '../components/ui';
import { LAYANAN } from '../data/layanan';
import { ambilSesi } from '../sesi';

const LANGKAH = ['Pilih Layanan', 'Unggah Berkas', 'Periksa & Kirim'];

const berlaku = (kondisi: Kondisi | undefined, data: Record<string, string>) => {
  if (!kondisi) return true;
  const nilai = data[kondisi.field];
  return kondisi.sama_dengan !== undefined ? nilai === kondisi.sama_dengan : (kondisi.salah_satu ?? []).includes(nilai);
};

function KepalaHalaman({ langkah }: { langkah: number }) {
  return (
    <div className="kepala">
      <p className="baris__meta only-desktop">Beranda › Pelayanan › Ajukan Permohonan</p>
      <div className="kepala__baris">
        <div>
          <h1 className="kepala__judul">Ajukan Permohonan</h1>
          <p className="baris__meta only-mobile">
            Langkah {langkah + 1} dari 3 · {LANGKAH[langkah]}
          </p>
        </div>
        <ol className="langkah only-desktop">
          {LANGKAH.map((judul, urutan) => (
            <li key={judul} className={`langkah__item${urutan < langkah ? ' langkah__item--selesai' : urutan === langkah ? ' langkah__item--aktif' : ''}`}>
              <span className="langkah__nomor">{urutan < langkah ? <Icon name="check" /> : urutan + 1}</span>
              {judul}
            </li>
          ))}
        </ol>
      </div>
      <div className="progres only-mobile">
        {LANGKAH.map((judul, urutan) => (
          <span key={judul} className={urutan <= langkah ? 'progres__isi' : ''} />
        ))}
      </div>
    </div>
  );
}

function SlotUnggah({ syarat, file, onPilih, sibuk }: { syarat: SyaratLengkap; file?: HasilUnggah; onPilih: (file: File) => void; sibuk: boolean }) {
  const keterangan = syarat.keterangan?.startsWith('SP menulis') ? undefined : syarat.keterangan;
  const { diAtas, props } = useSeretLepas(onPilih);
  // value dikosongkan setelah dipilih, supaya memilih file yang sama lagi (mis. setelah galat) tetap terbaca.
  const masukan = (
    <input
      type="file"
      hidden
      accept=".pdf,.jpg,.jpeg,.png"
      onChange={(event) => {
        const pilihan = event.target.files?.[0];
        event.target.value = '';
        if (pilihan) onPilih(pilihan);
      }}
    />
  );
  return (
    <div className={`slot${file ? ' slot--terisi' : ''}${diAtas ? ' slot--seret' : ''}`} {...props}>
      <div className="slot__judul">
        <p className="baris__judul">{syarat.nama_syarat}</p>
        <span className={syarat.wajib && !syarat.kondisi ? 'syarat__tag syarat__tag--wajib' : 'baris__meta'}>{syarat.wajib && !syarat.kondisi ? 'Wajib' : (keterangan ?? 'Opsional')}</span>
      </div>
      {file ? (
        <div className="slot__file">
          <span className="dokumen__ikon">
            <Icon name="file-text-sm" />
          </span>
          <div className="dokumen__teks">
            <p className="baris__judul">{file.nama_file}</p>
            <p className="baris__meta">
              {file.mime_type === 'application/pdf' ? 'PDF' : 'JPG/PNG'} · {ukuranFile(file.ukuran_byte)}
            </p>
          </div>
          <label className="tautan-polos">
            Ganti
            {masukan}
          </label>
          <span className="centang centang--hijau">
            <Icon name="check" ukuran={12} />
          </span>
        </div>
      ) : (
        <label className="slot__area">
          <Icon name="upload" />
          <span>
            Seret file ke sini atau <strong>{sibuk ? 'mengunggah…' : 'pilih file'}</strong>
          </span>
          <span className="baris__meta">Format JPG, PNG, atau PDF · maks. 2 MB</span>
          {masukan}
        </label>
      )}
    </div>
  );
}

export function Ajukan() {
  const sesi = ambilSesi();
  const [langkah, setLangkah] = useState(0);
  const [idLayanan, setIdLayanan] = useState(new URLSearchParams(window.location.search).get('layanan') ?? LAYANAN[0].id);
  const [layanan, setLayanan] = useState<DetailLayananApi | null>(null);
  const [isian, setIsian] = useState<Record<string, string>>({});
  const [berkas, setBerkas] = useState<Record<string, HasilUnggah>>({});
  const [sibuk, setSibuk] = useState<string | null>(null);
  const [setuju, setSetuju] = useState(false);
  const { mengirim, mulai: mulaiKirim, lepas: lepasKirim } = useKunciKirim();
  const [kode, setKode] = useState<string | null>(null);
  const [galat, setGalat] = useState<string | null>(null);
  useCegahBukaFile();

  useEffect(() => {
    if (!sesi) window.location.replace(`/masuk?ke=${encodeURIComponent(`/ajukan?layanan=${idLayanan}`)}`);
    else if (sesi.user.role !== 'WARGA') window.location.replace('/admin');
  }, []);

  useEffect(() => {
    setLayanan(null);
    setIsian({});
    setBerkas({});
    ambilLayanan(idLayanan)
      .then(setLayanan)
      .catch((error: Error) => setGalat(error.message));
  }, [idLayanan]);

  if (!sesi) return null;

  const dipilih = LAYANAN.find((item) => item.id === idLayanan) ?? LAYANAN[0];
  const fields = layanan?.form_fields.filter((field) => berlaku(field.kondisi, isian)) ?? [];
  const syarat = layanan?.persyaratan.filter((item) => berlaku(item.kondisi, isian)) ?? [];
  const wajib = syarat.filter((item) => item.wajib);
  const wajibTerisi = wajib.filter((item) => berkas[item.id_syarat]).length;
  const terunggah = syarat.filter((item) => berkas[item.id_syarat]);

  const pilihFile = async (id: string, file: File) => {
    const masalah = cekBerkas(file);
    setGalat(masalah);
    if (masalah) return;
    setSibuk(id);
    try {
      const hasil = await unggahBerkas(file);
      setBerkas((lama) => ({ ...lama, [id]: hasil }));
    } catch (error) {
      setGalat(error instanceof ApiError ? error.message : 'Unggah gagal.');
    } finally {
      setSibuk(null);
    }
  };

  const lanjutPeriksa = () => {
    const kosong = fields.filter((field) => field.wajib && !isian[field.key]?.trim());
    if (kosong.length > 0) return setGalat(`Lengkapi ${kosong.map((field) => field.label).join(', ')}.`);
    if (wajibTerisi < wajib.length) return setGalat('Unggah semua berkas wajib terlebih dahulu.');
    setGalat(null);
    setLangkah(2);
    window.scrollTo(0, 0);
  };

  const kirim = async (event: FormEvent) => {
    event.preventDefault();
    if (!setuju) return setGalat('Centang pernyataan sebelum mengirim.');
    // Cegah klik ganda: tanpa ini, dua klik cepat membuat dua permohonan yang sama.
    if (!mulaiKirim()) return;
    setGalat(null);
    const data: Record<string, unknown> = {};
    for (const field of fields) {
      const nilai = isian[field.key];
      if (nilai) data[field.key] = field.tipe === 'angka' ? Number(nilai) : nilai;
    }
    try {
      const hasil = await kirimPengajuan(
        idLayanan,
        data,
        terunggah.map((item) => {
          const { file_id, nama_file, mime_type, ukuran_byte } = berkas[item.id_syarat];
          return { id_syarat: item.id_syarat, file_id, nama_file, mime_type, ukuran_byte };
        }),
      );
      setKode(hasil.no_registrasi);
      setLangkah(3);
      window.scrollTo(0, 0);
    } catch (error) {
      setGalat(error instanceof ApiError ? error.message : 'Gagal mengirim permohonan.');
      lepasKirim();
    }
  };

  const ringkasan = (
    <Kartu judul="Ringkasan">
      <p className="ringkasan__layanan">
        <Icon name={dipilih.ikon} />
        {dipilih.judul}
      </p>
      <div className="fakta__baris">
        <dt>Berkas wajib</dt>
        <dd>
          {wajibTerisi} dari {wajib.length}
        </dd>
      </div>
      <div className="progres-tunggal">
        <span style={{ width: `${wajib.length ? (wajibTerisi / wajib.length) * 100 : 0}%` }} />
      </div>
      <dl>
        <BarisData label="Biaya" nilai="Gratis" />
        <BarisData label="Estimasi" nilai="Maks. 1 hari kerja*" />
        <BarisData label="Pengambilan" nilai="Kantor kecamatan" />
      </dl>
      <p className="baris__meta">*Setelah seluruh berkas dinyatakan lengkap. Bawa dokumen asli saat mengambil surat.</p>
    </Kartu>
  );

  return (
    <>
      <SiteHeader aktif="Pelayanan" />
      <main className="portal">
        {langkah < 3 && <KepalaHalaman langkah={langkah} />}

        {langkah === 0 && (
          <div className="portal__isi">
            <Kartu>
              <h2 className="tile__title">Pilih layanan yang ingin diajukan</h2>
              <p className="heading__desc">Persyaratan akan menyesuaikan layanan yang Anda pilih.</p>
              <div className="pilih-grid">
                {LAYANAN.map(({ id, ikon, judul }) => (
                  <button type="button" key={id} className={`layanan-item${id === idLayanan ? ' layanan-item--aktif' : ''}`} aria-pressed={id === idLayanan} onClick={() => setIdLayanan(id)}>
                    <span className="layanan-item__ikon">
                      <Icon name={ikon} />
                    </span>
                    <span className="layanan-item__teks baris__judul">{judul}</span>
                    <Icon name={id === idLayanan ? 'chevron-primary-16' : 'chevron-16'} />
                  </button>
                ))}
              </div>
            </Kartu>
            <div className="bantuan">
              <div className="bantuan__teks">
                <h3 className="tile__title">Dipilih: {dipilih.judul}</h3>
                <p className="ppid__desc">{layanan ? `${layanan.persyaratan.length} persyaratan · ` : ''}Siapkan foto atau scan dokumen yang jelas</p>
              </div>
              <Button label="Lanjut: Unggah Berkas" style="accent" arrow className="bantuan__tombol" onClick={() => setLangkah(1)} />
            </div>
            <Galat pesan={galat} />
          </div>
        )}

        {langkah === 1 && !layanan && <div className="portal__isi">{galat ? <Galat pesan={galat} /> : <p className="heading__desc">Memuat persyaratan…</p>}</div>}

        {langkah === 1 && layanan && (
          <div className="portal__dua">
            <div className="portal__utama">
              <Kartu>
                <h2 className="tile__title">Unggah berkas — {dipilih.judul}</h2>
                <p className="heading__desc">Gunakan foto atau scan yang jelas dan seluruh tulisan terbaca. Berkas bertanda Wajib harus diunggah.</p>
                {fields.length > 0 && (
                  <div className="isian">
                    {fields.map((field) =>
                      field.tipe === 'pilihan' ? (
                        <label className="field" key={field.key}>
                          <span className="field__label">
                            {field.label}
                            {field.wajib ? ' *' : ''}
                          </span>
                          <select className="field__input field__select" value={isian[field.key] ?? ''} onChange={(event) => setIsian({ ...isian, [field.key]: event.target.value })}>
                            <option value="">Pilih</option>
                            {field.opsi?.map((opsi) => (
                              <option key={opsi.nilai} value={opsi.nilai}>
                                {opsi.label}
                              </option>
                            ))}
                          </select>
                        </label>
                      ) : (
                        <label className="field" key={field.key}>
                          <span className="field__label">
                            {field.label}
                            {field.wajib ? ' *' : ''}
                          </span>
                          <input
                            className="field__input"
                            type={field.tipe === 'tanggal' ? 'date' : field.tipe === 'angka' ? 'number' : 'text'}
                            placeholder={field.keterangan ?? ''}
                            name={field.key}
                            value={isian[field.key] ?? ''}
                            onChange={(event) => setIsian({ ...isian, [field.key]: event.target.value })}
                          />
                        </label>
                      ),
                    )}
                  </div>
                )}
                {syarat.map((item) => (
                  <SlotUnggah key={item.id_syarat} syarat={item} file={berkas[item.id_syarat]} sibuk={sibuk === item.id_syarat} onPilih={(file) => pilihFile(item.id_syarat, file)} />
                ))}
              </Kartu>
            </div>
            <aside className="portal__samping">
              {ringkasan}
              <Galat pesan={galat} />
              <Button label="Lanjut ke Pemeriksaan" arrow onClick={lanjutPeriksa} />
            </aside>
          </div>
        )}

        {langkah === 2 && (
          <form className="portal__dua" onSubmit={kirim}>
            <div className="portal__utama">
              <Kartu
                judul="Data Pemohon"
                aksi={
                  <button type="button" className="tautan-polos" onClick={() => setLangkah(1)}>
                    Ubah
                  </button>
                }
              >
                <dl>
                  <BarisData label="Nama lengkap" nilai={sesi.user.nama_lengkap} />
                  <BarisData label="Email (akun Google)" nilai={sesi.user.email} />
                  <BarisData label="Nomor HP/WhatsApp" nilai={sesi.user.no_hp_tersamar} />
                </dl>
              </Kartu>
              <Kartu
                judul={`Berkas yang diunggah (${terunggah.length})`}
                aksi={
                  <button type="button" className="tautan-polos" onClick={() => setLangkah(1)}>
                    Ubah berkas
                  </button>
                }
              >
                {terunggah.map((item) => (
                  <article className="dokumen" key={item.id_syarat}>
                    <span className="dokumen__ikon">
                      <Icon name="file-text-sm" />
                    </span>
                    <div className="dokumen__teks">
                      <h3 className="baris__judul">{item.nama_syarat}</h3>
                      <p className="baris__meta">
                        {berkas[item.id_syarat].nama_file} · {ukuranFile(berkas[item.id_syarat].ukuran_byte)}
                      </p>
                    </div>
                  </article>
                ))}
              </Kartu>
              <label className="persetujuan kartu">
                <input type="checkbox" checked={setuju} onChange={(event) => setSetuju(event.target.checked)} />
                <span>Saya menyatakan berkas yang diunggah benar dan sesuai dokumen aslinya. Saya akan membawa dokumen asli dan KTP saat mengambil surat.</span>
              </label>
            </div>
            <aside className="portal__samping">
              {ringkasan}
              <Galat pesan={galat} />
              <Button label={mengirim ? 'Mengirim…' : 'Kirim Permohonan'} arrow={!mengirim} type="submit" disabled={mengirim} />
            </aside>
          </form>
        )}

        {langkah === 3 && kode && (
          <div className="berhasil">
            <span className="berhasil__ikon">
              <Icon name="check" ukuran={28} />
            </span>
            <h1 className="info-judul__teks">Permohonan berhasil dikirim</h1>
            <p className="heading__desc">Simpan kode permohonan di bawah ini. Statusnya bisa dipantau kapan saja di halaman Permohonan Saya.</p>
            <div className="berhasil__kode">
              <p className="baris__meta">Kode permohonan</p>
              <p className="berhasil__nomor">{kode}</p>
              <button type="button" className="tautan-polos" onClick={() => navigator.clipboard?.writeText(kode)}>
                Salin kode
              </button>
            </div>
            <h2 className="timeline__judul">Apa yang terjadi selanjutnya?</h2>
            <ol className="selanjutnya">
              <li>
                <span className="misi__nomor">1</span>
                <div>
                  <p className="baris__judul">Petugas memeriksa berkas</p>
                  <p className="baris__meta">Biasanya pada hari kerja yang sama.</p>
                </div>
              </li>
              <li>
                <span className="misi__nomor">2</span>
                <div>
                  <p className="baris__judul">Pantau status di halaman Permohonan Saya</p>
                  <p className="baris__meta">Jika perlu perbaikan, Anda dapat mengunggah ulang berkasnya.</p>
                </div>
              </li>
              <li>
                <span className="misi__nomor">3</span>
                <div>
                  <p className="baris__judul">Ambil surat di kantor kecamatan</p>
                  <p className="baris__meta">Bawa dokumen asli dan KTP.</p>
                </div>
              </li>
            </ol>
            <div className="berhasil__aksi">
              <Button label="Lihat Permohonan Saya" arrow href="/permohonan" />
              <Button label="Kembali ke Beranda" style="secondary" href="/" />
            </div>
          </div>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
