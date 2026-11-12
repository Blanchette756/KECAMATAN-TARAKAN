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

const GALAT_JARINGAN = 'Server tidak dapat dihubungi. Coba lagi beberapa saat lagi.';

/** Token tidak berlaku lagi, misalnya sesi habis. Warga kembali ke Masuk, petugas ke Masuk Petugas. */
function tanganiSesiHabis(status: number) {
  const sesi = ambilSesi();
  if (status !== 401 || !sesi) return;
  hapusSesi();
  window.location.assign(sesi.user.role === 'WARGA' ? `/masuk?ke=${encodeURIComponent(window.location.pathname + window.location.search)}` : '/masuk-petugas');
}

/** Pesan galat dari respons { error: { message, details } }. */
function galatDariRespons(body: { error?: { message?: string; details?: unknown } } | null, status: number): ApiError {
  // Rincian bisa berupa teks (validasi service) atau objek { lokasi, pesan } (validasi skema).
  const teksRincian = (d: unknown) => (typeof d === 'string' ? d : d && typeof d === 'object' && 'pesan' in d ? `${(d as { lokasi?: string }).lokasi ?? ''} ${(d as { pesan: string }).pesan}`.trim() : JSON.stringify(d));
  const rincian = Array.isArray(body?.error?.details) ? `: ${body.error.details.map(teksRincian).join('; ')}` : '';
  return new ApiError(`${body?.error?.message ?? 'Terjadi kesalahan pada server. Coba lagi beberapa saat lagi.'}${rincian}`, status);
}

async function panggilLengkap<T>(path: string, init?: RequestInit): Promise<Respons<T>> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { ...init, headers: { ...izin(), ...init?.headers } });
  } catch {
    throw new ApiError(GALAT_JARINGAN);
  }
  tanganiSesiHabis(res.status);
  const body = await res.json().catch(() => null);
  if (!res.ok || body === null) throw galatDariRespons(body, res.status);
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
export const googleConfig = () => panggil<{ client_id: string | null }>('/auth/google-config');
export const masukGoogle = (credential: string) => kirimJson<{ token: string; user: Pengguna }>('POST', '/auth/google', { credential });

export interface Profil {
  nama_lengkap: string;
  email: string | null;
  nik: string | null;
  no_hp: string | null;
  alamat: string | null;
  id_kelurahan: string | null;
}
export type InputProfil = { [K in Exclude<keyof Profil, 'email'>]: string };
export const ambilProfil = () => panggil<Profil>('/auth/profil');
export const simpanProfil = (data: InputProfil) => kirimJson<{ user: Pengguna }>('PATCH', '/auth/profil', data);
export const ambilKelurahan = () => panggil<{ id_kelurahan: string; nama: string }[]>('/kelurahan');

export const masukPetugas = (username: string, password: string) => kirimJson<{ token: string; user: Pengguna }>('POST', '/auth/login-petugas', { username, password });
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

/**
 * Unggah satu file. Memakai XMLHttpRequest (bukan fetch) karena hanya itu yang melaporkan kemajuan unggah,
 * supaya warga di jaringan HP yang lambat melihat persentasenya.
 */
export function unggahBerkas(file: File, onKemajuan?: (persen: number) => void): Promise<HasilUnggah> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_URL}/berkas/unggah?nama_file=${encodeURIComponent(file.name)}`);
    for (const [kunci, nilai] of Object.entries(izin())) xhr.setRequestHeader(kunci, nilai);
    xhr.setRequestHeader('content-type', file.type);
    xhr.responseType = 'json';
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onKemajuan) onKemajuan(Math.min(99, Math.round((e.loaded / e.total) * 100)));
    };
    xhr.onload = () => {
      tanganiSesiHabis(xhr.status);
      const body = (xhr.response ?? null) as Respons<HasilUnggah> & { error?: { message?: string; details?: unknown } } | null;
      if (xhr.status >= 200 && xhr.status < 300 && body?.data) {
        onKemajuan?.(100);
        resolve(body.data);
      } else reject(galatDariRespons(body, xhr.status));
    };
    xhr.onerror = () => reject(new ApiError(GALAT_JARINGAN));
    xhr.ontimeout = () => reject(new ApiError('Unggah terlalu lama. Periksa koneksi internet lalu coba lagi.'));
    xhr.timeout = 120_000;
    xhr.send(file);
  });
}

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
  pemohon?: { nama_lengkap: string; no_hp_tersamar: string | null };
}

export interface DetailPengajuan extends Omit<Ringkas, 'pemohon'> {
  catatan_revisi: string | null;
  alasan_penolakan: string | null;
  nomor_surat: string | null;
  data_formulir: Record<string, unknown>;
  pemohon: { nama_lengkap: string; nik: string | null; no_hp_tersamar: string | null; email: string | null; alamat: string | null } | null;
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
/** `data_formulir` diisi hanya bila isian diubah; backend lalu mengganti seluruh isian lama. */
export const kirimRevisi = (id: string, berkas: BerkasKirim[], version: number, data_formulir?: Record<string, unknown>) =>
  kirimJson<DetailPengajuan>('PATCH', `/pengajuan/${id}/revisi`, { berkas, version, ...(data_formulir ? { data_formulir } : {}) });
export interface Berita {
  id_berita: string;
  judul: string;
  /** YYYY-MM-DD */
  tanggal: string;
  ringkasan: string;
  diperbarui_pada?: string;
}
export type InputBerita = Pick<Berita, 'judul' | 'tanggal' | 'ringkasan'>;

/** Publik, terbaru di atas. */
export const ambilBerita = () => panggil<Berita[]>('/berita');
/** Khusus petugas pelayanan. Tanpa `id` = tambah, dengan `id` = ubah. */
export const simpanBerita = (input: InputBerita, id?: string) => (id ? kirimJson<Berita>('PATCH', `/berita/${id}`, input) : kirimJson<Berita>('POST', '/berita', input));
export const hapusBerita = (id: string) => kirimJson<{ id_berita: string }>('DELETE', `/berita/${id}`);

export type PeranPetugas = 'ADMIN' | 'KASI' | 'CAMAT';
export interface AkunPetugas {
  id_user: string;
  username: string;
  nama_lengkap: string;
  role: PeranPetugas;
  seksi: string | null;
  aktif: boolean;
}
export interface InputAkunPetugas {
  username: string;
  nama_lengkap: string;
  role: PeranPetugas;
  seksi: string | null;
  password: string;
}

/** Khusus Petugas Pelayanan. */
export const daftarAkunPetugas = () => panggil<AkunPetugas[]>('/petugas');
export const tambahAkunPetugas = (data: InputAkunPetugas) => kirimJson<AkunPetugas>('POST', '/petugas', data);
export const ubahAkunPetugas = (id: string, data: Partial<Omit<InputAkunPetugas, 'username'> & { aktif: boolean }>) => kirimJson<AkunPetugas>('PATCH', `/petugas/${id}`, data);
export const gantiPassword = (password_lama: string, password_baru: string) => kirimJson<{ berhasil: boolean }>('PATCH', '/auth/password', { password_lama, password_baru });

/**
 * Backend membatasi jumlah berkas per halaman, jadi semua halaman diambil agar daftar dan angka dashboard lengkap.
 * Backend baru mengizinkan 100; backend lama hanya 50 (menolak dengan 400), jadi bila ditolak kita turun ke 50.
 * Frontend dan backend di-deploy terpisah, jadi keduanya harus tetap berfungsi saat versinya sempat berbeda.
 */
let limitAntrian = 100;
export async function ambilAntrian(semua: boolean): Promise<Ringkas[]> {
  const hasil: Ringkas[] = [];
  try {
    for (let halaman = 1; ; halaman++) {
      const { data, meta } = await panggilLengkap<Ringkas[]>(`/pengajuan/antrian?limit=${limitAntrian}&page=${halaman}${semua ? '&semua=true' : ''}`);
      hasil.push(...data);
      if (!meta || data.length === 0 || halaman >= meta.total_halaman) return hasil;
    }
  } catch (error) {
    if (error instanceof ApiError && error.status === 400 && limitAntrian > 50) {
      limitAntrian = 50;
      return ambilAntrian(semua);
    }
    throw error;
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
