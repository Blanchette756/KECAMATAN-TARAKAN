import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import {
  aksiPengajuan,
  ambilAntrian,
  ambilBerita,
  ApiError,
  daftarAkunPetugas,
  detailPengajuan,
  gantiPassword,
  hapusBerita,
  keluarAkun,
  simpanBerita,
  tambahAkunPetugas,
  ubahAkunPetugas,
  type AkunPetugas,
  type BerkasDetail,
  type PeranPetugas,
  type Berita,
  type DetailPengajuan,
  type InputBerita,
  type Ringkas,
} from '../api';
import { Icon, type IconName } from '../components/Icon';
import { MediaBerkas, PenampilBerkas, useUrlBerkas } from '../components/PenampilBerkas';
import { BarisData, BarisIsian, Galat, Kartu, KartuIsian, Riwayat, tanggal, ukuranFile, useIsianFormulir, useKunciKirim } from '../components/portal';
import { Button, Logo, SelectField } from '../components/ui';
import { tanggalBerita } from '../data/berita';
import { LAYANAN } from '../data/layanan';
import { CAMAT } from '../data/pejabat';
import { useSegarkanOtomatis } from '../segarkan';
import { ambilSesi, hapusSesi, inisial, type Pengguna } from '../sesi';

const PERAN: Record<string, string> = { ADMIN: 'Petugas Pelayanan', KASI: 'Kasi Tata Pemerintahan', CAMAT: 'Camat' };
const PANEL: Record<string, string> = { ADMIN: 'Admin Pelayanan', KASI: 'Panel Kasi', CAMAT: 'Panel Camat' };
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

// Hasil pemeriksaan petugas per berkas, ditampilkan ke Kasi sebagai bahan pemeriksaan.
const HASIL_PETUGAS: Record<BerkasDetail['status_berkas'], { label: string; warna: string }> = {
  VALID: { label: 'Sesuai', warna: 'hijau' },
  PERLU_PERBAIKAN: { label: 'Tidak sesuai', warna: 'merah' },
  MENUNGGU: { label: 'Belum dicek', warna: 'netral' },
};

const TAB: { label: string; status: string[] }[] = [
  { label: 'Semua', status: [] },
  { label: 'Perlu Diperiksa', status: ['DIAJUKAN', 'DIKEMBALIKAN_KE_ADMIN'] },
  { label: 'Perlu Perbaikan', status: ['PERLU_REVISI'] },
  { label: 'Menunggu Paraf', status: ['MENUNGGU_PARAF_KASI'] },
  { label: 'Menunggu TTD', status: ['MENUNGGU_TTE_CAMAT'] },
  { label: 'Selesai', status: ['SIAP_DIAMBIL', 'SELESAI', 'DITOLAK'] },
];

/** Menu "Kelola Berita" dan "Kelola Akun" khusus Petugas Pelayanan; "Ganti Password" untuk semua petugas. */
const TAB_BERITA = 'Berita';
const TAB_AKUN = 'Akun';
const TAB_PASSWORD = 'Password';

const namaLayanan = (id: string, cadangan: string) => LAYANAN.find((item) => item.id === id)?.judul ?? cadangan;
const hariIni = (iso: string) => new Date(iso).toDateString() === new Date().toDateString();

function Sidebar({ user, data, tab, keTab }: { user: Pengguna; data: Ringkas[]; tab: string; keTab: (label: string) => void }) {
  const hitung = (label: string) => data.filter((item) => TAB.find((t) => t.label === label)!.status.includes(item.status_pengajuan)).length;
  const admin = user.role === 'ADMIN';
  // Kasi dan Camat hanya punya satu antrean kerja (lihat Standar Pelayanan), jadi menunya satu.
  const menu: { label: string; ikon: IconName; ikonAktif?: IconName; ukuran?: number; jumlah?: number; tab: string }[] = admin
    ? [
        { label: 'Ringkasan', ikon: 'nav-grid', tab: 'Semua' },
        { label: 'Berkas Masuk', ikon: 'nav-file', ikonAktif: 'nav-inbox-aktif', jumlah: hitung('Perlu Diperiksa'), tab: 'Perlu Diperiksa' },
        { label: 'Menunggu Paraf Kasi', ikon: 'nav-clipboard', jumlah: hitung('Menunggu Paraf'), tab: 'Menunggu Paraf' },
        { label: 'Menunggu TTD Camat', ikon: 'nav-pen', jumlah: hitung('Menunggu TTD'), tab: 'Menunggu TTD' },
        { label: 'Selesai', ikon: 'nav-selesai', tab: 'Selesai' },
        { label: 'Kelola Berita', ikon: 'megaphone', tab: TAB_BERITA },
        { label: 'Kelola Akun', ikon: 'users-20', tab: TAB_AKUN },
        { label: 'Ganti Password', ikon: 'lock', ukuran: 20, tab: TAB_PASSWORD },
      ]
    : user.role === 'KASI'
      ? [
          { label: 'Perlu Paraf', ikon: 'nav-clipboard', jumlah: data.length, tab: 'Semua' },
          { label: 'Ganti Password', ikon: 'lock', ukuran: 20, tab: TAB_PASSWORD },
        ]
      : [
          { label: 'Perlu Tanda Tangan', ikon: 'nav-pen', jumlah: data.length, tab: 'Semua' },
          { label: 'Ganti Password', ikon: 'lock', ukuran: 20, tab: TAB_PASSWORD },
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
          <span className="sidebar__peran">{PANEL[user.role]}</span>
          <span className="sidebar__nama">Kec. Tarakan Timur</span>
        </span>
      </a>
      <nav className="sidebar__menu" aria-label="Menu admin">
        {menu.map(({ label, ikon, ikonAktif, ukuran, jumlah, tab: tujuan }) => {
          const aktif = tujuan === tab && label !== 'Ringkasan';
          return (
            <button key={label} type="button" className={`sidebar__item${aktif ? ' sidebar__item--aktif' : ''}`} onClick={() => keTab(tujuan)}>
              <Icon name={aktif && ikonAktif ? ikonAktif : ikon} ukuran={ukuran} />
              <span className="sidebar__label">{label}</span>
              {jumlah !== undefined && <span className="sidebar__jumlah">{jumlah}</span>}
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
            <input className="search__input" type="search" placeholder="Cari kode, nama, atau layanan…" aria-label="Cari berkas" value={cari} onChange={(event) => setCari(event.target.value)} />
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

function PratinjauBerkas({ daftar, indeks, setIndeks }: { daftar: BerkasDetail[]; indeks: number; setIndeks: (indeks: number) => void }) {
  const [layarPenuh, setLayarPenuh] = useState(false);
  const berkas = daftar[indeks];
  const { url: pratinjau, galat } = useUrlBerkas(berkas);
  const adaSebelumnya = indeks > 0;
  const adaBerikutnya = indeks < daftar.length - 1;

  return (
    <Kartu
      judul="Pratinjau berkas"
      aksi={
        <span className="baris__meta">
          {indeks + 1} / {daftar.length}
        </span>
      }
    >
      <div className="pratinjau">
        <MediaBerkas berkas={berkas} url={pratinjau} galat={galat} />
      </div>
      <div className="pratinjau__kontrol">
        <button type="button" className="tautan-polos" disabled={!adaSebelumnya} onClick={() => setIndeks(indeks - 1)}>
          ‹ Sebelumnya
        </button>
        {pratinjau && (
          <span className="pratinjau__tengah">
            <button type="button" className="tautan-polos" onClick={() => setLayarPenuh(true)}>
              Perbesar
            </button>
            <a className="tautan-polos" href={pratinjau} download={berkas?.nama_file}>
              Unduh
            </a>
          </span>
        )}
        <button type="button" className="tautan-polos" disabled={!adaBerikutnya} onClick={() => setIndeks(indeks + 1)}>
          Berikutnya ›
        </button>
      </div>

      {layarPenuh && <PenampilBerkas daftar={daftar} indeks={indeks} setIndeks={setIndeks} url={pratinjau} galat={galat} onTutup={() => setLayarPenuh(false)} />}
    </Kartu>
  );
}

function Verifikasi({ data, onBerubah }: { data: DetailPengajuan; onBerubah: () => void }) {
  const dapatDiproses = ['DIAJUKAN', 'DIKEMBALIKAN_KE_ADMIN'].includes(data.status_pengajuan);
  const [nilai, setNilai] = useState<Record<string, { sesuai: boolean; catatan: string }>>({});
  const [catatan, setCatatan] = useState('');
  const [indeks, setIndeks] = useState(0);
  const [galat, setGalat] = useState<string | null>(null);
  const { mengirim, mulai: mulaiKirim, lepas: lepasKirim } = useKunciKirim();
  // Isian formulir (bukan hanya berkas) juga bisa diminta diperbaiki. Pilihan ini hanya ada bila layanan punya isian.
  const adaIsian = useIsianFormulir(data).length > 0;
  const [isianSalah, setIsianSalah] = useState(false);

  const jumlahSesuai = Object.values(nilai).filter((n) => n.sesuai).length;
  const tidakSesuai = Object.entries(nilai).filter(([, n]) => !n.sesuai);
  const semuaDinilai = data.berkas.every((b) => nilai[b.id_berkas]);

  const kirim = async (aksi: 'SETUJUI' | 'MINTA_REVISI' | 'TOLAK') => {
    // Catatan wajib saat meminta perbaikan atau menolak; dicek di sini supaya pesannya jelas bagi petugas.
    if (aksi !== 'SETUJUI' && catatan.trim().length < 5) {
      setGalat(aksi === 'MINTA_REVISI' ? 'Tulis catatan untuk pemohon: apa yang perlu diperbaiki (minimal 5 karakter).' : 'Tulis alasan penolakan (minimal 5 karakter).');
      return;
    }
    if (!mulaiKirim()) return;
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
      lepasKirim();
      onBerubah();
    }
  };

  return (
    <>
      <Topbar
        kecil={`Berkas Masuk › ${data.no_registrasi}`}
        judul="Verifikasi Berkas"
        kanan={<Badge status={data.status_pengajuan} />}
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
          <KartuIsian data={data} />
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
          <PratinjauBerkas daftar={data.berkas} indeks={indeks} setIndeks={setIndeks} />
          {dapatDiproses && (
            <Kartu judul="Keputusan petugas">
              {tidakSesuai.length > 0 && <p className="pemberitahuan pemberitahuan--merah pemberitahuan--kecil">{tidakSesuai.length} persyaratan tidak sesuai. Kirim permintaan perbaikan kepada pemohon.</p>}
              {adaIsian && (
                <label className="persetujuan">
                  <input type="checkbox" checked={isianSalah} onChange={(event) => setIsianSalah(event.target.checked)} />
                  <span>Isian formulir perlu diperbaiki pemohon (jelaskan di catatan)</span>
                </label>
              )}
              <label className="field">
                <span className="field__label">Catatan untuk pemohon</span>
                <textarea className="field__input field__textarea" value={catatan} placeholder="Tuliskan catatan" onChange={(event) => setCatatan(event.target.value)} />
              </label>
              <Galat pesan={galat} />
              <Button label="Kirim Permintaan Perbaikan" arrow disabled={mengirim || (tidakSesuai.length === 0 && !isianSalah)} onClick={() => kirim('MINTA_REVISI')} />
              <Button label="Teruskan ke Kasi Tata Pemerintahan" style="secondary" disabled={mengirim || !semuaDinilai || tidakSesuai.length > 0 || isianSalah} onClick={() => kirim('SETUJUI')} />
              <p className="baris__meta">Tombol teruskan aktif jika semua persyaratan wajib sudah sesuai dan isian tidak perlu diperbaiki.</p>
              <button type="button" className="tautan-polos tautan-polos--bahaya" disabled={mengirim || !catatan.trim()} onClick={() => kirim('TOLAK')}>
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
  const { mengirim, mulai: mulaiKirim, lepas: lepasKirim } = useKunciKirim();
  const tandai = (i: number) => setCek(cek.map((nilai, urutan) => (urutan === i ? !nilai : nilai)));

  const serahkan = async () => {
    if (!mulaiKirim()) return;
    setGalat(null);
    try {
      // Nama pengambil (jika dikuasakan) dicatat di riwayat proses; hanya terlihat oleh petugas.
      const nama = pengambil.trim();
      await aksiPengajuan(data.id_pengajuan, 'serahkan', { version: data.version, catatan: nama ? `Diambil oleh: ${nama}` : undefined });
      window.location.assign('/admin');
    } catch (error) {
      setGalat(error instanceof ApiError ? error.message : 'Aksi gagal.');
      lepasKirim();
    }
  };

  // Fungsi biasa, bukan komponen: komponen yang dibuat di dalam render dipasang ulang setiap render,
  // sehingga kotak centang kehilangan fokus (pengguna keyboard tidak bisa lanjut ke kotak berikutnya).
  const kotakCek = (i: number, teks: string) => (
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
            {kotakCek(0, 'Stempel kecamatan sudah dibubuhkan')}
          </Kartu>
          <Kartu judul="2. Penyerahan kepada pemohon">
            <p className="tile__desc">Lakukan saat pemohon datang ke kantor kecamatan.</p>
            {kotakCek(1, `Kode pengambilan dicocokkan (${data.no_registrasi})`)}
            {kotakCek(2, 'Dokumen asli sudah dicocokkan dengan berkas unggahan')}
            {kotakCek(3, 'KTP pengambil sudah diperiksa')}
            <label className="field">
              <span className="field__label">Diambil oleh</span>
              <input className="field__input" placeholder="Nama pengambil (isi jika dikuasakan)" value={pengambil} onChange={(event) => setPengambil(event.target.value)} />
            </label>
            <Galat pesan={galat} />
            <div>
              <Button label="Tandai Sudah Diambil" style="secondary" disabled={mengirim || cek.includes(false)} onClick={serahkan} />
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
              <BarisIsian data={data} />
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
  const [indeks, setIndeks] = useState(0);
  const [galat, setGalat] = useState<string | null>(null);
  const { mengirim, mulai: mulaiKirim, lepas: lepasKirim } = useKunciKirim();

  const muatDetail = () => {
    if (id)
      detailPengajuan(id)
        .then(setData)
        .catch((error: Error) => setGalat(error.message));
  };
  useEffect(() => {
    setData(null);
    setIndeks(0);
    muatDetail();
  }, [id]);
  const berubah = usePantauPerubahan(id, data?.version);

  const kirim = async (aksi: 'SETUJUI' | 'KEMBALIKAN' | 'TOLAK') => {
    if (!data || !mulaiKirim()) return;
    setGalat(null);
    try {
      await aksiPengajuan(data.id_pengajuan, kasi ? 'paraf-kasi' : 'tte-camat', { aksi, version: data.version, catatan: catatan.trim() || undefined });
      window.location.assign('/admin');
    } catch (error) {
      setGalat(error instanceof ApiError ? error.message : 'Aksi gagal.');
      lepasKirim();
    }
  };

  const jumlahSesuai = data ? data.berkas.filter((b) => b.status_berkas === 'VALID').length : 0;
  // Standar Pelayanan: Kasi memeriksa berkas lalu memaraf, Camat hanya menandatangani surat.
  const paraf = data && [...data.riwayat].reverse().find((r) => r.aksi === 'KASI_PARAF');

  const keputusan = data && (
    <>
      {berubah && <PemberitahuanBerubah onMuatUlang={muatDetail} />}
      <label className="field">
        <span className="field__label">Catatan (wajib jika mengembalikan atau menolak)</span>
        <textarea className="field__input periksa__catatan" value={catatan} onChange={(event) => setCatatan(event.target.value)} />
      </label>
      <Galat pesan={galat} />
      <Button label={kasi ? 'Paraf & Teruskan ke Camat' : 'Tanda Tangani'} arrow disabled={mengirim} onClick={() => kirim('SETUJUI')} />
      <Button label="Kembalikan ke Petugas" style="secondary" disabled={mengirim || !catatan.trim()} onClick={() => kirim('KEMBALIKAN')} />
      <button type="button" className="tautan-polos tautan-polos--bahaya" disabled={mengirim || !catatan.trim()} onClick={() => kirim('TOLAK')}>
        Tolak permohonan
      </button>
      <p className="baris__meta">
        {kasi
          ? 'Setelah diparaf, berkas diteruskan ke Camat untuk ditandatangani.'
          : 'Setelah ditandatangani, berkas diteruskan ke petugas pelayanan untuk diberi nomor registrasi dan stempel.'}
      </p>
    </>
  );

  return (
    <>
      <Topbar
        kecil={kasi ? 'Kasi Tata Pemerintahan › Menunggu Paraf' : 'Camat › Menunggu Tanda Tangan'}
        judul={kasi ? 'Pemeriksaan Berkas & Paraf' : 'Tanda Tangan Surat'}
        kanan={<span className="pil pil--aksen">{kasi ? `${antrian.length} berkas menunggu paraf` : `${antrian.length} surat menunggu tanda tangan`}</span>}
      />
      <div className="persetujuan-admin">
        <Kartu judul={`${kasi ? 'Antrean paraf' : 'Antrean tanda tangan'} (${antrian.length})`}>
          {antrian.length === 0 && <p className="heading__desc">{kasi ? 'Tidak ada berkas yang menunggu paraf.' : 'Tidak ada surat yang menunggu tanda tangan.'}</p>}
          {antrian.map((item) => (
            <button type="button" key={item.id_pengajuan} className={`antrean${item.id_pengajuan === id ? ' antrean--aktif' : ''}`} onClick={() => setId(item.id_pengajuan)}>
              <span className="overline">{item.no_registrasi}</span>
              <span className="baris__judul">{namaLayanan(item.id_layanan, item.nama_layanan)}</span>
              <span className="baris__meta">{tanggal(item.tgl_diperbarui)}</span>
            </button>
          ))}
        </Kartu>
        {data && kasi && (
          <>
            <div className="admin__kiri">
              <KartuIsian data={data} />
              <section className="kartu kartu--tabel">
                <div className="periksa__judul">
                  <h2 className="timeline__judul">Berkas persyaratan ({data.berkas.length})</h2>
                  <span className="status status--hijau">{jumlahSesuai} sesuai menurut petugas</span>
                </div>
                {data.berkas.map((item, urutan) => (
                  <div className={`periksa__baris${urutan === indeks ? ' periksa__baris--aktif' : ''}`} key={item.id_berkas}>
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
                        {item.catatan_admin && <p className="baris__meta">Catatan petugas: {item.catatan_admin}</p>}
                      </div>
                      <span className={`status status--${HASIL_PETUGAS[item.status_berkas].warna}`}>{HASIL_PETUGAS[item.status_berkas].label}</span>
                    </div>
                  </div>
                ))}
              </section>
              <PratinjauBerkas daftar={data.berkas} indeks={indeks} setIndeks={setIndeks} />
            </div>
            <Kartu judul="Paraf Kasi" aksi={<Badge status={data.status_pengajuan} />}>
              <dl>
                <BarisData label="Pemohon" nilai={data.pemohon?.nama_lengkap} />
                <BarisData label="Layanan" nilai={namaLayanan(data.id_layanan, data.nama_layanan)} />
                <BarisData label="Kode" nilai={data.no_registrasi} />
                <BarisData label="Diajukan" nilai={tanggal(data.tgl_pengajuan)} />
              </dl>
              {keputusan}
            </Kartu>
          </>
        )}
        {data && !kasi && (
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
                    <p className="baris__judul">{CAMAT.nama}</p>
                    <p className="baris__meta">NIP. {CAMAT.nip}</p>
                  </div>
                </div>
              </div>
            </Kartu>
            <Kartu judul="Tanda tangan Camat">
              {paraf && (
                <p className="pemberitahuan pemberitahuan--hijau pemberitahuan--kecil">
                  Sudah diperiksa dan diparaf Kasi Tata Pemerintahan, {tanggal(paraf.waktu)} WITA
                  {paraf.catatan ? `. Catatan: ${paraf.catatan}` : ''}
                </p>
              )}
              <dl>
                <BarisData label="Pemohon" nilai={data.pemohon?.nama_lengkap} />
                <BarisData label="Layanan" nilai={namaLayanan(data.id_layanan, data.nama_layanan)} />
                <BarisData label="Persyaratan" nilai={`${jumlahSesuai}/${data.berkas.length} sesuai`} />
                <BarisData label="Kode" nilai={data.no_registrasi} />
                <BarisIsian data={data} />
              </dl>
              {keputusan}
            </Kartu>
          </>
        )}
      </div>
    </>
  );
}

/**
 * Halaman detail tidak diganti diam-diam (isian petugas bisa hilang dan pengaman versi jadi tidak berguna).
 * Sebagai gantinya, versi berkas dipantau berkala; bila berubah, petugas diberi tahu untuk memuat ulang.
 */
function usePantauPerubahan(id: string | null, versi: number | undefined): boolean {
  const [berubah, setBerubah] = useState(false);
  useEffect(() => setBerubah(false), [id, versi]);
  useSegarkanOtomatis(() => {
    if (id && versi !== undefined)
      detailPengajuan(id)
        .then((terbaru) => terbaru.version !== versi && setBerubah(true))
        .catch(() => undefined);
  }, id !== null && versi !== undefined);
  return berubah;
}

const PemberitahuanBerubah = ({ onMuatUlang }: { onMuatUlang: () => void }) => (
  <p className="pemberitahuan pemberitahuan--kecil" role="status">
    Berkas ini baru saja diubah oleh petugas lain atau pemohon.{' '}
    <button type="button" className="tautan-polos" onClick={onMuatUlang}>
      Muat ulang
    </button>
  </p>
);

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

  const berubah = usePantauPerubahan(id, data?.version);
  // Naik setiap petugas menekan Muat ulang, supaya isian pemeriksaan dimulai bersih untuk versi baru.
  const [kunci, setKunci] = useState(0);
  const muatUlang = () => {
    setKunci((k) => k + 1);
    muat();
  };

  if (!data) return <div className="admin__konten">{galat ? <Galat pesan={galat} /> : <p className="heading__desc">Memuat…</p>}</div>;
  return (
    <>
      {berubah && (
        <div className="admin__konten">
          <PemberitahuanBerubah onMuatUlang={muatUlang} />
        </div>
      )}
      {data.status_pengajuan === 'SIAP_DIAMBIL' ? <Finalisasi key={kunci} data={data} /> : <Verifikasi key={kunci} data={data} onBerubah={muat} />}
    </>
  );
}

const BATAS = { judulMin: 5, judulMaks: 150, ringkasanMin: 10, ringkasanMaks: 600 };
/** Tanggal hari ini menurut WITA, format YYYY-MM-DD (nilai bawaan isian tanggal berita). */
const hariIniWita = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Makassar' }).format(new Date());

function KelolaBerita() {
  const [daftar, setDaftar] = useState<Berita[] | null>(null);
  const [galatMuat, setGalatMuat] = useState<string | null>(null);
  // null = form tertutup; id kosong = berita baru.
  const [form, setForm] = useState<{ id?: string; isian: InputBerita } | null>(null);
  const [konfirmasiHapus, setKonfirmasiHapus] = useState<string | null>(null);
  const [galat, setGalat] = useState<string | null>(null);
  const [pesan, setPesan] = useState<string | null>(null);
  const { mengirim, mulai, lepas } = useKunciKirim();

  const muat = () =>
    ambilBerita()
      .then(setDaftar)
      .catch((error: Error) => setGalatMuat(error.message));
  useEffect(() => {
    muat();
  }, []);

  const bukaForm = (berita?: Berita) => {
    setGalat(null);
    setPesan(null);
    setKonfirmasiHapus(null);
    setForm(berita ? { id: berita.id_berita, isian: { judul: berita.judul, tanggal: berita.tanggal, ringkasan: berita.ringkasan } } : { isian: { judul: '', tanggal: hariIniWita(), ringkasan: '' } });
    window.scrollTo(0, 0);
  };

  const ubahIsian = (kunci: keyof InputBerita, nilai: string) => form && setForm({ ...form, isian: { ...form.isian, [kunci]: nilai } });

  const simpan = async (event: FormEvent) => {
    event.preventDefault();
    if (!form) return;
    const { judul, tanggal, ringkasan } = form.isian;
    const masalah = [
      judul.trim().length < BATAS.judulMin && `Judul minimal ${BATAS.judulMin} karakter.`,
      !tanggal && 'Tanggal wajib diisi.',
      ringkasan.trim().length < BATAS.ringkasanMin && `Ringkasan minimal ${BATAS.ringkasanMin} karakter.`,
    ].filter(Boolean);
    if (masalah.length > 0) return setGalat(masalah.join(' '));
    if (!mulai()) return;
    setGalat(null);
    try {
      await simpanBerita(form.isian, form.id);
      setPesan(form.id ? 'Perubahan berita disimpan dan sudah tampil di situs.' : 'Berita baru ditambahkan dan sudah tampil di situs.');
      setForm(null);
      await muat();
    } catch (error) {
      setGalat(error instanceof ApiError ? error.message : 'Gagal menyimpan berita.');
    } finally {
      lepas();
    }
  };

  const hapus = async (id: string) => {
    if (!mulai()) return;
    setGalat(null);
    try {
      await hapusBerita(id);
      setPesan('Berita dihapus dari situs.');
      setKonfirmasiHapus(null);
      if (form?.id === id) setForm(null);
      await muat();
    } catch (error) {
      setGalat(error instanceof ApiError ? error.message : 'Gagal menghapus berita.');
    } finally {
      lepas();
    }
  };

  return (
    <>
      <Topbar kecil="Informasi Publik" judul="Kelola Berita" kanan={<Button label="Tambah Berita" arrow onClick={() => bukaForm()} />} />
      <div className="admin__konten">
        {pesan && (
          <p className="pemberitahuan pemberitahuan--hijau pemberitahuan--kecil">
            {pesan}{' '}
            <a className="tautan-polos" href="/informasi-publik?tab=Berita" target="_blank" rel="noreferrer">
              Lihat di situs
            </a>
          </p>
        )}
        {form && (
          <Kartu judul={form.id ? 'Ubah berita' : 'Tambah berita'}>
            <form className="berita-form" onSubmit={simpan} noValidate>
              <label className="field">
                <span className="field__label">Judul *</span>
                <input className="field__input" maxLength={BATAS.judulMaks} placeholder="Contoh: Kerja bakti serentak se-kecamatan" value={form.isian.judul} onChange={(event) => ubahIsian('judul', event.target.value)} />
              </label>
              <label className="field berita-form__tanggal">
                <span className="field__label">Tanggal *</span>
                <input className="field__input" type="date" value={form.isian.tanggal} onChange={(event) => ubahIsian('tanggal', event.target.value)} />
              </label>
              <label className="field">
                <span className="field__label">Ringkasan *</span>
                <textarea
                  className="field__input field__textarea"
                  maxLength={BATAS.ringkasanMaks}
                  placeholder="Ringkasan singkat yang tampil di kartu berita"
                  value={form.isian.ringkasan}
                  onChange={(event) => ubahIsian('ringkasan', event.target.value)}
                />
                <span className="baris__meta">
                  {form.isian.ringkasan.length}/{BATAS.ringkasanMaks} karakter
                </span>
              </label>
              <Galat pesan={galat} />
              <div className="berita-form__aksi">
                <Button label={mengirim ? 'Menyimpan…' : 'Simpan'} type="submit" disabled={mengirim} />
                <Button label="Batal" style="secondary" disabled={mengirim} onClick={() => setForm(null)} />
              </div>
            </form>
          </Kartu>
        )}
        {!form && <Galat pesan={galat} />}
        <section className="kartu kartu--tabel">
          <div className="periksa__judul">
            <h2 className="timeline__judul">Berita yang tampil di situs ({daftar?.length ?? 0})</h2>
          </div>
          {daftar === null && <p className="info-kosong tabel-kosong">{galatMuat ?? 'Memuat berita…'}</p>}
          {daftar?.length === 0 && <p className="info-kosong tabel-kosong">Belum ada berita. Klik "Tambah Berita" untuk menulis berita pertama.</p>}
          {daftar?.map((berita) => (
            <article className="berita-admin" key={berita.id_berita}>
              <div className="berita-admin__teks">
                <p className="overline">{tanggalBerita(berita.tanggal)}</p>
                <h3 className="baris__judul">{berita.judul}</h3>
                <p className="baris__meta">{berita.ringkasan}</p>
              </div>
              <div className="berita-admin__aksi">
                {konfirmasiHapus === berita.id_berita ? (
                  <>
                    <span className="baris__meta">Hapus berita ini?</span>
                    <button type="button" className="tautan-polos tautan-polos--bahaya" disabled={mengirim} onClick={() => hapus(berita.id_berita)}>
                      Ya, hapus
                    </button>
                    <button type="button" className="tautan-polos" onClick={() => setKonfirmasiHapus(null)}>
                      Batal
                    </button>
                  </>
                ) : (
                  <>
                    <button type="button" className="tautan-polos" onClick={() => bukaForm(berita)}>
                      Ubah
                    </button>
                    <button type="button" className="tautan-polos tautan-polos--bahaya" onClick={() => setKonfirmasiHapus(berita.id_berita)}>
                      Hapus
                    </button>
                  </>
                )}
              </div>
            </article>
          ))}
        </section>
      </div>
    </>
  );
}

const NAMA_SEKSI: Record<string, string> = {
  TATA_PEMERINTAHAN: 'Tata Pemerintahan',
  TRANTIB: 'Ketenteraman & Ketertiban Umum',
  KESRA: 'Kesejahteraan Rakyat',
  EKONOMI: 'Ekonomi',
};
const PILIHAN_PERAN: { nilai: PeranPetugas; label: string }[] = [
  { nilai: 'ADMIN', label: 'Petugas Pelayanan' },
  { nilai: 'KASI', label: 'Kasi' },
  { nilai: 'CAMAT', label: 'Camat' },
];
const labelPeran = (akun: Pick<AkunPetugas, 'role' | 'seksi'>) =>
  akun.role === 'KASI' ? `Kasi ${NAMA_SEKSI[akun.seksi ?? ''] ?? ''}`.trim() : (PILIHAN_PERAN.find((p) => p.nilai === akun.role)?.label ?? akun.role);
const PASSWORD_MIN = 8;

type IsianAkun = { username: string; nama_lengkap: string; role: PeranPetugas; seksi: string; password: string; ulang: string };
const ISIAN_KOSONG: IsianAkun = { username: '', nama_lengkap: '', role: 'KASI', seksi: 'TATA_PEMERINTAHAN', password: '', ulang: '' };

function KelolaAkun({ saya }: { saya: string }) {
  const [daftar, setDaftar] = useState<AkunPetugas[] | null>(null);
  const [galatMuat, setGalatMuat] = useState<string | null>(null);
  // null = form tertutup; `id` terisi = mengubah akun itu.
  const [form, setForm] = useState<{ id?: string; isian: IsianAkun } | null>(null);
  const [reset, setReset] = useState<{ id: string; password: string } | null>(null);
  const [konfirmasi, setKonfirmasi] = useState<string | null>(null);
  const [galat, setGalat] = useState<string | null>(null);
  const [pesan, setPesan] = useState<string | null>(null);
  const { mengirim, mulai, lepas } = useKunciKirim();

  const muat = () =>
    daftarAkunPetugas()
      .then(setDaftar)
      .catch((error: Error) => setGalatMuat(error.message));
  useEffect(() => {
    muat();
  }, []);

  const tutupSemua = () => {
    setGalat(null);
    setPesan(null);
    setForm(null);
    setReset(null);
    setKonfirmasi(null);
  };

  const bukaForm = (akun?: AkunPetugas) => {
    tutupSemua();
    setForm(
      akun
        ? { id: akun.id_user, isian: { ...ISIAN_KOSONG, username: akun.username, nama_lengkap: akun.nama_lengkap, role: akun.role, seksi: akun.seksi ?? 'TATA_PEMERINTAHAN' } }
        : { isian: ISIAN_KOSONG },
    );
    window.scrollTo(0, 0);
  };

  const ubahIsian = (kunci: keyof IsianAkun, nilai: string) => form && setForm({ ...form, isian: { ...form.isian, [kunci]: nilai } });

  /** Jalankan aksi dengan kunci kirim, lalu muat ulang daftar. */
  const jalankan = async (aksi: () => Promise<unknown>, berhasil: string) => {
    if (!mulai()) return;
    setGalat(null);
    try {
      await aksi();
      tutupSemua();
      setPesan(berhasil);
      await muat();
    } catch (error) {
      setGalat(error instanceof ApiError ? error.message : 'Gagal menyimpan.');
    } finally {
      lepas();
    }
  };

  const simpan = (event: FormEvent) => {
    event.preventDefault();
    if (!form) return;
    const { username, nama_lengkap, role, seksi, password, ulang } = form.isian;
    const data = { nama_lengkap: nama_lengkap.trim(), role, seksi: role === 'KASI' ? seksi : null };
    if (form.id) return jalankan(() => ubahAkunPetugas(form.id!, data), `Akun ${username} diperbarui.`);
    if (!username.trim() || !data.nama_lengkap) return setGalat('Isi username dan nama.');
    if (password.length < PASSWORD_MIN) return setGalat(`Password minimal ${PASSWORD_MIN} karakter.`);
    if (password !== ulang) return setGalat('Ulangi password dengan isi yang sama.');
    return jalankan(() => tambahAkunPetugas({ ...data, username: username.trim().toLowerCase(), password }), `Akun ${username.trim().toLowerCase()} dibuat. Beri tahu pemiliknya username dan password-nya.`);
  };

  const simpanReset = (event: FormEvent, akun: AkunPetugas) => {
    event.preventDefault();
    if (!reset) return;
    if (reset.password.length < PASSWORD_MIN) return setGalat(`Password minimal ${PASSWORD_MIN} karakter.`);
    return jalankan(() => ubahAkunPetugas(akun.id_user, { password: reset.password }), `Password ${akun.username} diganti. Sesi yang sedang terbuka di akun itu ditutup.`);
  };

  return (
    <>
      <Topbar kecil="Pengaturan" judul="Kelola Akun Petugas" kanan={<Button label="Tambah Akun" arrow onClick={() => bukaForm()} />} />
      <div className="admin__konten">
        {pesan && <p className="pemberitahuan pemberitahuan--hijau pemberitahuan--kecil">{pesan}</p>}
        {form && (
          <Kartu judul={form.id ? `Ubah akun ${form.isian.username}` : 'Tambah akun petugas'}>
            <form className="berita-form" onSubmit={simpan} noValidate>
              {!form.id && (
                <label className="field">
                  <span className="field__label">Username *</span>
                  <input
                    className="field__input"
                    maxLength={50}
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    placeholder="Contoh: kasi.tapem"
                    value={form.isian.username}
                    onChange={(event) => ubahIsian('username', event.target.value)}
                  />
                  <span className="baris__meta">Huruf kecil, angka, titik, garis bawah, atau tanda hubung. Tidak bisa diubah setelah dibuat.</span>
                </label>
              )}
              <label className="field">
                <span className="field__label">Nama lengkap *</span>
                <input className="field__input" maxLength={120} value={form.isian.nama_lengkap} onChange={(event) => ubahIsian('nama_lengkap', event.target.value)} />
              </label>
              <label className="field">
                <span className="field__label">Peran *</span>
                <select className="field__input field__select" value={form.isian.role} onChange={(event) => ubahIsian('role', event.target.value)}>
                  {PILIHAN_PERAN.map((p) => (
                    <option key={p.nilai} value={p.nilai}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </label>
              {form.isian.role === 'KASI' && (
                <label className="field">
                  <span className="field__label">Seksi *</span>
                  <select className="field__input field__select" value={form.isian.seksi} onChange={(event) => ubahIsian('seksi', event.target.value)}>
                    {Object.entries(NAMA_SEKSI).map(([nilai, label]) => (
                      <option key={nilai} value={nilai}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <span className="baris__meta">Kasi hanya melihat berkas dari seksinya. Saat ini semua layanan masuk Seksi Tata Pemerintahan.</span>
                </label>
              )}
              {!form.id && (
                <>
                  <label className="field">
                    <span className="field__label">Password *</span>
                    <input className="field__input" type="password" autoComplete="new-password" value={form.isian.password} onChange={(event) => ubahIsian('password', event.target.value)} />
                    <span className="baris__meta">Minimal {PASSWORD_MIN} karakter. Pemilik akun bisa menggantinya sendiri lewat menu Ganti Password.</span>
                  </label>
                  <label className="field">
                    <span className="field__label">Ulangi password *</span>
                    <input className="field__input" type="password" autoComplete="new-password" value={form.isian.ulang} onChange={(event) => ubahIsian('ulang', event.target.value)} />
                  </label>
                </>
              )}
              <Galat pesan={galat} />
              <div className="berita-form__aksi">
                <Button label={mengirim ? 'Menyimpan…' : 'Simpan'} type="submit" disabled={mengirim} />
                <Button label="Batal" style="secondary" disabled={mengirim} onClick={tutupSemua} />
              </div>
            </form>
          </Kartu>
        )}
        {!form && <Galat pesan={galat} />}
        <section className="kartu kartu--tabel">
          <div className="periksa__judul">
            <h2 className="timeline__judul">Akun petugas ({daftar?.length ?? 0})</h2>
          </div>
          {daftar === null && <p className="info-kosong tabel-kosong">{galatMuat ?? 'Memuat akun…'}</p>}
          {daftar?.map((akun) => (
            <article className="berita-admin" key={akun.id_user}>
              <div className="berita-admin__teks">
                <p className="overline">
                  {labelPeran(akun)}
                  {akun.id_user === saya ? ' · akun Anda' : ''}
                </p>
                <h3 className="baris__judul">{akun.nama_lengkap}</h3>
                <p className="baris__meta">
                  Username: {akun.username} · <span className={`status status--${akun.aktif ? 'hijau' : 'merah'}`}>{akun.aktif ? 'Aktif' : 'Nonaktif'}</span>
                </p>
                {reset?.id === akun.id_user && (
                  <form className="berita-form" onSubmit={(event) => simpanReset(event, akun)} noValidate>
                    <label className="field">
                      <span className="field__label">Password baru untuk {akun.username}</span>
                      <input className="field__input" type="password" autoComplete="new-password" value={reset.password} onChange={(event) => setReset({ ...reset, password: event.target.value })} />
                    </label>
                    <Galat pesan={galat} />
                    <div className="berita-form__aksi">
                      <Button label={mengirim ? 'Menyimpan…' : 'Simpan Password'} type="submit" size="small" disabled={mengirim} />
                      <Button label="Batal" style="secondary" size="small" disabled={mengirim} onClick={tutupSemua} />
                    </div>
                  </form>
                )}
              </div>
              <div className="berita-admin__aksi">
                {konfirmasi === akun.id_user ? (
                  <>
                    <span className="baris__meta">{akun.aktif ? 'Nonaktifkan akun ini?' : 'Aktifkan lagi?'}</span>
                    <button
                      type="button"
                      className={`tautan-polos${akun.aktif ? ' tautan-polos--bahaya' : ''}`}
                      disabled={mengirim}
                      onClick={() => jalankan(() => ubahAkunPetugas(akun.id_user, { aktif: !akun.aktif }), `Akun ${akun.username} ${akun.aktif ? 'dinonaktifkan' : 'diaktifkan lagi'}.`)}
                    >
                      Ya
                    </button>
                    <button type="button" className="tautan-polos" onClick={() => setKonfirmasi(null)}>
                      Batal
                    </button>
                  </>
                ) : (
                  <>
                    <button type="button" className="tautan-polos" onClick={() => bukaForm(akun)}>
                      Ubah
                    </button>
                    {akun.id_user !== saya && (
                      <>
                        <button
                          type="button"
                          className="tautan-polos"
                          onClick={() => {
                            tutupSemua();
                            setReset({ id: akun.id_user, password: '' });
                          }}
                        >
                          Reset password
                        </button>
                        <button
                          type="button"
                          className={`tautan-polos${akun.aktif ? ' tautan-polos--bahaya' : ''}`}
                          onClick={() => {
                            tutupSemua();
                            setKonfirmasi(akun.id_user);
                          }}
                        >
                          {akun.aktif ? 'Nonaktifkan' : 'Aktifkan'}
                        </button>
                      </>
                    )}
                  </>
                )}
              </div>
            </article>
          ))}
        </section>
      </div>
    </>
  );
}

function GantiPassword() {
  const [isian, setIsian] = useState({ lama: '', baru: '', ulang: '' });
  const [galat, setGalat] = useState<string | null>(null);
  const [pesan, setPesan] = useState<string | null>(null);
  const { mengirim, mulai, lepas } = useKunciKirim();

  const simpan = async (event: FormEvent) => {
    event.preventDefault();
    setPesan(null);
    if (!isian.lama) return setGalat('Isi password lama.');
    if (isian.baru.length < PASSWORD_MIN) return setGalat(`Password baru minimal ${PASSWORD_MIN} karakter.`);
    if (isian.baru !== isian.ulang) return setGalat('Ulangi password baru dengan isi yang sama.');
    if (!mulai()) return;
    setGalat(null);
    try {
      await gantiPassword(isian.lama, isian.baru);
      setIsian({ lama: '', baru: '', ulang: '' });
      setPesan('Password berhasil diganti. Pakai password baru saat masuk berikutnya.');
    } catch (error) {
      setGalat(error instanceof ApiError ? error.message : 'Gagal mengganti password.');
    } finally {
      lepas();
    }
  };

  const kolom = (kunci: keyof typeof isian, label: string, autoComplete: string) => (
    <label className="field">
      <span className="field__label">{label}</span>
      <input className="field__input" type="password" autoComplete={autoComplete} value={isian[kunci]} onChange={(event) => setIsian({ ...isian, [kunci]: event.target.value })} />
    </label>
  );

  return (
    <>
      <Topbar kecil="Pengaturan" judul="Ganti Password" />
      <div className="admin__konten">
        <Kartu judul="Password akun Anda">
          <form className="berita-form" onSubmit={simpan} noValidate>
            {kolom('lama', 'Password lama', 'current-password')}
            {kolom('baru', `Password baru (minimal ${PASSWORD_MIN} karakter)`, 'new-password')}
            {kolom('ulang', 'Ulangi password baru', 'new-password')}
            <Galat pesan={galat} />
            {pesan && <p className="pemberitahuan pemberitahuan--hijau pemberitahuan--kecil">{pesan}</p>}
            <div className="berita-form__aksi">
              <Button label={mengirim ? 'Menyimpan…' : 'Simpan'} type="submit" disabled={mengirim} />
            </div>
          </form>
        </Kartu>
      </div>
    </>
  );
}

/** Menu bisa dibuka langsung lewat alamat, mis. /admin?tab=Berita. */
const tabAwal = () => {
  const diminta = new URLSearchParams(window.location.search).get('tab');
  return diminta && ([TAB_BERITA, TAB_AKUN, TAB_PASSWORD].includes(diminta) || TAB.some((t) => t.label === diminta)) ? diminta : 'Semua';
};

export function Admin() {
  const sesi = ambilSesi();
  const id = new URLSearchParams(window.location.search).get('id');
  const [data, setData] = useState<Ringkas[] | null>(null);
  const [tab, setTab] = useState(tabAwal);
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

  // Daftar berkas dan angka di menu diperbarui otomatis; galat jaringan sesaat diabaikan.
  useSegarkanOtomatis(() => {
    if (petugas)
      ambilAntrian(petugas.role === 'ADMIN')
        .then(setData)
        .catch(() => undefined);
  }, petugas !== null);

  if (!petugas) return null;

  const keTab = (label: string) => {
    // Dari halaman detail, kembali ke panel dengan menu yang dipilih tetap terbuka.
    if (id) window.location.assign(`/admin?tab=${encodeURIComponent(label)}`);
    else setTab(label);
  };

  return (
    <div className="admin">
      <Sidebar user={petugas} data={data ?? []} tab={tab} keTab={keTab} />
      <main className="admin__utama">
        <Galat pesan={galat} />
        {data &&
          (tab === TAB_PASSWORD && !id ? (
            <GantiPassword />
          ) : petugas.role === 'ADMIN' ? (
            id ? (
              <DetailAdmin id={id} />
            ) : tab === TAB_BERITA ? (
              <KelolaBerita />
            ) : tab === TAB_AKUN ? (
              <KelolaAkun saya={petugas.id_user} />
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
