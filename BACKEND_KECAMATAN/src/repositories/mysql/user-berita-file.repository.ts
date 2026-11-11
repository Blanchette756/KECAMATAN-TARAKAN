import { teksAtauNull, type Db, type ResultSetHeader, type RowDataPacket } from '../../database/mysql/pool.js';
import type { Berita } from '../../types/berita.js';
import type { FileUnggahan, MimeDiizinkan } from '../../types/berkas.js';
import type { Role, Seksi } from '../../types/common.js';
import type { User } from '../../types/user.js';
import type { BeritaRepository, FileRepository, UserRepository } from '../interfaces.js';

export const KOLOM_USER = ['id_user', 'id_kelurahan', 'nik', 'nama_lengkap', 'email', 'no_hp', 'role', 'seksi', 'alamat', 'aktif'] as const;

function userDariBaris(r: RowDataPacket): User {
  return {
    id_user: String(r.id_user),
    id_kelurahan: teksAtauNull(r.id_kelurahan),
    nik: String(r.nik),
    nama_lengkap: String(r.nama_lengkap),
    email: String(r.email),
    no_hp: String(r.no_hp),
    role: r.role as Role,
    seksi: teksAtauNull(r.seksi) as Seksi | null,
    alamat: String(r.alamat),
    aktif: Number(r.aktif) === 1,
  };
}

export class MysqlUserRepository implements UserRepository {
  constructor(private readonly db: Db) {}

  async findById(id: string): Promise<User | null> {
    const [rows] = await this.db.execute<RowDataPacket[]>(`SELECT ${KOLOM_USER.join(', ')} FROM users WHERE id_user = ?`, [id]);
    return rows[0] ? userDariBaris(rows[0]) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    // Kolasi utf8mb4_unicode_ci tidak membedakan huruf besar dan kecil.
    const [rows] = await this.db.execute<RowDataPacket[]>(`SELECT ${KOLOM_USER.join(', ')} FROM users WHERE email = ?`, [email.trim()]);
    return rows[0] ? userDariBaris(rows[0]) : null;
  }
}

function beritaDariBaris(r: RowDataPacket): Berita {
  const b: Berita = { id_berita: String(r.id_berita), judul: String(r.judul), tanggal: String(r.tanggal), ringkasan: String(r.ringkasan) };
  if (r.diperbarui_pada !== null && r.diperbarui_pada !== undefined) b.diperbarui_pada = String(r.diperbarui_pada);
  return b;
}

export class MysqlBeritaRepository implements BeritaRepository {
  constructor(private readonly db: Db) {}

  async list(): Promise<Berita[]> {
    const [rows] = await this.db.query<RowDataPacket[]>('SELECT id_berita, judul, tanggal, ringkasan, diperbarui_pada FROM berita');
    return rows.map(beritaDariBaris);
  }

  async findById(id: string): Promise<Berita | null> {
    const [rows] = await this.db.execute<RowDataPacket[]>('SELECT id_berita, judul, tanggal, ringkasan, diperbarui_pada FROM berita WHERE id_berita = ?', [id]);
    return rows[0] ? beritaDariBaris(rows[0]) : null;
  }

  async create(b: Berita): Promise<void> {
    await this.db.execute('INSERT INTO berita (id_berita, judul, tanggal, ringkasan, diperbarui_pada) VALUES (?, ?, ?, ?, ?)', [
      b.id_berita,
      b.judul,
      b.tanggal,
      b.ringkasan,
      b.diperbarui_pada ?? null,
    ]);
  }

  async update(b: Berita): Promise<void> {
    await this.db.execute('UPDATE berita SET judul = ?, tanggal = ?, ringkasan = ?, diperbarui_pada = ? WHERE id_berita = ?', [
      b.judul,
      b.tanggal,
      b.ringkasan,
      b.diperbarui_pada ?? null,
      b.id_berita,
    ]);
  }

  async delete(id: string): Promise<boolean> {
    const [hasil] = await this.db.execute<ResultSetHeader>('DELETE FROM berita WHERE id_berita = ?', [id]);
    return hasil.affectedRows > 0;
  }
}

const KOLOM_FILE = 'file_id, id_user, nama_file, mime_type, ukuran_byte, dibuat_pada';

function fileDariBaris(r: RowDataPacket): FileUnggahan {
  return {
    file_id: String(r.file_id),
    id_user: String(r.id_user),
    nama_file: String(r.nama_file),
    mime_type: r.mime_type as MimeDiizinkan,
    ukuran_byte: Number(r.ukuran_byte),
    dibuat_pada: String(r.dibuat_pada),
  };
}

export class MysqlFileRepository implements FileRepository {
  constructor(private readonly db: Db) {}

  async create(f: FileUnggahan, isi: Buffer): Promise<void> {
    await this.db.execute(`INSERT INTO file_unggahan (${KOLOM_FILE}, isi) VALUES (?, ?, ?, ?, ?, ?, ?)`, [
      f.file_id,
      f.id_user,
      f.nama_file,
      f.mime_type,
      f.ukuran_byte,
      f.dibuat_pada,
      isi,
    ]);
  }

  async findMeta(fileId: string): Promise<FileUnggahan | null> {
    // Tanpa kolom isi (BLOB).
    const [rows] = await this.db.execute<RowDataPacket[]>(`SELECT ${KOLOM_FILE} FROM file_unggahan WHERE file_id = ?`, [fileId]);
    return rows[0] ? fileDariBaris(rows[0]) : null;
  }

  async baca(fileId: string): Promise<{ info: FileUnggahan; data: Buffer } | null> {
    const [rows] = await this.db.execute<RowDataPacket[]>(`SELECT ${KOLOM_FILE}, isi FROM file_unggahan WHERE file_id = ?`, [fileId]);
    const r = rows[0];
    return r ? { info: fileDariBaris(r), data: Buffer.from(r.isi as Buffer) } : null;
  }
}
