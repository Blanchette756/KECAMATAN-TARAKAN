import { useEffect, useRef, useState, type DragEvent as ReactDragEvent, type ReactNode } from 'react';
import { ambilLayanan, type DetailLayananApi, type DetailPengajuan, type FieldFormulir, type Kondisi } from '../api';
import { Icon } from './Icon';

/**
 * Kunci tombol kirim supaya aksi hanya jalan sekali walau diklik dua kali cepat atau Enter ditekan berulang.
 * Memakai ref (langsung berlaku), bukan hanya state yang baru berlaku setelah render berikutnya.
 * Setelah berhasil kunci tidak dilepas, karena halaman berpindah; jika gagal, panggil `lepas()`.
 */
export function useKunciKirim() {
  const terkunci = useRef(false);
  const [mengirim, setMengirim] = useState(false);
  const mulai = () => {
    if (terkunci.current) return false;
    terkunci.current = true;
    setMengirim(true);
    return true;
  };
  const lepas = () => {
    terkunci.current = false;
    setMengirim(false);
  };
  return { mengirim, mulai, lepas };
}

const FORMAT_BERKAS = ['application/pdf', 'image/jpeg', 'image/png'];
const MAKS_UKURAN_BERKAS = 2 * 1024 * 1024;
/** Foto dikecilkan sampai di bawah angka ini (bukan tepat 2 MB), supaya selalu lolos batas server. */
const SASARAN_FOTO = 1.8 * 1024 * 1024;
/** Sisi terpanjang foto setelah dikecilkan: cukup tajam untuk tulisan di KTP/KK, jauh lebih ringan dari foto kamera. */
const SISI_FOTO_AWAL = 2400;
const MIME_DARI_EKSTENSI: Record<string, string> = { pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png' };

/** Sebagian HP Android mengirim tipe kosong atau "image/jpg"; tipenya dirapikan dari nama file bila perlu. */
function jenisBerkas(file: File): string {
  if (file.type === 'image/jpg') return 'image/jpeg';
  if (file.type) return file.type;
  return MIME_DARI_EKSTENSI[file.name.split('.').pop()?.toLowerCase() ?? ''] ?? '';
}

const keBlob = (kanvas: HTMLCanvasElement, mutu: number) => new Promise<Blob | null>((selesai) => kanvas.toBlob(selesai, 'image/jpeg', mutu));

/** Kecilkan foto menjadi JPEG di bawah SASARAN_FOTO. null bila gagal (foto rusak atau memori HP habis). */
async function kecilkanFoto(file: File): Promise<File | null> {
  const url = URL.createObjectURL(file);
  try {
    const gambar = await new Promise<HTMLImageElement>((selesai, gagal) => {
      const elemen = new Image();
      elemen.onload = () => selesai(elemen);
      elemen.onerror = () => gagal(new Error('Foto tidak dapat dibaca'));
      elemen.src = url;
    });
    const lebar = gambar.naturalWidth;
    const tinggi = gambar.naturalHeight;
    const sisiAsli = Math.max(lebar, tinggi);
    const kanvas = document.createElement('canvas');
    const pena = kanvas.getContext('2d');
    if (!pena || sisiAsli === 0) return null;

    const namaDasar = file.name.replace(/\.[^.]+$/, '') || 'foto';
    let sisi = Math.min(sisiAsli, SISI_FOTO_AWAL);
    for (let putaran = 0; putaran < 6; putaran++) {
      const skala = sisi / sisiAsli;
      kanvas.width = Math.max(1, Math.round(lebar * skala));
      kanvas.height = Math.max(1, Math.round(tinggi * skala));
      // Latar putih: PNG transparan akan tampak hitam bila disimpan sebagai JPEG.
      pena.fillStyle = '#fff';
      pena.fillRect(0, 0, kanvas.width, kanvas.height);
      pena.drawImage(gambar, 0, 0, kanvas.width, kanvas.height);
      for (const mutu of [0.85, 0.72, 0.6, 0.5]) {
        const hasil = await keBlob(kanvas, mutu);
        if (hasil && hasil.size <= SASARAN_FOTO) return new File([hasil], `${namaDasar}.jpg`, { type: 'image/jpeg' });
      }
      sisi = Math.round(sisi * 0.8);
    }
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Siapkan berkas sebelum diunggah: cek format, lalu kecilkan otomatis foto yang lebih dari 2 MB
 * (foto kamera HP biasanya 3-8 MB). PDF tidak bisa dikecilkan di browser, jadi PDF di atas 2 MB ditolak.
 * `saatMengecilkan` dipanggil sebelum proses yang bisa memakan beberapa detik di HP lama.
 */
export async function siapkanBerkas(asli: File, saatMengecilkan?: () => void): Promise<{ file: File; galat: null } | { file: null; galat: string }> {
  const jenis = jenisBerkas(asli);
  if (!FORMAT_BERKAS.includes(jenis)) return { file: null, galat: `${asli.name} bukan file JPG, PNG, atau PDF.` };
  const file = jenis === asli.type ? asli : new File([asli], asli.name, { type: jenis });
  if (file.size <= MAKS_UKURAN_BERKAS) return { file, galat: null };
  if (jenis === 'application/pdf') {
    return { file: null, galat: `${asli.name} (${ukuranFile(asli.size)}) melebihi batas 2 MB. PDF tidak bisa dikecilkan otomatis: pindai ulang dengan kualitas lebih rendah, atau kirim sebagai foto.` };
  }
  saatMengecilkan?.();
  // Beri waktu layar menampilkan "Mengecilkan…" sebelum HP sibuk memproses gambar.
  await new Promise((selesai) => setTimeout(selesai, 50));
  try {
    const kecil = await kecilkanFoto(file);
    if (kecil) return { file: kecil, galat: null };
  } catch {
    // Jatuh ke pesan di bawah.
  }
  return { file: null, galat: `${asli.name} tidak dapat dikecilkan sampai di bawah 2 MB. Coba foto ulang, atau pilih foto lain.` };
}

/**
 * Tanpa ini, file yang dijatuhkan sedikit di luar kotak unggah akan dibuka browser
 * dan halaman ditinggalkan, sehingga semua isian dan unggahan hilang.
 */
export function useCegahBukaFile() {
  useEffect(() => {
    const cegah = (event: DragEvent) => {
      if (event.dataTransfer?.types.includes('Files')) event.preventDefault();
    };
    window.addEventListener('dragover', cegah);
    window.addEventListener('drop', cegah);
    return () => {
      window.removeEventListener('dragover', cegah);
      window.removeEventListener('drop', cegah);
    };
  }, []);
}

/** Seret-lepas file ke satu kotak unggah. `diAtas` dipakai untuk menyorot kotak saat file diseret di atasnya. */
export function useSeretLepas(onPilih: (file: File) => void) {
  const [diAtas, setDiAtas] = useState(false);
  const props = {
    onDragOver: (event: ReactDragEvent<HTMLElement>) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
      setDiAtas(true);
    },
    onDragLeave: (event: ReactDragEvent<HTMLElement>) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDiAtas(false);
    },
    onDrop: (event: ReactDragEvent<HTMLElement>) => {
      event.preventDefault();
      setDiAtas(false);
      const file = event.dataTransfer.files[0];
      if (file) onPilih(file);
    },
  };
  return { diAtas, props };
}

/** Berkas yang sedang diunggah, per id persyaratan. */
export interface ProsesUnggah {
  nama: string;
  persen: number;
  /** true selama foto dikecilkan, sebelum mulai diunggah. */
  siapkan?: boolean;
}

/** Salinan objek tanpa satu kunci (mis. berkas yang selesai diunggah). */
export function tanpaKunci<T>(objek: Record<string, T>, kunci: string): Record<string, T> {
  const salinan = { ...objek };
  delete salinan[kunci];
  return salinan;
}

/** Tanda unggah yang jelas: ikon berputar, nama file, bilah kemajuan, dan persentase. */
export function TandaUnggah({ proses }: { proses: ProsesUnggah }) {
  if (proses.siapkan) {
    return (
      <div className="unggah-proses" role="status" aria-live="polite">
        <span className="pemuat" aria-hidden="true" />
        <div className="unggah-proses__teks">
          <p className="baris__judul">Mengecilkan {proses.nama}…</p>
          <p className="baris__meta">Foto dikecilkan otomatis agar di bawah 2 MB. Tunggu sebentar.</p>
        </div>
      </div>
    );
  }
  return (
    <div className="unggah-proses" role="status" aria-live="polite">
      <span className="pemuat" aria-hidden="true" />
      <div className="unggah-proses__teks">
        <p className="baris__judul">Mengunggah {proses.nama}…</p>
        <div className="progres-tunggal" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={proses.persen} aria-label={`Kemajuan unggah ${proses.nama}`}>
          <span style={{ width: `${proses.persen}%` }} />
        </div>
      </div>
      <span className="unggah-proses__persen">{proses.persen}%</span>
    </div>
  );
}

/** Label singkat dan warna badge mengikuti Figma; status backend lebih rinci. */
const BADGE: Record<string, { label: string; warna: string }> = {
  DIAJUKAN: { label: 'Diajukan', warna: 'netral' },
  PERLU_REVISI: { label: 'Perlu Perbaikan', warna: 'merah' },
  DIKEMBALIKAN_KE_ADMIN: { label: 'Diperiksa', warna: 'kuning' },
  MENUNGGU_PARAF_KASI: { label: 'Diperiksa', warna: 'kuning' },
  MENUNGGU_TTE_CAMAT: { label: 'Divalidasi', warna: 'garis-primer' },
  SIAP_DIAMBIL: { label: 'Selesai', warna: 'hijau' },
  SELESAI: { label: 'Selesai', warna: 'hijau' },
  DITOLAK: { label: 'Ditolak', warna: 'merah' },
};

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const { label: teks, warna } = BADGE[status] ?? BADGE.DIAJUKAN;
  return <span className={`status status--${warna}`}>{label ?? teks}</span>;
}

const TAHAP = ['Permohonan diajukan', 'Berkas diperiksa & dinyatakan lengkap', 'Divalidasi Kasi Tata Pemerintahan', 'Tanda tangan Camat', 'Selesai — siap diambil'];

/** Urutan tahap yang sedang berjalan untuk tiap status. */
const POSISI: Record<string, number> = { DIAJUKAN: 1, PERLU_REVISI: 1, DIKEMBALIKAN_KE_ADMIN: 1, MENUNGGU_PARAF_KASI: 2, MENUNGGU_TTE_CAMAT: 3, SIAP_DIAMBIL: 5, SELESAI: 5 };

export const jumlahTahapSelesai = (status: string) => POSISI[status] ?? 0;

export const tanggal = (iso: string) => new Date(iso).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Makassar' }).replace(':', '.');

export function TahapPermohonan({ data }: { data: DetailPengajuan }) {
  const posisi = POSISI[data.status_pengajuan] ?? 0;
  const gagal = data.status_pengajuan === 'PERLU_REVISI' || data.status_pengajuan === 'DITOLAK';
  return (
    <ol className="tahap">
      {TAHAP.map((judul, urutan) => {
        const kondisi = urutan < posisi ? 'selesai' : urutan === posisi ? (gagal ? 'gagal' : 'aktif') : 'menunggu';
        return (
          <li className={`tahap__item tahap__item--${kondisi}`} key={judul}>
            <span className="tahap__titik">{kondisi === 'selesai' && <Icon name="check" />}</span>
            <div>
              <p className="baris__judul">{judul}</p>
              <p className="baris__meta">{kondisi === 'aktif' ? 'Sedang berjalan' : kondisi === 'gagal' ? 'Perlu tindakan' : kondisi === 'selesai' ? 'Selesai' : 'Menunggu'}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function Riwayat({ data }: { data: DetailPengajuan }) {
  return (
    <ol className="tahap">
      {data.riwayat.map((r) => (
        <li className="tahap__item tahap__item--selesai" key={`${r.waktu}-${r.ke}`}>
          <span className="tahap__titik">
            <Icon name="check" />
          </span>
          <div>
            <p className="baris__judul">{r.label}</p>
            <p className="baris__meta">{tanggal(r.waktu)} WITA</p>
            {r.catatan && <p className="baris__meta">{r.catatan}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}

export function Kartu({ judul, aksi, children, className = '' }: { judul?: ReactNode; aksi?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`kartu ${className}`.trim()}>
      {(judul || aksi) && (
        <div className="kartu__judul">
          <h2 className="tile__title">{judul}</h2>
          {aksi}
        </div>
      )}
      {children}
    </section>
  );
}

export const BarisData = ({ label, nilai }: { label: string; nilai: ReactNode }) => (
  <div className="fakta__baris">
    <dt>{label}</dt>
    <dd>{nilai}</dd>
  </div>
);

export const ukuranFile = (byte: number) => (byte < 1024 * 1024 ? `${Math.round(byte / 1024)} KB` : `${(byte / 1024 / 1024).toFixed(1)} MB`);

export const Galat = ({ pesan }: { pesan: string | null }) =>
  pesan && (
    <p className="tracker__error" role="alert">
      {pesan}
    </p>
  );

/** Isian atau persyaratan bersyarat hanya berlaku bila jawaban sebelumnya cocok (mis. akta cerai hanya untuk "cerai hidup"). */
export const berlaku = (kondisi: Kondisi | undefined, data: Record<string, string>) => {
  if (!kondisi) return true;
  const nilai = data[kondisi.field];
  return kondisi.sama_dengan !== undefined ? nilai === kondisi.sama_dengan : (kondisi.salah_satu ?? []).includes(nilai);
};

/** Ubah isian (semua teks di form) menjadi data kiriman: kolom kosong dibuang, kolom angka menjadi bilangan. */
export function isianUntukDikirim(fields: FieldFormulir[], isian: Record<string, string>): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  for (const field of fields) {
    const nilai = isian[field.key]?.trim();
    if (nilai) data[field.key] = field.tipe === 'angka' ? Number(nilai) : nilai;
  }
  return data;
}

/** Dua isian dianggap sama bila kunci dan nilainya sama, apa pun urutannya. */
export function isianSama(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
  const urut = (x: Record<string, unknown>) => JSON.stringify(Object.entries(x).sort(([k1], [k2]) => k1.localeCompare(k2)));
  return urut(a) === urut(b);
}

/** Kolom isian formulir layanan (teks, tanggal, angka, atau pilihan). Dipakai saat mengajukan dan saat memperbaiki isian. */
export function KolomIsian({ fields, nilai, onUbah }: { fields: FieldFormulir[]; nilai: Record<string, string>; onUbah: (kunci: string, isi: string) => void }) {
  if (fields.length === 0) return null;
  return (
    <div className="isian">
      {fields.map((field) =>
        field.tipe === 'pilihan' ? (
          <label className="field" key={field.key}>
            <span className="field__label">
              {field.label}
              {field.wajib ? ' *' : ''}
            </span>
            <select className="field__input field__select" value={nilai[field.key] ?? ''} onChange={(event) => onUbah(field.key, event.target.value)}>
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
              value={nilai[field.key] ?? ''}
              onChange={(event) => onUbah(field.key, event.target.value)}
            />
          </label>
        ),
      )}
    </div>
  );
}

const cacheLayanan = new Map<string, Promise<DetailLayananApi>>();

/** Definisi layanan dimuat sekali per layanan; dipakai untuk memberi label pada isian formulir. */
function muatLayanan(id: string) {
  let janji = cacheLayanan.get(id);
  if (!janji) {
    janji = ambilLayanan(id);
    cacheLayanan.set(id, janji);
    janji.catch(() => cacheLayanan.delete(id));
  }
  return janji;
}

const tampilTanggal = (nilai: string) => new Date(`${nilai}T00:00:00Z`).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

type SumberIsian = Pick<DetailPengajuan, 'id_layanan' | 'data_formulir'>;

/** Isian formulir yang diisi pemohon (nama kapal, perihal, dst.), dengan label sesuai definisi layanan. */
export function useIsianFormulir(data: SumberIsian): { label: string; nilai: string }[] {
  const [layanan, setLayanan] = useState<DetailLayananApi | null>(null);
  useEffect(() => {
    let batal = false;
    muatLayanan(data.id_layanan)
      .then((hasil) => !batal && setLayanan(hasil))
      .catch(() => undefined);
    return () => {
      batal = true;
    };
  }, [data.id_layanan]);

  const isian = data.data_formulir ?? {};
  const terisi = (nilai: unknown) => nilai !== undefined && nilai !== null && String(nilai).trim() !== '';
  if (!layanan) {
    // Sebelum definisi layanan termuat (atau bila gagal), isinya tetap tampil dengan label dari nama kuncinya.
    return Object.entries(isian)
      .filter(([, nilai]) => terisi(nilai))
      .map(([kunci, nilai]) => ({ label: kunci.replace(/_/g, ' ').replace(/^./, (huruf) => huruf.toUpperCase()), nilai: String(nilai) }));
  }
  return layanan.form_fields
    .filter((field) => terisi(isian[field.key]))
    .map((field) => {
      const mentah = String(isian[field.key]);
      const nilai = field.tipe === 'pilihan' ? (field.opsi?.find((opsi) => opsi.nilai === mentah)?.label ?? mentah) : field.tipe === 'tanggal' ? tampilTanggal(mentah) : mentah;
      return { label: field.label, nilai };
    });
}

const NilaiIsian = ({ teks }: { teks: string }) => <span style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{teks}</span>;

/** Baris isian untuk dimasukkan ke dalam <dl> yang sudah ada. */
export function BarisIsian({ data }: { data: SumberIsian }) {
  const isian = useIsianFormulir(data);
  return (
    <>
      {isian.map(({ label, nilai }) => (
        <BarisData key={label} label={label} nilai={<NilaiIsian teks={nilai} />} />
      ))}
    </>
  );
}

/** Kartu sendiri berisi isian formulir. Tidak tampil bila layanan tidak punya isian (mis. Legalisasi Dokumen). */
export function KartuIsian({ data, judul = 'Isian pemohon' }: { data: SumberIsian; judul?: string }) {
  const isian = useIsianFormulir(data);
  if (isian.length === 0) return null;
  return (
    <Kartu judul={judul}>
      <dl>
        {isian.map(({ label, nilai }) => (
          <BarisData key={label} label={label} nilai={<NilaiIsian teks={nilai} />} />
        ))}
      </dl>
    </Kartu>
  );
}
