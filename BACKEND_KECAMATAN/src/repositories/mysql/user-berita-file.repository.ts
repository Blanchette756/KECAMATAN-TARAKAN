import { dalamTransaksi, teksAtauNull, type Db, type ResultSetHeader, type RowDataPacket } from '../../database/mysql/pool.js';
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
    nik: teksAtauNull(r.nik),
    nama_lengkap: String(r.nama_lengkap),
    email: teksAtauNull(r.email),
    no_hp: teksAtauNull(r.no_hp),
    role: r.role as Role,
    seksi: teksAtauNull(r.seksi) as Seksi | null,
    alamat: teksAtauNull(r.alamat),
    aktif: Number(r.aktif) === 1,
  };
}

const nilaiUser = (u: User, kolom: readonly (typeof KOLOM_USER)[number][]) => kolom.map((k) => (k === 'aktif' ? (u.aktif ? 1 : 0) : u[k]));

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

  async findKredensial(username: string): Promise<{ user: User; password_hash: string } | null> {
    const [rows] = await this.db.execute<RowDataPacket[]>(
      `SELECT ${KOLOM_USER.join(', ')}, password_hash FROM users WHERE username = ? AND password_hash IS NOT NULL`,
      [username.trim().toLowerCase()],
    );
    const r = rows[0];
    return r ? { user: userDariBaris(r), password_hash: String(r.password_hash) } : null;
  }

  async findByGoogleSub(sub: string): Promise<User | null> {
    const [rows] = await this.db.execute<RowDataPacket[]>(`SELECT ${KOLOM_USER.join(', ')} FROM users WHERE google_sub = ?`, [sub]);
    return rows[0] ? userDariBaris(rows[0]) : null;
  }

  async findByNik(nik: string): Promise<User | null> {
    const [rows] = await this.db.execute<RowDataPacket[]>(`SELECT ${KOLOM_USER.join(', ')} FROM users WHERE nik = ?`, [nik]);
    return rows[0] ? userDariBaris(rows[0]) : null;
  }

  async buatWargaGoogle(user: User, sub: string): Promise<void> {
    await this.db.execute(`INSERT INTO users (${KOLOM_USER.join(', ')}, google_sub) VALUES (${KOLOM_USER.map(() => '?').join(', ')}, ?)`, [
      ...nilaiUser(user, KOLOM_USER),
      sub,
    ]);
  }

  async tautkanGoogle(idUser: string, sub: string): Promise<void> {
    await this.db.execute('UPDATE users SET google_sub = ? WHERE id_user = ?', [sub, idUser]);
  }

  async updateProfil(idUser: string, data: Pick<User, 'nama_lengkap' | 'nik' | 'no_hp' | 'alamat' | 'id_kelurahan'>): Promise<void> {
    await this.db.execute('UPDATE users SET nama_lengkap = ?, nik = ?, no_hp = ?, alamat = ?, id_kelurahan = ? WHERE id_user = ?', [
      data.nama_lengkap,
      data.nik,
      data.no_hp,
      data.alamat,
      data.id_kelurahan,
      idUser,
    ]);
  }

  async findKredensialById(idUser: string): Promise<{ user: User; username: string; password_hash: string } | null> {
    const [rows] = await this.db.execute<RowDataPacket[]>(
      `SELECT ${KOLOM_USER.join(', ')}, username, password_hash FROM users WHERE id_user = ? AND username IS NOT NULL AND password_hash IS NOT NULL`,
      [idUser],
    );
    const r = rows[0];
    return r ? { user: userDariBaris(r), username: String(r.username), password_hash: String(r.password_hash) } : null;
  }

  async listPetugas(): Promise<{ user: User; username: string }[]> {
    const [rows] = await this.db.query<RowDataPacket[]>(`SELECT ${KOLOM_USER.join(', ')}, username FROM users WHERE username IS NOT NULL ORDER BY nama_lengkap`);
    return rows.map((r) => ({ user: userDariBaris(r), username: String(r.username) }));
  }

  async updatePetugas(idUser: string, data: Pick<User, 'nama_lengkap' | 'role' | 'seksi' | 'aktif'>, passwordHash: string | null): Promise<void> {
    const kolom = ['nama_lengkap = ?', 'role = ?', 'seksi = ?', 'aktif = ?'];
    const nilai: (string | number | null)[] = [data.nama_lengkap, data.role, data.seksi, data.aktif ? 1 : 0];
    if (passwordHash !== null) {
      kolom.push('password_hash = ?');
      nilai.push(passwordHash);
    }
    const [hasil] = await this.db.execute<ResultSetHeader>(`UPDATE users SET ${kolom.join(', ')} WHERE id_user = ? AND username IS NOT NULL`, [...nilai, idUser]);
    if (hasil.affectedRows !== 1) throw new Error(`Akun petugas ${idUser} tidak ada`);
  }

  async simpanPetugas(user: User, username: string, passwordHash: string): Promise<{ id_user: string; baru: boolean }> {
    const kunci = username.trim().toLowerCase();
    return dalamTransaksi(this.db, async (conn) => {
      const [ada] = await conn.execute<RowDataPacket[]>('SELECT id_user FROM users WHERE username = ? FOR UPDATE', [kunci]);
      const lama = ada[0] ? String(ada[0].id_user) : null;
      if (lama) {
        const ubah = KOLOM_USER.filter((k) => k !== 'id_user');
        await conn.execute(`UPDATE users SET ${ubah.map((k) => `${k} = ?`).join(', ')}, password_hash = ? WHERE id_user = ?`, [
          ...nilaiUser(user, ubah),
          passwordHash,
          lama,
        ]);
        return { id_user: lama, baru: false };
      }
      await conn.execute(
        `INSERT INTO users (${KOLOM_USER.join(', ')}, username, password_hash) VALUES (${KOLOM_USER.map(() => '?').join(', ')}, ?, ?)`,
        [...nilaiUser(user, KOLOM_USER), kunci, passwordHash],
      );
      return { id_user: user.id_user, baru: true };
    });
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
