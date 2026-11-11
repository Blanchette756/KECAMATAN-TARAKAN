import type { MasterData } from './data-loader.js';
import type { JenisLayanan, KontakKecamatan } from '../types/layanan.js';
import type { Kelurahan, User } from '../types/user.js';
import type { AuditLog, PengajuanPelayanan, RiwayatStatus, Sesi } from '../types/pengajuan.js';
import type { BerkasPengajuan, FileUnggahan } from '../types/berkas.js';

/**
 * Penyimpanan di memori untuk DB_DRIVER=memory. Setiap Map atau array mewakili satu tabel, dan isinya
 * hilang saat server restart. Data master di sini juga dipakai dengan DB_DRIVER=mysql.
 */
export class MemoryStore {
  // Data master (dari folder data/)
  readonly layanan = new Map<string, JenisLayanan>();
  readonly kelurahan = new Map<string, Kelurahan>();
  readonly users = new Map<string, User>();
  /** Username → akun petugas yang login dengan password. */
  readonly kredensial = new Map<string, { id_user: string; password_hash: string }>();
  /** ID akun Google (sub) → id_user. */
  readonly googleSub = new Map<string, string>();
  kontak: KontakKecamatan;

  // Data transaksi
  readonly pengajuan = new Map<string, PengajuanPelayanan>();
  readonly berkas = new Map<string, BerkasPengajuan>();
  readonly riwayat: RiwayatStatus[] = [];
  readonly auditLog: AuditLog[] = [];
  readonly sesi = new Map<string, Sesi>();
  readonly files = new Map<string, { info: FileUnggahan; data: Buffer }>();

  /** Penghitung nomor surat per tahun. */
  readonly nomorSuratCounter = new Map<string, number>();

  constructor(master: MasterData) {
    for (const l of master.layanan) this.layanan.set(l.id_layanan, l);
    for (const k of master.kelurahan) this.kelurahan.set(k.id_kelurahan, k);
    for (const u of master.users) this.users.set(u.id_user, u);
    this.kontak = master.kontak;
  }
}
