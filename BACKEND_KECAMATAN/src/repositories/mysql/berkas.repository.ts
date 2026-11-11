import { teksAtauNull, type Db, type RowDataPacket } from '../../database/mysql/pool.js';
import type { BerkasPengajuan, MimeDiizinkan, StatusBerkas } from '../../types/berkas.js';
import type { BerkasRepository } from '../interfaces.js';

const KOLOM = ['id_berkas', 'id_pengajuan', 'id_syarat', 'nama_file', 'mime_type', 'ukuran_byte', 'file_url', 'status_berkas', 'catatan_admin', 'diunggah_pada'] as const;
const SELECT = `SELECT ${KOLOM.join(', ')} FROM berkas`;

function dariBaris(r: RowDataPacket): BerkasPengajuan {
  return {
    id_berkas: String(r.id_berkas),
    id_pengajuan: String(r.id_pengajuan),
    id_syarat: String(r.id_syarat),
    nama_file: String(r.nama_file),
    mime_type: r.mime_type as MimeDiizinkan,
    ukuran_byte: Number(r.ukuran_byte),
    file_url: String(r.file_url),
    status_berkas: r.status_berkas as StatusBerkas,
    catatan_admin: teksAtauNull(r.catatan_admin),
    diunggah_pada: String(r.diunggah_pada),
  };
}

export class MysqlBerkasRepository implements BerkasRepository {
  constructor(private readonly db: Db) {}

  async findById(idBerkas: string): Promise<BerkasPengajuan | null> {
    const [rows] = await this.db.execute<RowDataPacket[]>(`${SELECT} WHERE id_berkas = ?`, [idBerkas]);
    return rows[0] ? dariBaris(rows[0]) : null;
  }

  async createMany(items: BerkasPengajuan[]): Promise<void> {
    if (items.length === 0) return;
    // Satu INSERT, jadi semua baris masuk atau tidak sama sekali.
    await this.db.query(`INSERT INTO berkas (${KOLOM.join(', ')}) VALUES ?`, [items.map((b) => KOLOM.map((k) => b[k]))]);
  }

  async listByPengajuan(idPengajuan: string): Promise<BerkasPengajuan[]> {
    const [rows] = await this.db.execute<RowDataPacket[]>(`${SELECT} WHERE id_pengajuan = ? ORDER BY id_syarat`, [idPengajuan]);
    return rows.map(dariBaris);
  }

  async update(item: BerkasPengajuan): Promise<void> {
    const [hasil] = await this.db.execute(
      'UPDATE berkas SET nama_file = ?, mime_type = ?, ukuran_byte = ?, file_url = ?, status_berkas = ?, catatan_admin = ? WHERE id_berkas = ?',
      [item.nama_file, item.mime_type, item.ukuran_byte, item.file_url, item.status_berkas, item.catatan_admin, item.id_berkas],
    );
    if ((hasil as { affectedRows: number }).affectedRows !== 1) throw new Error(`Berkas ${item.id_berkas} tidak ada`);
  }

  async delete(idBerkas: string): Promise<void> {
    await this.db.execute('DELETE FROM berkas WHERE id_berkas = ?', [idBerkas]);
  }
}
