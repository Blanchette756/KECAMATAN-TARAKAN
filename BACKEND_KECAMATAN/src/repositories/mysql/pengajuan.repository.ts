import type { StatusPengajuan } from '../../constants/workflow.js';
import { dalamTransaksi, teksAtauNull, type Db, type ResultSetHeader, type RowDataPacket } from '../../database/mysql/pool.js';
import type { DataFormulir, Seksi } from '../../types/common.js';
import type { PengajuanPelayanan } from '../../types/pengajuan.js';
import type { Halaman, Paging, PengajuanRepository } from '../interfaces.js';

const KOLOM = [
  'id_pengajuan',
  'no_registrasi',
  'id_user',
  'id_layanan',
  'seksi',
  'data_formulir',
  'tgl_pengajuan',
  'status_pengajuan',
  'catatan_revisi',
  'catatan_internal',
  'alasan_penolakan',
  'nomor_surat',
  'qr_code_tte',
  'file_surat_selesai',
  'id_verifikator',
  'id_kasi',
  'id_camat',
  'id_penyerah',
  'tgl_selesai',
  'tgl_diperbarui',
  'version',
] as const;

/** Kolom yang boleh diubah updateIfVersion. */
const KOLOM_UBAH = KOLOM.filter((k) => !['id_pengajuan', 'no_registrasi', 'id_user', 'id_layanan', 'seksi', 'tgl_pengajuan', 'version'].includes(k));

type Nilai = string | number | null;

function keBaris(p: PengajuanPelayanan): Record<(typeof KOLOM)[number], Nilai> {
  return { ...p, data_formulir: JSON.stringify(p.data_formulir) };
}

function dariBaris(r: RowDataPacket): PengajuanPelayanan {
  const data = typeof r.data_formulir === 'string' ? JSON.parse(r.data_formulir) : r.data_formulir;
  return {
    id_pengajuan: String(r.id_pengajuan),
    no_registrasi: String(r.no_registrasi),
    id_user: String(r.id_user),
    id_layanan: String(r.id_layanan),
    seksi: r.seksi as Seksi,
    data_formulir: data as DataFormulir,
    tgl_pengajuan: String(r.tgl_pengajuan),
    status_pengajuan: r.status_pengajuan as StatusPengajuan,
    catatan_revisi: teksAtauNull(r.catatan_revisi),
    catatan_internal: teksAtauNull(r.catatan_internal),
    alasan_penolakan: teksAtauNull(r.alasan_penolakan),
    nomor_surat: teksAtauNull(r.nomor_surat),
    qr_code_tte: teksAtauNull(r.qr_code_tte),
    file_surat_selesai: teksAtauNull(r.file_surat_selesai),
    id_verifikator: teksAtauNull(r.id_verifikator),
    id_kasi: teksAtauNull(r.id_kasi),
    id_camat: teksAtauNull(r.id_camat),
    id_penyerah: teksAtauNull(r.id_penyerah),
    tgl_selesai: teksAtauNull(r.tgl_selesai),
    tgl_diperbarui: String(r.tgl_diperbarui),
    version: Number(r.version),
  };
}

const SELECT = `SELECT ${KOLOM.join(', ')} FROM pengajuan`;

export class MysqlPengajuanRepository implements PengajuanRepository {
  constructor(private readonly db: Db) {}

  async create(p: PengajuanPelayanan): Promise<void> {
    const baris = keBaris(p);
    // Duplikat id atau no_registrasi ditolak oleh PRIMARY/UNIQUE KEY.
    await this.db.execute(`INSERT INTO pengajuan (${KOLOM.join(', ')}) VALUES (${KOLOM.map(() => '?').join(', ')})`, KOLOM.map((k) => baris[k]));
  }

  async findById(id: string): Promise<PengajuanPelayanan | null> {
    const [rows] = await this.db.execute<RowDataPacket[]>(`${SELECT} WHERE id_pengajuan = ?`, [id]);
    return rows[0] ? dariBaris(rows[0]) : null;
  }

  async findByNoRegistrasi(noRegistrasi: string): Promise<PengajuanPelayanan | null> {
    const [rows] = await this.db.execute<RowDataPacket[]>(`${SELECT} WHERE no_registrasi = ?`, [noRegistrasi]);
    return rows[0] ? dariBaris(rows[0]) : null;
  }

  async listByUser(idUser: string, paging: Paging): Promise<Halaman<PengajuanPelayanan>> {
    return this.halaman('WHERE id_user = ?', [idUser], 'DESC', paging);
  }

  async listByStatus(
    statuses: readonly StatusPengajuan[],
    filter: { seksi?: Seksi },
    paging: Paging,
    urutan: 'terlama' | 'terbaru' = 'terlama',
  ): Promise<Halaman<PengajuanPelayanan>> {
    if (statuses.length === 0) return { items: [], total: 0, page: paging.page, limit: paging.limit };
    let where = `WHERE status_pengajuan IN (${statuses.map(() => '?').join(', ')})`;
    const nilai: Nilai[] = [...statuses];
    if (filter.seksi !== undefined) {
      where += ' AND seksi = ?';
      nilai.push(filter.seksi);
    }
    return this.halaman(where, nilai, urutan === 'terbaru' ? 'DESC' : 'ASC', paging);
  }

  async listAll(): Promise<PengajuanPelayanan[]> {
    const [rows] = await this.db.query<RowDataPacket[]>(SELECT);
    return rows.map(dariBaris);
  }

  async updateIfVersion(p: PengajuanPelayanan, expectedVersion: number): Promise<boolean> {
    const baris = keBaris(p);
    const [hasil] = await this.db.execute<ResultSetHeader>(
      `UPDATE pengajuan SET ${KOLOM_UBAH.map((k) => `${k} = ?`).join(', ')}, version = version + 1 WHERE id_pengajuan = ? AND version = ?`,
      [...KOLOM_UBAH.map((k) => baris[k]), p.id_pengajuan, expectedVersion],
    );
    return hasil.affectedRows === 1;
  }

  async nextNomorSurat(tahun: string): Promise<number> {
    // FOR UPDATE mengunci baris tahun ini, jadi dua TTE bersamaan tidak mendapat nomor yang sama.
    return dalamTransaksi(this.db, async (conn) => {
      await conn.execute('INSERT IGNORE INTO nomor_surat_counter (tahun, terakhir) VALUES (?, 0)', [tahun]);
      const [rows] = await conn.execute<RowDataPacket[]>('SELECT terakhir FROM nomor_surat_counter WHERE tahun = ? FOR UPDATE', [tahun]);
      const berikut = Number(rows[0]?.terakhir ?? 0) + 1;
      await conn.execute('UPDATE nomor_surat_counter SET terakhir = ? WHERE tahun = ?', [berikut, tahun]);
      return berikut;
    });
  }

  async batalkanNomorSurat(tahun: string, urut: number): Promise<void> {
    // Hanya bila masih nomor terakhir, supaya nomor yang sudah dipakai TTE lain tidak terhapus.
    await this.db.execute('UPDATE nomor_surat_counter SET terakhir = terakhir - 1 WHERE tahun = ? AND terakhir = ?', [tahun, urut]);
  }

  private async halaman(where: string, nilai: Nilai[], arah: 'ASC' | 'DESC', { page, limit }: Paging): Promise<Halaman<PengajuanPelayanan>> {
    const [total] = await this.db.query<RowDataPacket[]>(`SELECT COUNT(*) AS n FROM pengajuan ${where}`, nilai);
    // page dan limit sudah divalidasi skema sebagai bilangan bulat.
    const offset = Math.max(0, (Math.trunc(page) - 1) * Math.trunc(limit));
    const [rows] = await this.db.query<RowDataPacket[]>(
      `${SELECT} ${where} ORDER BY tgl_pengajuan ${arah}, id_pengajuan ${arah} LIMIT ${Math.trunc(limit)} OFFSET ${offset}`,
      nilai,
    );
    return { items: rows.map(dariBaris), total: Number(total[0]?.n ?? 0), page, limit };
  }
}
