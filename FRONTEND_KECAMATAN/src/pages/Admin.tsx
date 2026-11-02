import { useEffect, useState, type ReactNode } from 'react';
import { aksiPengajuan, ambilAntrian, ambilFileBerkas, ApiError, detailPengajuan, keluarAkun, type DetailPengajuan, type Ringkas } from '../api';
import { Icon, type IconName } from '../components/Icon';
import { BarisData, Galat, Kartu, Riwayat, tanggal, ukuranFile } from '../components/portal';
import { Button, Logo, SelectField } from '../components/ui';
import { LAYANAN } from '../data/layanan';
import { ambilSesi, hapusSesi, inisial, type Pengguna } from '../sesi';

const PERAN: Record<string, string> = { ADMIN: 'Petugas Pelayanan', KASI: 'Kasi Tata Pemerintahan', CAMAT: 'Camat' };
const PER_HALAMAN = 8;

const BADGE: Record<string, { label: string; warna: string }> = {
  DIAJUKAN: { label: 'Diajukan', warna: 'netral' },
  DIKEMBALIKAN_KE_ADMIN: { label: 'Diperiksa', warna: 'kuning' },
  PERLU_REVISI: { label: 'Perlu Perbaikan', warna: 'merah' },
  MENUNGGU_PARAF_KASI: { label: 'Diperiksa', warna: 'kuning' },
  MENUNGGU_TTE_CAMAT: { label: 'Divalidasi', warna: 'garis-primer' },
  SIAP_DIAMBIL: { label: 'Ditandatangani', warna: 'gelap' },
  SELESAI: { label: 'Selesai', warna: 'hijau' },
  DITOLAK: { label: 'Ditolak', warna: 'merah' },
};

const Badge = ({ status }: { status: string }) => <span className={`status status--${BADGE[status]?.warna}`}>{BADGE[status]?.label ?? status}</span>;

const TAB: { label: string; status: string[] }[] = [
  { label: 'Semua', status: [] },
  { label: 'Perlu Diperiksa', status: ['DIAJUKAN', 'DIKEMBALIKAN_KE_ADMIN'] },
  { label: 'Perlu Perbaikan', status: ['PERLU_REVISI'] },
  { label: 'Menunggu Paraf', status: ['MENUNGGU_PARAF_KASI'] },
  { label: 'Menunggu TTD', status: ['MENUNGGU_TTE_CAMAT'] },
  { label: 'Selesai', status: ['SIAP_DIAMBIL', 'SELESAI', 'DITOLAK'] },
];

const namaLayanan = (id: string, cadangan: string) => LAYANAN.find((item) => item.id === id)?.judul ?? cadangan;
const hariIni = (iso: string) => new Date(iso).toDateString() === new Date().toDateString();

function Sidebar({ user, data, tab, keTab }: { user: Pengguna; data: Ringkas[]; tab: string; keTab: (label: string) => void }) {
  const hitung = (label: string) => data.filter((item) => TAB.find((t) => t.label === label)!.status.includes(item.status_pengajuan)).length;
  const antrianKerja = user.role === 'ADMIN' ? hitung('Perlu Diperiksa') : data.length;
  const menu: { label: string; ikon: IconName; ikonAktif?: IconName; jumlah?: number; tab?: string; href?: string }[] = [
    { label: 'Ringkasan', ikon: 'nav-grid', tab: 'Semua' },
    { label: 'Berkas Masuk', ikon: 'nav-file', ikonAktif: 'nav-inbox-aktif', jumlah: antrianKerja, tab: 'Perlu Diperiksa' },
    { label: 'Menunggu Paraf Kasi', ikon: 'nav-clipboard', jumlah: hitung('Menunggu Paraf'), tab: 'Menunggu Paraf' },
    { label: 'Menunggu TTD Camat', ikon: 'nav-pen', jumlah: hitung('Menunggu TTD'), tab: 'Menunggu TTD' },
    { label: 'Selesai', ikon: 'nav-selesai', tab: 'Selesai' },
    { label: 'Layanan & Persyaratan', ikon: 'nav-file', href: '/pelayanan' },
  ];
  const keluar = async () => {
    await keluarAkun();
    hapusSesi();
    window.location.assign('/');
  };
  return (
    <aside className="sidebar">
      <a className="sidebar__brand" href="/admin">
        <Logo variant="sidebar" />
        <span>
          <span className="sidebar__peran">Admin Pelayanan</span>
          <span className="sidebar__nama">Kec. Tarakan Timur</span>
        </span>
      </a>
      <nav className="sidebar__menu" aria-label="Menu admin">
        {menu.map(({ label, ikon, ikonAktif, jumlah, tab: tujuan, href }) => {
          const aktif = tujuan === tab && label !== 'Ringkasan';
          const isi = (
            <>
              <Icon name={aktif && ikonAktif ? ikonAktif : ikon} />
              <span className="sidebar__label">{label}</span>
              {jumlah !== undefined && user.role === 'ADMIN' && <span className="sidebar__jumlah">{jumlah}</span>}
            </>
          );
          const kelas = `sidebar__item${aktif ? ' sidebar__item--aktif' : ''}`;
          return href ? (
            <a key={label} className={kelas} href={href}>
              {isi}
            </a>
          ) : (
            <button key={label} type="button" className={kelas} onClick={() => tujuan && keTab(tujuan)}>
              {isi}
            </button>
          );
        })}
      </nav>
      <div className="sidebar__petugas">
        <span className="akun__inisial akun__inisial--besar">{inisial(user.nama_lengkap)}</span>
        <span className="sidebar__teks">
          <span className="sidebar__nama-petugas">{user.nama_lengkap}</span>
          <span className="sidebar__jabatan">{PERAN[user.role]}</span>
        </span>
        <button type="button" className="sidebar__keluar" aria-label="Keluar" onClick={keluar}>
          <Icon name="log-out" />
        </button>
      </div>
    </aside>
  );
}

const Topbar = ({ kecil, judul, kanan }: { kecil: ReactNode; judul: string; kanan?: ReactNode }) => (
  <header className="topbar">
    <div>
      <p className="baris__meta">{kecil}</p>
      <h1 className="info-judul__teks">{judul}</h1>
    </div>
    <div className="topbar__kanan">{kanan}</div>
  </header>
);

function Dashboard({ data, tab, setTab }: { data: Ringkas[]; tab: string; setTab: (tab: string) => void }) {
  const [cari, setCari] = useState('');
  const [layanan, setLayanan] = useState('');
  const [waktu, setWaktu] = useState('');
  const [halaman, setHalaman] = useState(1);

  const kata = cari.trim().toLowerCase();
  const pilihan = TAB.find((t) => t.label === tab)!;
  const tersaring = data.filter(
    (item) =>
      (pilihan.status.length === 0 || pilihan.status.includes(item.status_pengajuan)) &&
      (!layanan || namaLayanan(item.id_layanan, item.nama_layanan) === layanan) &&
      (!waktu || hariIni(item.tgl_pengajuan)) &&
      `${item.no_registrasi} ${item.pemohon?.nama_lengkap} ${item.nama_layanan}`.toLowerCase().includes(kata),
  );
  const jumlahHalaman = Math.max(1, Math.ceil(tersaring.length / PER_HALAMAN));
  const aktif = Math.min(halaman, jumlahHalaman);
  const baris = tersaring.slice((aktif - 1) * PER_HALAMAN, aktif * PER_HALAMAN);
  const hitung = (label: string) => data.filter((item) => TAB.find((t) => t.label === label)!.status.includes(item.status_pengajuan)).length;

  const statistik: { label: string; angka: number; ket: string; ikon: IconName }[] = [
    { label: 'Masuk hari ini', angka: data.filter((item) => hariIni(item.tgl_pengajuan)).length, ket: 'Semua layanan', ikon: 'nav-file' },
    { label: 'Perlu diperiksa', angka: hitung('Perlu Diperiksa'), ket: 'Prioritas petugas', ikon: 'file-text-sm' },
    { label: 'Perlu perbaikan', angka: hitung('Perlu Perbaikan'), ket: 'Menunggu pemohon', ikon: 'alert-20' },
    { label: 'Menunggu paraf Kasi', angka: hitung('Menunggu Paraf'), ket: 'Kasi Tata Pemerintahan', ikon: 'nav-clipboard' },
    { label: 'Menunggu TTD Camat', angka: hitung('Menunggu TTD'), ket: 'Camat', ikon: 'nav-pen' },
  ];

  return (
    <>
      <Topbar
        kecil={new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        judul="Berkas Masuk"
        kanan={
          <label className="search search--topbar">
            <Icon name="search" />
            <input className="search__input" type="search" placeholder="Cari kode, nama, atau email…" aria-label="Cari berkas" value={cari} onChange={(event) => setCari(event.target.value)} />
          </label>
        }
      />
      <div className="admin__konten">
        <div className="stat-admin">
          {statistik.map(({ label, angka, ket, ikon }) => (
            <div className="stat-admin__kartu" key={label}>
              <div className="stat-admin__atas">
                <span className="baris__judul">{label}</span>
                <Icon name={ikon} ukuran={18} />
              </div>
              <p className="stat-admin__angka">{angka}</p>
              <p className="baris__meta">{ket}</p>
            </div>
          ))}
        </div>
        <section className="kartu kartu--tabel">
          <div className="tabel-filter">
            <div className="chips">
              {TAB.map(({ label, status }) => (
                <button
                  key={label}
                  type="button"
                  className={`chip${label === tab ? ' chip--selected' : ''}`}
                  aria-pressed={label === tab}
                  onClick={() => {
                    setTab(label);
                    setHalaman(1);
                  }}
                >
                  {label}
                  <span className="chip__jumlah">{status.length === 0 ? data.length : hitung(label)}</span>
                </button>
              ))}
            </div>
            <div className="filter">
              <SelectField nama="layanan" placeholder="Semua layanan" pilihan={LAYANAN.map((item) => item.judul)} nilai={layanan} onUbah={setLayanan} />
              <SelectField nama="waktu" placeholder="Semua waktu" pilihan={['Hari ini']} nilai={waktu} onUbah={setWaktu} />
            </div>
          </div>
          <table className="tabel-admin">
            <thead>
              <tr>
                {['Kode Permohonan', 'Pemohon', 'Layanan', 'Diajukan', 'Status', 'Aksi'].map((kolom) => (
                  <th scope="col" key={kolom}>
                    {kolom}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {baris.map((item) => {
                const periksa = ['DIAJUKAN', 'DIKEMBALIKAN_KE_ADMIN'].includes(item.status_pengajuan);
                const finalisasi = item.status_pengajuan === 'SIAP_DIAMBIL';
                return (
                  <tr key={item.id_pengajuan}>
                    <td className="tabel-admin__kode">{item.no_registrasi}</td>
                    <td>
                      <strong>{item.pemohon?.nama_lengkap}</strong>
                      <span className="baris__meta">{item.pemohon?.no_hp_tersamar}</span>
                    </td>
                    <td>{namaLayanan(item.id_layanan, item.nama_layanan)}</td>
                    <td className="baris__meta">{tanggal(item.tgl_pengajuan)} WITA</td>
                    <td>
                      <Badge status={item.status_pengajuan} />
                    </td>
                    <td>
                      <Button label={periksa ? 'Periksa' : finalisasi ? 'Finalisasi' : 'Lihat'} style={periksa || finalisasi ? 'primary' : 'secondary'} size="small" href={`/admin?id=${item.id_pengajuan}`} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {baris.length === 0 && <p className="info-kosong tabel-kosong">Tidak ada berkas.</p>}
          <div className="tabel-kaki">
            <span className="baris__meta">
              Menampilkan {baris.length} dari {tersaring.length} berkas
            </span>
            <div className="pagination">
              {Array.from({ length: jumlahHalaman }, (_, i) => i + 1).map((nomor) => (
                <button key={nomor} type="button" className={`page${nomor === aktif ? ' page--active' : ''}`} onClick={() => setHalaman(nomor)}>
                  {nomor}
                </button>
              ))}
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

function Verifikasi({ data, onBerubah }: { data: DetailPengajuan; onBerubah: () => void }) {
  const dapatDiproses = ['DIAJUKAN', 'DIKEMBALIKAN_KE_ADMIN'].includes(data.status_pengajuan);
  const [nilai, setNilai] = useState<Record<string, { sesuai: boolean; catatan: string }>>({});
  const [catatan, setCatatan] = useState('');
  const [indeks, setIndeks] = useState(0);
  const [pratinjau, setPratinjau] = useState<string | null>(null);
  const [galat, setGalat] = useState<string | null>(null);

  const berkas = data.berkas[indeks];
  useEffect(() => {
    setPratinjau(null);
    if (berkas?.file_url) ambilFileBerkas(berkas.file_url).then(setPratinjau).catch(() => setPratinjau(null));
  }, [berkas?.id_berkas]);

  const jumlahSesuai = Object.values(nilai).filter((n) => n.sesuai).length;
  const tidakSesuai = Object.entries(nilai).filter(([, n]) => !n.sesuai);
  const semuaDinilai = data.berkas.every((b) => nilai[b.id_berkas]);

  const kirim = async (aksi: 'SETUJUI' | 'MINTA_REVISI' | 'TOLAK') => {
    setGalat(null);
    try {
      await aksiPengajuan(data.id_pengajuan, 'verifikasi', {
        aksi,
        version: data.version,
        catatan: catatan.trim() || undefined,
        ...(aksi === 'TOLAK'
          ? {}
          : {
              berkas: Object.entries(nilai).map(([id_berkas, n]) => ({ id_berkas, status: n.sesuai ? 'VALID' : 'PERLU_PERBAIKAN', catatan: n.catatan.trim() || undefined })),
            }),
      });
      window.location.assign('/admin');
    } catch (error) {
      setGalat(error instanceof ApiError ? error.message : 'Aksi gagal.');
      onBerubah();
    }
  };

  return (
    <>
      <Topbar
        kecil={`Berkas Masuk › ${data.no_registrasi}`}
        judul="Verifikasi Berkas"
        kanan={
          <>
            <Badge status={data.status_pengajuan} />
            <Button label="Hubungi Pemohon (WA)" style="secondary" size="small" disabled />
          </>
        }
      />
      <div className="admin__dua">
        <div className="admin__kiri">
          <Kartu judul="Data pemohon & layanan">
            <div className="kolom-dua">
              <dl>
                <BarisData label="Nama" nilai={data.pemohon?.nama_lengkap} />
                <BarisData label="Email" nilai={data.pemohon?.email} />
                <BarisData label="No. HP/WA" nilai={data.pemohon?.no_hp_tersamar} />
                <BarisData label="Alamat" nilai={data.pemohon?.alamat} />
              </dl>
              <dl>
                <BarisData label="Layanan" nilai={namaLayanan(data.id_layanan, data.nama_layanan)} />
                <BarisData label="Kode" nilai={data.no_registrasi} />
                <BarisData label="Diajukan" nilai={tanggal(data.tgl_pengajuan)} />
                <BarisData label="Kanal" nilai="Online" />
              </dl>
            </div>
          </Kartu>
          <section className="kartu kartu--tabel">
            <div className="periksa__judul">
              <h2 className="timeline__judul">Pemeriksaan persyaratan ({data.berkas.length})</h2>
              <span className="status status--hijau">{jumlahSesuai} sesuai</span>
              <span className="status status--merah">{tidakSesuai.length} tidak sesuai</span>
            </div>
            {data.berkas.map((item, urutan) => {
              const n = nilai[item.id_berkas];
              const tandai = (sesuai: boolean) => setNilai({ ...nilai, [item.id_berkas]: { sesuai, catatan: n?.catatan ?? '' } });
              return (
                <div className="periksa__baris" key={item.id_berkas}>
                  <div className="periksa__atas">
                    <span className="syarat__nomor">{urutan + 1}</span>
                    <div className="dokumen__teks">
                      <p className="baris__judul">{item.nama_syarat}</p>
                      <p className="baris__meta">
                        {item.nama_file} · {ukuranFile(item.ukuran_byte)} ·{' '}
                        <button type="button" className="tautan-polos" onClick={() => setIndeks(urutan)}>
                          Lihat berkas
                        </button>
                      </p>
                    </div>
                    {dapatDiproses && (
                      <>
                        <button type="button" className={`nilai${n?.sesuai ? ' nilai--sesuai' : ''}`} aria-pressed={n?.sesuai === true} onClick={() => tandai(true)}>
                          ✓ Sesuai
                        </button>
                        <button type="button" className={`nilai${n && !n.sesuai ? ' nilai--tidak' : ''}`} aria-pressed={n?.sesuai === false} onClick={() => tandai(false)}>
                          ✕ Tidak sesuai
                        </button>
                      </>
                    )}
                  </div>
                  {n && !n.sesuai && (
                    <textarea
                      className="field__input periksa__catatan"
                      aria-label={`Catatan ${item.nama_syarat}`}
                      placeholder="Apa yang perlu diperbaiki pemohon?"
                      value={n.catatan}
                      onChange={(event) => setNilai({ ...nilai, [item.id_berkas]: { ...n, catatan: event.target.value } })}
                    />
                  )}
                </div>
              );
            })}
          </section>
        </div>
        <aside className="admin__samping">
          <Kartu
            judul="Pratinjau berkas"
            aksi={
              <span className="baris__meta">
                {indeks + 1} / {data.berkas.length}
              </span>
            }
          >
            <div className="pratinjau">
              {pratinjau && berkas?.mime_type.startsWith('image/') && <img src={pratinjau} alt={berkas.nama_syarat} />}
              {pratinjau && berkas?.mime_type === 'application/pdf' && <iframe src={pratinjau} title={berkas.nama_syarat} />}
              {!pratinjau && (
                <>
                  <Icon name="image" />
                  {berkas?.file_url ? 'Memuat…' : `${berkas?.nama_file ?? 'Berkas'} (data contoh tanpa file)`}
                </>
              )}
            </div>
            <div className="pratinjau__kontrol">
              <button type="button" className="tautan-polos" disabled={indeks === 0} onClick={() => setIndeks(indeks - 1)}>
                ‹ Sebelumnya
              </button>
              {pratinjau && (
                <a className="tautan-polos" href={pratinjau} target="_blank" rel="noreferrer">
                  Perbesar
                </a>
              )}
              <button type="button" className="tautan-polos" disabled={indeks >= data.berkas.length - 1} onClick={() => setIndeks(indeks + 1)}>
                Berikutnya ›
              </button>
            </div>
          </Kartu>
          {dapatDiproses && (
            <Kartu judul="Keputusan petugas">
              {tidakSesuai.length > 0 && <p className="pemberitahuan pemberitahuan--merah pemberitahuan--kecil">{tidakSesuai.length} persyaratan tidak sesuai. Kirim permintaan perbaikan kepada pemohon.</p>}
              <label className="field">
                <span className="field__label">Catatan untuk pemohon</span>
                <textarea className="field__input field__textarea" value={catatan} placeholder="Tuliskan catatan" onChange={(event) => setCatatan(event.target.value)} />
              </label>
              <Galat pesan={galat} />
              <Button label="Kirim Permintaan Perbaikan" arrow disabled={tidakSesuai.length === 0} onClick={() => kirim('MINTA_REVISI')} />
              <Button label="Teruskan ke Kasi Tata Pemerintahan" style="secondary" disabled={!semuaDinilai || tidakSesuai.length > 0} onClick={() => kirim('SETUJUI')} />
              <p className="baris__meta">Tombol teruskan aktif jika semua persyaratan wajib sudah sesuai.</p>
              <button type="button" className="tautan-polos tautan-polos--bahaya" disabled={!catatan.trim()} onClick={() => kirim('TOLAK')}>
                Tolak permohonan (isi catatan alasan)
              </button>
            </Kartu>
          )}
          <Kartu judul="Riwayat proses">
            <Riwayat data={data} />
          </Kartu>
        </aside>
      </div>
    </>
  );
}

function Finalisasi({ data }: { data: DetailPengajuan }) {
  const [cek, setCek] = useState<boolean[]>([false, false, false, false]);
  const [pengambil, setPengambil] = useState('');
  const [galat, setGalat] = useState<string | null>(null);
  const tandai = (i: number) => setCek(cek.map((nilai, urutan) => (urutan === i ? !nilai : nilai)));

  const serahkan = async () => {
    setGalat(null);
    try {
      await aksiPengajuan(data.id_pengajuan, 'serahkan', { version: data.version });
      window.location.assign('/admin');
    } catch (error) {
      setGalat(error instanceof ApiError ? error.message : 'Aksi gagal.');
    }
  };

  const Cek = ({ i, teks }: { i: number; teks: string }) => (
    <label className="persetujuan">
      <input type="checkbox" checked={cek[i]} onChange={() => tandai(i)} />
      <span>{teks}</span>
    </label>
  );

  return (
    <>
      <Topbar kecil={`Berkas Masuk › ${data.no_registrasi}`} judul="Finalisasi & Penyerahan" kanan={<Badge status={data.status_pengajuan} />} />
      <div className="admin__dua">
        <div className="admin__kiri">
          <Kartu judul="1. Finalisasi surat">
            <p className="tile__desc">Surat sudah ditandatangani Camat. Nomor registrasi dibuat otomatis oleh sistem, lalu bubuhkan stempel.</p>
            <label className="field">
              <span className="field__label">Nomor registrasi *</span>
              <input className="field__input" readOnly value={data.nomor_surat ?? ''} />
            </label>
            <Cek i={0} teks="Stempel kecamatan sudah dibubuhkan" />
          </Kartu>
          <Kartu judul="2. Penyerahan kepada pemohon">
            <p className="tile__desc">Lakukan saat pemohon datang ke kantor kecamatan.</p>
            <Cek i={1} teks={`Kode pengambilan dicocokkan (${data.no_registrasi})`} />
            <Cek i={2} teks="Dokumen asli sudah dicocokkan dengan berkas unggahan" />
            <Cek i={3} teks="KTP pengambil sudah diperiksa" />
            <label className="field">
              <span className="field__label">Diambil oleh</span>
              <input className="field__input" placeholder="Nama pengambil (isi jika dikuasakan)" value={pengambil} onChange={(event) => setPengambil(event.target.value)} />
            </label>
            <Galat pesan={galat} />
            <div>
              <Button label="Tandai Sudah Diambil" style="secondary" disabled={cek.includes(false)} onClick={serahkan} />
            </div>
          </Kartu>
        </div>
        <aside className="admin__samping">
          <Kartu judul="Ringkasan">
            <dl>
              <BarisData label="Pemohon" nilai={data.pemohon?.nama_lengkap} />
              <BarisData label="Layanan" nilai={namaLayanan(data.id_layanan, data.nama_layanan)} />
              <BarisData label="Kode" nilai={data.no_registrasi} />
              <BarisData label="Diajukan" nilai={tanggal(data.tgl_pengajuan)} />
            </dl>
          </Kartu>
          <Kartu judul="Riwayat proses">
            <Riwayat data={data} />
          </Kartu>
        </aside>
      </div>
    </>
  );
}

function Persetujuan({ user, antrian, idAwal }: { user: Pengguna; antrian: Ringkas[]; idAwal: string | null }) {
  const kasi = user.role === 'KASI';
  const [id, setId] = useState(idAwal ?? antrian[0]?.id_pengajuan ?? null);
  const [data, setData] = useState<DetailPengajuan | null>(null);
  const [catatan, setCatatan] = useState('');
  const [galat, setGalat] = useState<string | null>(null);

  useEffect(() => {
    setData(null);
    if (id)
      detailPengajuan(id)
        .then(setData)
        .catch((error: Error) => setGalat(error.message));
  }, [id]);

  const kirim = async (aksi: 'SETUJUI' | 'KEMBALIKAN' | 'TOLAK') => {
    if (!data) return;
    setGalat(null);
    try {
      await aksiPengajuan(data.id_pengajuan, kasi ? 'paraf-kasi' : 'tte-camat', { aksi, version: data.version, catatan: catatan.trim() || undefined });
      window.location.assign('/admin');
    } catch (error) {
      setGalat(error instanceof ApiError ? error.message : 'Aksi gagal.');
    }
  };

  return (
    <>
      <Topbar kecil={kasi ? 'Menunggu Paraf' : 'Menunggu Tanda Tangan'} judul={kasi ? 'Pemeriksaan & Paraf' : 'Persetujuan & Tanda Tangan'} kanan={<span className="pil pil--aksen">{antrian.length} berkas menunggu</span>} />
      <div className="persetujuan-admin">
        <Kartu judul={`Antrean (${antrian.length})`}>
          {antrian.length === 0 && <p className="heading__desc">Tidak ada berkas menunggu.</p>}
          {antrian.map((item) => (
            <button type="button" key={item.id_pengajuan} className={`antrean${item.id_pengajuan === id ? ' antrean--aktif' : ''}`} onClick={() => setId(item.id_pengajuan)}>
              <span className="overline">{item.no_registrasi}</span>
              <span className="baris__judul">{namaLayanan(item.id_layanan, item.nama_layanan)}</span>
              <span className="baris__meta">{tanggal(item.tgl_diperbarui)}</span>
            </button>
          ))}
        </Kartu>
        {data && (
          <>
            <Kartu judul="Draf surat" aksi={<Badge status={data.status_pengajuan} />}>
              <div className="draf">
                <div className="draf__lembar">
                  <p className="draf__kop">[KOP SURAT KECAMATAN TARAKAN TIMUR]</p>
                  <hr className="draf__garis" />
                  <p className="draf__judul">{data.nama_layanan.toUpperCase()}</p>
                  <p className="baris__meta">Nomor: [nomor registrasi]</p>
                  {[336, 336, 300, 336, 250, 336, 320, 200].map((lebar, urutan) => (
                    <span className="draf__teks" key={urutan} style={{ width: `${(lebar / 336) * 100}%` }} />
                  ))}
                  <div className="draf__ttd">
                    <p className="baris__meta">Camat Tarakan Timur</p>
                    <p className="draf__area">Tanda tangan di sini</p>
                    <p className="baris__judul">Boby Dean Marten, ST, M.Pd.Si</p>
                  </div>
                </div>
              </div>
            </Kartu>
            <Kartu judul="Ringkasan pemeriksaan">
              <dl>
                <BarisData label="Pemohon" nilai={data.pemohon?.nama_lengkap} />
                <BarisData label="Layanan" nilai={namaLayanan(data.id_layanan, data.nama_layanan)} />
                <BarisData label="Persyaratan" nilai={`${data.berkas.filter((b) => b.status_berkas === 'VALID').length}/${data.berkas.length} sesuai`} />
                <BarisData label="Diperbarui" nilai={tanggal(data.tgl_diperbarui)} />
              </dl>
              <label className="field">
                <span className="field__label">Catatan (wajib jika mengembalikan atau menolak)</span>
                <textarea className="field__input periksa__catatan" value={catatan} onChange={(event) => setCatatan(event.target.value)} />
              </label>
              <Galat pesan={galat} />
              <Button label={kasi ? 'Paraf & Teruskan ke Camat' : 'Tanda Tangani'} arrow onClick={() => kirim('SETUJUI')} />
              <Button label="Kembalikan ke Petugas" style="secondary" disabled={!catatan.trim()} onClick={() => kirim('KEMBALIKAN')} />
              <button type="button" className="tautan-polos tautan-polos--bahaya" disabled={!catatan.trim()} onClick={() => kirim('TOLAK')}>
                Tolak permohonan
              </button>
              <p className="baris__meta">Setelah ditandatangani, berkas diteruskan ke petugas pelayanan untuk diberi nomor registrasi dan stempel.</p>
            </Kartu>
          </>
        )}
      </div>
    </>
  );
}

function DetailAdmin({ id }: { id: string }) {
  const [data, setData] = useState<DetailPengajuan | null>(null);
  const [galat, setGalat] = useState<string | null>(null);
  const muat = () =>
    detailPengajuan(id)
      .then(setData)
      .catch((error: Error) => setGalat(error.message));
  useEffect(() => {
    muat();
  }, [id]);

  if (!data) return <div className="admin__konten">{galat ? <Galat pesan={galat} /> : <p className="heading__desc">Memuat…</p>}</div>;
  return data.status_pengajuan === 'SIAP_DIAMBIL' ? <Finalisasi data={data} /> : <Verifikasi data={data} onBerubah={muat} />;
}

export function Admin() {
  const sesi = ambilSesi();
  const id = new URLSearchParams(window.location.search).get('id');
  const [data, setData] = useState<Ringkas[] | null>(null);
  const [tab, setTab] = useState('Semua');
  const [galat, setGalat] = useState<string | null>(null);
  const petugas = sesi && sesi.user.role !== 'WARGA' ? sesi.user : null;

  useEffect(() => {
    if (!petugas) {
      window.location.replace('/masuk-petugas');
      return;
    }
    ambilAntrian(petugas.role === 'ADMIN')
      .then(setData)
      .catch((error: ApiError) => {
        if (error.status === 401) {
          hapusSesi();
          window.location.replace('/masuk-petugas');
        } else setGalat(error.message);
      });
  }, []);

  if (!petugas) return null;

  const keTab = (label: string) => {
    if (id) window.location.assign('/admin');
    setTab(label);
  };

  return (
    <div className="admin">
      <Sidebar user={petugas} data={data ?? []} tab={tab} keTab={keTab} />
      <main className="admin__utama">
        <Galat pesan={galat} />
        {data &&
          (petugas.role === 'ADMIN' ? (
            id ? (
              <DetailAdmin id={id} />
            ) : (
              <Dashboard data={data} tab={tab} setTab={setTab} />
            )
          ) : (
            <Persetujuan user={petugas} antrian={data} idAwal={id} />
          ))}
      </main>
    </div>
  );
}
