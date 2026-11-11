import { ambilSesi, hapusSesi, type Pengguna } from './sesi';

/** Kosong saat pengembangan (lewat proxy Vite). Saat deploy isi VITE_API_URL, misalnya https://api.domain. */
const API_URL = `${import.meta.env.VITE_API_URL ?? ''}/api/v1`;

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status = 0,
  ) {
    super(message);
  }
}

const izin = (): Record<string, string> => {
  const sesi = ambilSesi();
  return sesi ? { authorization: `Bearer ${sesi.token}` } : {};
};

interface Respons<T> {
  data: T;
  meta?: { page: number; limit: number; total: number; total_halaman: number };
}

async function panggilLengkap<T>(path: string, init?: RequestInit): Promise<Respons<T>> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { ...init, headers: { ...izin(), ...init?.headers } });
  } catch {
    throw new ApiError('Server tidak dapat dihubungi. Coba lagi beberapa saat lagi.');
  }
  // Token tidak berlaku lagi, misalnya setelah backend dimulai ulang. Petugas kembali ke halaman masuk petugas.
  const sesi = ambilSesi();
  if (res.status === 401 && sesi) {
    hapusSesi();
    window.location.assign(sesi.user.role === 'WARGA' ? `/masuk?ke=${encodeURIComponent(window.location.pathname + window.location.search)}` : '/masuk-petugas');
  }
  const body = await res.json().catch(() => null);
  if (!res.ok || body === null) {
    const rincian = Array.isArray(body?.error?.details) ? `: ${body.error.details.join('; ')}` : '';
    throw new ApiError(`${body?.error?.message ?? 'Terjadi kesalahan pada server. Coba lagi beberapa saat lagi.'}${rincian}`, res.status);
  }
  return body as Respons<T>;
}

const panggil = async <T>(path: string, init?: RequestInit): Promise<T> => (await panggilLengkap<T>(path, init)).data;

export interface Persyaratan {
  id_syarat: string;
  nama_syarat: string;
  wajib: boolean;
  keterangan?: string;
}

export interface DaftarPersyaratan {
  id_layanan: string;
  nama_layanan: string;
  persyaratan: Persyaratan[];
}

export const ambilPersyaratan = (idLayanan: string) => panggil<DaftarPersyaratan>(`/layanan/${idLayanan}/persyaratan`);

const kirimJson = <T>(method: string, path: string, data?: unknown) =>
  panggil<T>(path, { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(data ?? {}) });

export const masukTiruan = (email: string) => kirimJson<{ token: string; user: Pengguna }>('POST', '/auth/mock-login', { email });
export const keluarAkun = () => panggil<unknown>('/auth/logout', { method: 'POST' }).catch(() => null);

export interface FieldFormulir {
  key: string;
  label: string;
  tipe: string;
  wajib: boolean;
  keterangan?: string;
  opsi?: { nilai: string; label: string }[];
  kondisi?: Kondisi;
}

export interface Kondisi {
  field: string;
  sama_dengan?: string;
  salah_satu?: string[];
}

export interface SyaratLengkap extends Persyaratan {
  kondisi?: Kondisi;
}

export interface DetailLayananApi {
  id_layanan: string;
  nama_layanan: string;
  form_fields: FieldFormulir[];
  persyaratan: SyaratLengkap[];
}

export const ambilLayanan = (id: string) => panggil<DetailLayananApi>(`/layanan/${id}`);

export interface HasilUnggah {
  file_id: string;
  nama_file: string;
  mime_type: string;
  ukuran_byte: number;
}

export const unggahBerkas = (file: File) =>
  panggil<HasilUnggah>(`/berkas/unggah?nama_file=${encodeURIComponent(file.name)}`, { method: 'POST', headers: { 'content-type': file.type }, body: file });

export interface BerkasDetail {
  id_berkas: string;
  id_syarat: string;
  nama_syarat: string;
  nama_file: string;
  mime_type: string;
  ukuran_byte: number;
  file_url: string | null;
  status_berkas: 'MENUNGGU' | 'VALID' | 'PERLU_PERBAIKAN';
  catatan_admin: string | null;
}

export interface Ringkas {
  id_pengajuan: string;
  no_registrasi: string;
  id_layanan: string;
  nama_layanan: string;
  status_pengajuan: string;
  label_status: string;
  tgl_pengajuan: string;
  tgl_diperbarui: string;
  version: number;
  pemohon?: { nama_lengkap: string; no_hp_tersamar: string };
}

export interface DetailPengajuan extends Omit<Ringkas, 'pemohon'> {
  catatan_revisi: string | null;
  alasan_penolakan: string | null;
  nomor_surat: string | null;
  data_formulir: Record<string, unknown>;
  pemohon: { nama_lengkap: string; nik: string; no_hp_tersamar: string; email: string; alamat: string } | null;
  berkas: BerkasDetail[];
  riwayat: { ke: string; label: string; aksi: string; oleh_role: string; catatan: string | null; waktu: string }[];
}

export interface BerkasKirim {
  id_syarat: string;
  nama_file: string;
  mime_type: string;
  ukuran_byte: number;
  file_id: string;
}

export const kirimPengajuan = (id_layanan: string, data_formulir: Record<string, unknown>, berkas: BerkasKirim[]) =>
  kirimJson<DetailPengajuan>('POST', '/pengajuan', { id_layanan, data_formulir, berkas });
export const pengajuanSaya = () => panggil<Ringkas[]>('/pengajuan/saya?limit=50');
export const detailPengajuan = (id: string) => panggil<DetailPengajuan>(`/pengajuan/${id}`);
export const kirimRevisi = (id: string, berkas: BerkasKirim[], version: number) => kirimJson<DetailPengajuan>('PATCH', `/pengajuan/${id}/revisi`, { berkas, version });
/** Backend membatasi 50 berkas per halaman, jadi semua halaman diambil agar daftar dan angka dashboard lengkap. */
export async function ambilAntrian(semua: boolean): Promise<Ringkas[]> {
  const hasil: Ringkas[] = [];
  for (let halaman = 1; ; halaman++) {
    const { data, meta } = await panggilLengkap<Ringkas[]>(`/pengajuan/antrian?limit=50&page=${halaman}${semua ? '&semua=true' : ''}`);
    hasil.push(...data);
    if (!meta || data.length === 0 || halaman >= meta.total_halaman) return hasil;
  }
}
export const aksiPengajuan = (id: string, aksi: 'verifikasi' | 'paraf-kasi' | 'tte-camat' | 'serahkan', data: Record<string, unknown>) =>
  kirimJson<DetailPengajuan>('PATCH', `/pengajuan/${id}/${aksi}`, data);

/** Berkas butuh token, jadi diambil lewat fetch lalu dibuka sebagai blob. */
export async function ambilFileBerkas(fileUrl: string) {
  const res = await fetch(`${import.meta.env.VITE_API_URL ?? ''}${fileUrl}`, { headers: izin() });
  if (!res.ok) throw new ApiError('Berkas tidak dapat dibuka.', res.status);
  return URL.createObjectURL(await res.blob());
}
