import type { Db, RowDataPacket } from '../../database/mysql/pool.js';
import type { SuratSelesai } from '../../types/surat.js';
import type { SuratRepository } from '../interfaces.js';

const KOLOM_SURAT = 'id_pengajuan, nama_file, ukuran_byte, diunggah_oleh, diunggah_pada';

const suratDariBaris = (r: RowDataPacket): SuratSelesai => ({
  id_pengajuan: String(r.id_pengajuan),
  nama_file: String(r.nama_file),
  ukuran_byte: Number(r.ukuran_byte),
  diunggah_oleh: String(r.diunggah_oleh),
  diunggah_pada: String(r.diunggah_pada),
});

export class MysqlSuratRepository implements SuratRepository {
  constructor(private readonly db: Db) {}

  async simpan(s: SuratSelesai, isi: Buffer): Promise<void> {
    // Satu surat per pengajuan: unggahan baru langsung menggantikan yang lama.
    await this.db.execute(
      `INSERT INTO surat_selesai (${KOLOM_SURAT}, isi) VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE nama_file = VALUES(nama_file), ukuran_byte = VALUES(ukuran_byte),
         diunggah_oleh = VALUES(diunggah_oleh), diunggah_pada = VALUES(diunggah_pada), isi = VALUES(isi)`,
      [s.id_pengajuan, s.nama_file, s.ukuran_byte, s.diunggah_oleh, s.diunggah_pada, isi],
    );
  }

  async findMeta(idPengajuan: string): Promise<SuratSelesai | null> {
    // Tanpa kolom isi (BLOB).
    const [rows] = await this.db.execute<RowDataPacket[]>(`SELECT ${KOLOM_SURAT} FROM surat_selesai WHERE id_pengajuan = ?`, [idPengajuan]);
    return rows[0] ? suratDariBaris(rows[0]) : null;
  }

  async baca(idPengajuan: string): Promise<{ info: SuratSelesai; data: Buffer } | null> {
    const [rows] = await this.db.execute<RowDataPacket[]>(`SELECT ${KOLOM_SURAT}, isi FROM surat_selesai WHERE id_pengajuan = ?`, [idPengajuan]);
    const r = rows[0];
    return r ? { info: suratDariBaris(r), data: Buffer.from(r.isi as Buffer) } : null;
  }
}
