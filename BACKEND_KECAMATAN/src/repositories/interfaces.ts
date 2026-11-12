import type { JenisLayanan, KontakKecamatan } from '../types/layanan.js';
import type { Kelurahan, User } from '../types/user.js';
import type { AuditLog, PengajuanPelayanan, RiwayatStatus, Sesi } from '../types/pengajuan.js';
import type { BerkasPengajuan, FileUnggahan } from '../types/berkas.js';
import type { Berita } from '../types/berita.js';
import type { StatusPengajuan } from '../constants/workflow.js';
import type { Seksi } from '../types/common.js';

/**
 * Kontrak akses data. Service hanya bergantung pada interface ini, dengan dua implementasi:
 * memori (repositories/) dan MySQL (repositories/mysql/).
 */

export interface Halaman<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export interface Paging {
  page: number;
  limit: number;
}

export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  /** Akun yang punya username dan password (petugas). */
  findKredensial(username: string): Promise<{ user: User; password_hash: string } | null>;
  findKredensialById(idUser: string): Promise<{ user: User; username: string; password_hash: string } | null>;
  /** Semua akun yang punya username, urut nama. */
  listPetugas(): Promise<{ user: User; username: string }[]>;
  /** Buat akun baru, atau perbarui akun dengan username yang sama (id lama dipertahankan). */
  simpanPetugas(user: User, username: string, passwordHash: string): Promise<{ id_user: string; baru: boolean }>;
  findByGoogleSub(sub: string): Promise<User | null>;
  findByNik(nik: string): Promise<User | null>;
  /** Akun warga baru dari login Google. */
  buatWargaGoogle(user: User, sub: string): Promise<void>;
  /** Tautkan akun yang sudah ada (cocok email) ke akun Google. */
  tautkanGoogle(idUser: string, sub: string): Promise<void>;
  updateProfil(idUser: string, data: Pick<User, 'nama_lengkap' | 'nik' | 'no_hp' | 'alamat' | 'id_kelurahan'>): Promise<void>;
  /** Ubah data akun petugas; password hanya diganti bila `passwordHash` diisi. */
  updatePetugas(idUser: string, data: Pick<User, 'nama_lengkap' | 'role' | 'seksi' | 'aktif'>, passwordHash: string | null): Promise<void>;
}

export interface MasterRepository {
  listLayanan(): Promise<JenisLayanan[]>;
  findLayanan(id: string): Promise<JenisLayanan | null>;
  listKelurahan(): Promise<Kelurahan[]>;
  getKontak(): Promise<KontakKecamatan>;
}

export interface PengajuanRepository {
  create(p: PengajuanPelayanan): Promise<void>;
  findById(id: string): Promise<PengajuanPelayanan | null>;
  findByNoRegistrasi(noRegistrasi: string): Promise<PengajuanPelayanan | null>;
  listByUser(idUser: string, paging: Paging): Promise<Halaman<PengajuanPelayanan>>;
  /** `terlama` (bawaan) untuk antrean kerja; `terbaru` untuk daftar semua berkas di dashboard petugas. */
  listByStatus(
    statuses: readonly StatusPengajuan[],
    filter: { seksi?: Seksi },
    paging: Paging,
    urutan?: 'terlama' | 'terbaru',
  ): Promise<Halaman<PengajuanPelayanan>>;
  listAll(): Promise<PengajuanPelayanan[]>;
  /** Simpan hanya jika versi di penyimpanan masih `expectedVersion`. false = sudah diubah orang lain. */
  updateIfVersion(p: PengajuanPelayanan, expectedVersion: number): Promise<boolean>;
  nextNomorSurat(tahun: string): Promise<number>;
  /**
   * Kembalikan nomor `urut` yang baru diambil tetapi tidak jadi dipakai (penyimpanan status gagal), supaya
   * nomor surat tidak loncat. Hanya berlaku bila itu masih nomor terakhir; bila sudah ada nomor yang lebih baru, diabaikan.
   */
  batalkanNomorSurat(tahun: string, urut: number): Promise<void>;
}

export interface BerkasRepository {
  findById(idBerkas: string): Promise<BerkasPengajuan | null>;
  createMany(items: BerkasPengajuan[]): Promise<void>;
  listByPengajuan(idPengajuan: string): Promise<BerkasPengajuan[]>;
  update(item: BerkasPengajuan): Promise<void>;
  delete(idBerkas: string): Promise<void>;
}

export interface RiwayatRepository {
  add(r: RiwayatStatus): Promise<void>;
  listByPengajuan(idPengajuan: string): Promise<RiwayatStatus[]>;
  listAll(): Promise<RiwayatStatus[]>;
}

export interface AuditRepository {
  /** Implementasi wajib membatasi jumlah entri yang disimpan. */
  add(a: AuditLog): Promise<void>;
  listByTarget(targetId: string): Promise<AuditLog[]>;
}

export interface BeritaRepository {
  list(): Promise<Berita[]>;
  findById(id: string): Promise<Berita | null>;
  create(b: Berita): Promise<void>;
  update(b: Berita): Promise<void>;
  /** false jika berita tidak ada. */
  delete(id: string): Promise<boolean>;
}

/** File unggahan warga, isi dan metadatanya. */
export interface FileRepository {
  create(f: FileUnggahan, isi: Buffer): Promise<void>;
  findMeta(fileId: string): Promise<FileUnggahan | null>;
  baca(fileId: string): Promise<{ info: FileUnggahan; data: Buffer } | null>;
  /** Jumlah file milik satu warga yang belum dipakai berkas pengajuan mana pun ("yatim"). */
  hitungYatim(idUser: string): Promise<number>;
  /** Hapus satu file, tetapi hanya bila tidak dipakai berkas pengajuan mana pun. true = terhapus. */
  hapusBilaYatim(fileId: string): Promise<boolean>;
  /** Hapus semua file yatim yang dibuat sebelum `sebelumIso` (ISO-8601). Mengembalikan jumlah yang dihapus. */
  hapusYatimSebelum(sebelumIso: string): Promise<number>;
}

export interface SesiRepository {
  create(s: Sesi): Promise<void>;
  findByHash(tokenHash: string): Promise<Sesi | null>;
  listByUser(idUser: string): Promise<Sesi[]>;
  delete(tokenHash: string): Promise<void>;
  deleteExpired(nowMs: number): Promise<number>;
  /** Cabut semua sesi milik satu akun (mis. akun dinonaktifkan atau password direset). */
  deleteByUser(idUser: string): Promise<void>;
}

export interface Repositories {
  users: UserRepository;
  master: MasterRepository;
  pengajuan: PengajuanRepository;
  berkas: BerkasRepository;
  riwayat: RiwayatRepository;
  audit: AuditRepository;
  sesi: SesiRepository;
  berita: BeritaRepository;
  files: FileRepository;
}
