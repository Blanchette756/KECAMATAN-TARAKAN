import { useEffect, useState } from 'react';
import { ApiError, detailPengajuan, keluarAkun, kirimRevisi, pengajuanSaya, unggahBerkas, type BerkasDetail, type BerkasKirim, type DetailPengajuan, type Ringkas } from '../api';
import { Icon } from '../components/Icon';
import { PenampilDaftarBerkas } from '../components/PenampilBerkas';
import { BarisData, cekBerkas, Galat, jumlahTahapSelesai, Kartu, StatusBadge, TahapPermohonan, tanggal, useCegahBukaFile, useKunciKirim, useSeretLepas } from '../components/portal';
import { SiteFooter } from '../components/SiteFooter';
import { SiteHeader } from '../components/SiteHeader';
import { Button } from '../components/ui';
import { ALAMAT_SINGKAT, JAM_PELAYANAN, TAUTAN_WA, WHATSAPP } from '../data/kontak';
import { ambilSesi, hapusSesi } from '../sesi';

const DIPROSES = ['DIAJUKAN', 'DIKEMBALIKAN_KE_ADMIN', 'MENUNGGU_PARAF_KASI', 'MENUNGGU_TTE_CAMAT'];
const TAB: { label: string; cocok: (status: string) => boolean }[] = [
  { label: 'Semua', cocok: () => true },
  { label: 'Diproses', cocok: (status) => DIPROSES.includes(status) },
  { label: 'Perlu Perbaikan', cocok: (status) => status === 'PERLU_REVISI' },
  { label: 'Selesai', cocok: (status) => ['SIAP_DIAMBIL', 'SELESAI'].includes(status) },
];

const keluar = async () => {
  await keluarAkun();
  hapusSesi();
  window.location.assign('/');
};

function Daftar() {
  const [data, setData] = useState<Ringkas[] | null>(null);
  const [tab, setTab] = useState('Semua');
  const [galat, setGalat] = useState<string | null>(null);

  useEffect(() => {
    pengajuanSaya()
      .then(setData)
      .catch((error: Error) => setGalat(error.message));
  }, []);

  const hitung = (daftar: string[]) => data?.filter((item) => daftar.includes(item.status_pengajuan)).length ?? 0;
  const statistik = [
    { angka: hitung(DIPROSES), label: 'Sedang diproses', status: 'DIAJUKAN', badge: 'Diproses' },
    { angka: hitung(['PERLU_REVISI']), label: 'Perlu perbaikan', status: 'PERLU_REVISI', badge: 'Perlu Perbaikan' },
    { angka: hitung(['SIAP_DIAMBIL']), label: 'Siap diambil', status: 'SIAP_DIAMBIL', badge: 'Selesai' },
  ];

  return (
    <>
      <div className="kepala">
        <p className="baris__meta only-desktop">Beranda › Pelayanan › Permohonan Saya</p>
        <div className="kepala__baris">
          <div>
            <h1 className="kepala__judul">Permohonan Saya</h1>
            <p className="heading__desc">Pantau semua permohonan Anda di satu tempat.</p>
          </div>
          <div className="kepala__aksi">
            <a className="tautan-polos" href="/profil">
              Profil saya
            </a>
            <button type="button" className="tautan-polos" onClick={keluar}>
              Keluar
            </button>
            <Button label="Ajukan Permohonan Baru" arrow href="/ajukan" />
          </div>
        </div>
      </div>
      <div className="portal__isi">
        <Galat pesan={galat} />
        <div className="ringkas-grid">
          {statistik.map(({ angka, label, status, badge }) => (
            <div className="ringkas" key={label}>
              <div className="ringkas__atas">
                <span className="info-judul__teks">{angka}</span>
                <StatusBadge status={status} label={badge} />
              </div>
              <span className="tile__desc">{label}</span>
            </div>
          ))}
          <div className="ringkas">
            <div className="ringkas__atas">
              <span className="info-judul__teks">{data?.length ?? 0}</span>
              <StatusBadge status="DIAJUKAN" label="Diajukan" />
            </div>
            <span className="tile__desc">Total permohonan</span>
          </div>
        </div>
        <div className="chips">
          {TAB.map(({ label, cocok }) => (
            <button key={label} type="button" className={`chip${label === tab ? ' chip--selected' : ''}`} aria-pressed={label === tab} onClick={() => setTab(label)}>
              {label}
              <span className="chip__jumlah">{data?.filter((item) => cocok(item.status_pengajuan)).length ?? 0}</span>
            </button>
          ))}
        </div>
        {data?.length === 0 && <p className="heading__desc">Belum ada permohonan.</p>}
        {data
          ?.filter((item) => TAB.find((t) => t.label === tab)!.cocok(item.status_pengajuan))
          .map((item) => {
            const perbaiki = item.status_pengajuan === 'PERLU_REVISI';
            return (
              <article className={`permohonan${perbaiki ? ' permohonan--perbaikan' : ''}`} key={item.id_pengajuan}>
                <div className="permohonan__info">
                  <p className="overline">{item.no_registrasi}</p>
                  <h2 className="timeline__judul">{item.nama_layanan}</h2>
                  <p className="baris__meta">Diajukan {tanggal(item.tgl_pengajuan)} WITA</p>
                </div>
                <div className="permohonan__progres">
                  <p className="baris__meta">{item.label_status}</p>
                  <div className="progres">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <span key={i} className={i < jumlahTahapSelesai(item.status_pengajuan) ? 'progres__isi' : ''} />
                    ))}
                  </div>
                </div>
                <StatusBadge status={item.status_pengajuan} />
                <Button label={perbaiki ? 'Perbaiki' : 'Lihat Detail'} style="secondary" arrow href={`/permohonan?id=${item.id_pengajuan}`} />
              </article>
            );
          })}
      </div>
    </>
  );
}

function BarisBerkas({ berkas, onLihat }: { berkas: BerkasDetail; onLihat?: () => void }) {
  return (
    <article className="dokumen">
      <span className="dokumen__ikon">
        <Icon name="file-text-sm" />
      </span>
      <div className="dokumen__teks">
        <h3 className="baris__judul">{berkas.nama_syarat}</h3>
        <p className="baris__meta">{berkas.nama_file}</p>
      </div>
      {onLihat && (
        <button type="button" className="tautan-polos" onClick={onLihat}>
          Lihat
        </button>
      )}
    </article>
  );
}

function SlotPerbaikan({ berkas, pengganti, sibuk, onPilih }: { berkas: BerkasDetail; pengganti?: BerkasKirim; sibuk: boolean; onPilih: (file: File) => void }) {
  const { diAtas, props } = useSeretLepas(onPilih);
  return (
    <div className={`slot slot--perbaikan${diAtas ? ' slot--seret' : ''}`} {...props}>
      <div className="slot__judul">
        <p className="baris__judul">{berkas.nama_syarat}</p>
        <span className="syarat__tag syarat__tag--wajib">Wajib</span>
      </div>
      <div className="slot__file">
        <div className="dokumen__teks">
          <p className="baris__judul">{pengganti?.nama_file ?? berkas.nama_file}</p>
          <p className="baris__meta">{sibuk ? 'Mengunggah…' : pengganti ? 'Berkas baru siap dikirim' : 'Seret file baru ke sini, atau pilih Unggah ulang'}</p>
        </div>
        <label className="tautan-polos">
          Unggah ulang
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
        </label>
      </div>
      {berkas.catatan_admin && <p className="tracker__error">Catatan petugas: {berkas.catatan_admin}</p>}
    </div>
  );
}

function Perbaikan({ data, onSelesai }: { data: DetailPengajuan; onSelesai: () => void }) {
  const ditandai = data.berkas.filter((berkas) => berkas.status_berkas === 'PERLU_PERBAIKAN');
  const [baru, setBaru] = useState<Record<string, BerkasKirim>>({});
  const [sibuk, setSibuk] = useState<string | null>(null);
  const { mengirim, mulai: mulaiKirim, lepas: lepasKirim } = useKunciKirim();
  const [galat, setGalat] = useState<string | null>(null);
  useCegahBukaFile();

  const pilih = async (idSyarat: string, file: File) => {
    const masalah = cekBerkas(file);
    setGalat(masalah);
    if (masalah) return;
    setSibuk(idSyarat);
    try {
      const hasil = await unggahBerkas(file);
      setBaru((lama) => ({ ...lama, [idSyarat]: { id_syarat: idSyarat, ...hasil } }));
    } catch (error) {
      setGalat(error instanceof ApiError ? error.message : 'Unggah gagal.');
    } finally {
      setSibuk(null);
    }
  };

  const kirim = async () => {
    if (!mulaiKirim()) return;
    setGalat(null);
    try {
      await kirimRevisi(data.id_pengajuan, Object.values(baru), data.version);
      onSelesai();
    } catch (error) {
      setGalat(error instanceof ApiError ? error.message : 'Gagal mengirim perbaikan.');
      lepasKirim();
    }
  };

  return (
    <Kartu judul="Perbaiki berkas">
      {ditandai.map((berkas) => (
        <SlotPerbaikan
          key={berkas.id_berkas}
          berkas={berkas}
          pengganti={baru[berkas.id_syarat]}
          sibuk={sibuk === berkas.id_syarat}
          onPilih={(file) => pilih(berkas.id_syarat, file)}
        />
      ))}
      <p className="baris__meta">
        {Object.keys(baru).length} dari {ditandai.length} berkas sudah diperbaiki
      </p>
      <Galat pesan={galat} />
      <div>
        <Button
          label={mengirim ? 'Mengirim…' : 'Kirim Perbaikan'}
          arrow={!mengirim}
          disabled={mengirim || sibuk !== null || Object.keys(baru).length < ditandai.length}
          onClick={kirim}
        />
      </div>
    </Kartu>
  );
}

function Detail({ id }: { id: string }) {
  const [data, setData] = useState<DetailPengajuan | null>(null);
  const [galat, setGalat] = useState<string | null>(null);
  const [lihat, setLihat] = useState<number | null>(null);
  const muat = () =>
    detailPengajuan(id)
      .then(setData)
      .catch((error: Error) => setGalat(error.message));

  useEffect(() => {
    muat();
  }, [id]);

  if (!data) return <div className="portal__isi">{galat ? <Galat pesan={galat} /> : <p className="heading__desc">Memuat…</p>}</div>;

  const status = data.status_pengajuan;
  const siap = status === 'SIAP_DIAMBIL' || status === 'SELESAI';
  // Hanya berkas yang benar-benar punya file (data contoh tidak punya) yang bisa dibuka di penampil.
  const adaFile = data.berkas.filter((berkas) => berkas.file_url);

  return (
    <>
      <div className="kepala">
        <p className="baris__meta">
          <a href="/permohonan">Permohonan Saya</a> › {data.no_registrasi}
        </p>
        <div className="kepala__baris">
          <div>
            <h1 className="kepala__judul">{data.nama_layanan}</h1>
            <p className="baris__meta">
              Kode {data.no_registrasi} · Diajukan {tanggal(data.tgl_pengajuan)} WITA
            </p>
          </div>
          <StatusBadge status={status} />
        </div>
      </div>
      <div className="portal__dua">
        <div className="portal__utama">
          {status === 'PERLU_REVISI' && (
            <>
              <div className="pemberitahuan pemberitahuan--merah">
                <strong>{data.berkas.filter((berkas) => berkas.status_berkas === 'PERLU_PERBAIKAN').length} berkas perlu diperbaiki</strong>
                <span>{data.catatan_revisi ?? 'Unggah ulang berkas yang diminta. Proses akan dilanjutkan setelah perbaikan dikirim.'}</span>
              </div>
              <Perbaikan data={data} onSelesai={muat} />
            </>
          )}
          {DIPROSES.includes(status) && (
            <div className="pemberitahuan">
              <strong>Saat ini: {data.label_status}</strong>
              <span>Berkas Anda sedang diproses. Surat selesai paling lambat 1 hari kerja setelah berkas lengkap.</span>
            </div>
          )}
          {siap && (
            <div className="pemberitahuan pemberitahuan--hijau">
              <strong>{status === 'SELESAI' ? 'Surat sudah diambil' : 'Surat Anda sudah selesai dan siap diambil'}</strong>
              <span>Tunjukkan kode {data.no_registrasi} kepada petugas. Bawa dokumen asli dan KTP saat mengambil surat.</span>
            </div>
          )}
          {status === 'DITOLAK' && (
            <div className="pemberitahuan pemberitahuan--merah">
              <strong>Permohonan ditolak</strong>
              <span>{data.alasan_penolakan}</span>
            </div>
          )}
          <Kartu judul="Tahapan permohonan">
            <TahapPermohonan data={data} />
          </Kartu>
        </div>
        <aside className="portal__samping">
          {siap && (
            <Kartu>
              <div className="kode-ambil">
                <p className="baris__meta">Kode pengambilan</p>
                <p className="info-judul__teks">{data.no_registrasi}</p>
              </div>
            </Kartu>
          )}
          <Kartu judul={`Berkas Anda (${data.berkas.length})`}>
            {data.berkas.map((berkas) => (
              <BarisBerkas berkas={berkas} key={berkas.id_berkas} onLihat={berkas.file_url ? () => setLihat(adaFile.indexOf(berkas)) : undefined} />
            ))}
          </Kartu>
          {lihat !== null && <PenampilDaftarBerkas daftar={adaFile} indeksAwal={lihat} onTutup={() => setLihat(null)} />}
          <Kartu judul="Pengambilan surat">
            <dl>
              <BarisData label="Lokasi" nilai="Kantor Kecamatan Tarakan Timur" />
              <BarisData label="Alamat" nilai={ALAMAT_SINGKAT} />
              <BarisData label="Jam" nilai={JAM_PELAYANAN} />
              <BarisData label="Bawa" nilai="Dokumen asli & KTP" />
            </dl>
            <a className="baris__meta" href={TAUTAN_WA} target="_blank" rel="noreferrer">
              Ada pertanyaan? WhatsApp {WHATSAPP}
            </a>
          </Kartu>
        </aside>
      </div>
    </>
  );
}

export function PermohonanSaya() {
  const sesi = ambilSesi();
  const id = new URLSearchParams(window.location.search).get('id');

  useEffect(() => {
    if (!sesi) window.location.replace('/masuk?ke=/permohonan');
    else if (sesi.user.role !== 'WARGA') window.location.replace('/admin');
    else if (!sesi.user.profil_lengkap) window.location.replace('/profil?ke=/permohonan');
  }, []);

  if (!sesi) return null;

  return (
    <>
      <SiteHeader aktif="Pelayanan" />
      <main className="portal">{id ? <Detail id={id} /> : <Daftar />}</main>
      <SiteFooter />
    </>
  );
}
