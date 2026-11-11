import type { AksiWorkflow, StatusPengajuan } from '../../constants/workflow.js';
import { teksAtauNull, type Db, type ResultSetHeader, type RowDataPacket } from '../../database/mysql/pool.js';
import type { Role } from '../../types/common.js';
import type { AuditLog, RiwayatStatus, Sesi } from '../../types/pengajuan.js';
import type { AuditRepository, RiwayatRepository, SesiRepository } from '../interfaces.js';

const KOLOM_RIWAYAT = 'id_riwayat, id_pengajuan, dari, ke, aksi, oleh_id_user, oleh_role, catatan, waktu';

function riwayatDariBaris(r: RowDataPacket): RiwayatStatus {
  return {
    id_riwayat: String(r.id_riwayat),
    id_pengajuan: String(r.id_pengajuan),
    dari: teksAtauNull(r.dari) as StatusPengajuan | null,
    ke: r.ke as StatusPengajuan,
    aksi: r.aksi as AksiWorkflow,
    oleh_id_user: String(r.oleh_id_user),
    oleh_role: r.oleh_role as Role,
    catatan: teksAtauNull(r.catatan),
    waktu: String(r.waktu),
  };
}

export class MysqlRiwayatRepository implements RiwayatRepository {
  constructor(private readonly db: Db) {}

  async add(r: RiwayatStatus): Promise<void> {
    await this.db.execute(`INSERT INTO riwayat_status (${KOLOM_RIWAYAT}) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
      r.id_riwayat,
      r.id_pengajuan,
      r.dari,
      r.ke,
      r.aksi,
      r.oleh_id_user,
      r.oleh_role,
      r.catatan,
      r.waktu,
    ]);
  }

  async listByPengajuan(idPengajuan: string): Promise<RiwayatStatus[]> {
    // seq mengikuti urutan sisip, sama dengan versi memori.
    const [rows] = await this.db.execute<RowDataPacket[]>(`SELECT ${KOLOM_RIWAYAT} FROM riwayat_status WHERE id_pengajuan = ? ORDER BY seq`, [idPengajuan]);
    return rows.map(riwayatDariBaris);
  }

  async listAll(): Promise<RiwayatStatus[]> {
    const [rows] = await this.db.query<RowDataPacket[]>(`SELECT ${KOLOM_RIWAYAT} FROM riwayat_status ORDER BY seq`);
    return rows.map(riwayatDariBaris);
  }
}

/** Jejak audit dipangkas setiap 200 entri baru, tidak setiap kali tambah. */
const PANGKAS_SETIAP = 200;

export class MysqlAuditRepository implements AuditRepository {
  private sejakPangkas = 0;

  constructor(
    private readonly db: Db,
    private readonly maks: number,
  ) {}

  async add(a: AuditLog): Promise<void> {
    await this.db.execute('INSERT INTO audit_log (id_log, waktu, id_user, role, aksi, target_id) VALUES (?, ?, ?, ?, ?, ?)', [
      a.id_log,
      a.waktu,
      a.id_user,
      a.role,
      a.aksi,
      a.target_id,
    ]);
    if (++this.sejakPangkas >= PANGKAS_SETIAP) {
      this.sejakPangkas = 0;
      await this.pangkas();
    }
  }

  async listByTarget(targetId: string): Promise<AuditLog[]> {
    const [rows] = await this.db.execute<RowDataPacket[]>('SELECT id_log, waktu, id_user, role, aksi, target_id FROM audit_log WHERE target_id = ? ORDER BY seq', [targetId]);
    return rows.map((r) => ({
      id_log: String(r.id_log),
      waktu: String(r.waktu),
      id_user: String(r.id_user),
      role: r.role as Role,
      aksi: r.aksi as AuditLog['aksi'],
      target_id: teksAtauNull(r.target_id),
    }));
  }

  /** Sisakan hanya `maks` entri terbaru. */
  private async pangkas(): Promise<void> {
    const [rows] = await this.db.query<RowDataPacket[]>(`SELECT seq FROM audit_log ORDER BY seq DESC LIMIT 1 OFFSET ${Math.trunc(this.maks) - 1}`);
    const batas = rows[0]?.seq;
    if (batas !== undefined) await this.db.execute('DELETE FROM audit_log WHERE seq < ?', [batas]);
  }
}

export class MysqlSesiRepository implements SesiRepository {
  constructor(private readonly db: Db) {}

  async create(s: Sesi): Promise<void> {
    await this.db.execute('INSERT INTO sesi (token_hash, id_user, kedaluwarsa_ms) VALUES (?, ?, ?)', [s.token_hash, s.id_user, s.kedaluwarsa_ms]);
  }

  async findByHash(tokenHash: string): Promise<Sesi | null> {
    const [rows] = await this.db.execute<RowDataPacket[]>('SELECT token_hash, id_user, kedaluwarsa_ms FROM sesi WHERE token_hash = ?', [tokenHash]);
    const r = rows[0];
    return r ? { token_hash: String(r.token_hash), id_user: String(r.id_user), kedaluwarsa_ms: Number(r.kedaluwarsa_ms) } : null;
  }

  async listByUser(idUser: string): Promise<Sesi[]> {
    const [rows] = await this.db.execute<RowDataPacket[]>('SELECT token_hash, id_user, kedaluwarsa_ms FROM sesi WHERE id_user = ?', [idUser]);
    return rows.map((r) => ({ token_hash: String(r.token_hash), id_user: String(r.id_user), kedaluwarsa_ms: Number(r.kedaluwarsa_ms) }));
  }

  async delete(tokenHash: string): Promise<void> {
    await this.db.execute('DELETE FROM sesi WHERE token_hash = ?', [tokenHash]);
  }

  async deleteByUser(idUser: string): Promise<void> {
    await this.db.execute('DELETE FROM sesi WHERE id_user = ?', [idUser]);
  }

  async deleteExpired(nowMs: number): Promise<number> {
    const [hasil] = await this.db.execute<ResultSetHeader>('DELETE FROM sesi WHERE kedaluwarsa_ms <= ?', [nowMs]);
    return hasil.affectedRows;
  }
}
