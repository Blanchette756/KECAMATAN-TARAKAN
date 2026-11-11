import type { MemoryStore } from '../database/memory-store.js';
import type { AuditLog, RiwayatStatus, Sesi } from '../types/pengajuan.js';
import type { AuditRepository, RiwayatRepository, SesiRepository } from './interfaces.js';

/** Riwayat perubahan status, dipakai linimasa lacak dan statistik waktu layanan. */
export class MemoryRiwayatRepository implements RiwayatRepository {
  constructor(private readonly store: MemoryStore) {}

  async add(r: RiwayatStatus): Promise<void> {
    this.store.riwayat.push(structuredClone(r));
  }

  async listByPengajuan(idPengajuan: string): Promise<RiwayatStatus[]> {
    return this.store.riwayat.filter((r) => r.id_pengajuan === idPengajuan).map((r) => structuredClone(r));
  }

  async listAll(): Promise<RiwayatStatus[]> {
    return this.store.riwayat.map((r) => structuredClone(r));
  }
}

/**
 * Jejak audit: siapa membuka data siapa dan kapan, untuk kewajiban perlindungan data pribadi.
 * Hanya `maks` entri terbaru yang disimpan supaya memori proses tidak terus bertambah.
 */
export class MemoryAuditRepository implements AuditRepository {
  constructor(
    private readonly store: MemoryStore,
    private readonly maks: number,
  ) {}

  async add(a: AuditLog): Promise<void> {
    this.store.auditLog.push(structuredClone(a));
    const lebih = this.store.auditLog.length - this.maks;
    if (lebih > 0) this.store.auditLog.splice(0, lebih);
  }

  async listByTarget(targetId: string): Promise<AuditLog[]> {
    return this.store.auditLog.filter((a) => a.target_id === targetId).map((a) => structuredClone(a));
  }
}

export class MemorySesiRepository implements SesiRepository {
  constructor(private readonly store: MemoryStore) {}

  async create(s: Sesi): Promise<void> {
    this.store.sesi.set(s.token_hash, structuredClone(s));
  }

  async findByHash(tokenHash: string): Promise<Sesi | null> {
    const s = this.store.sesi.get(tokenHash);
    return s ? structuredClone(s) : null;
  }

  async listByUser(idUser: string): Promise<Sesi[]> {
    return [...this.store.sesi.values()].filter((s) => s.id_user === idUser).map((s) => structuredClone(s));
  }

  async delete(tokenHash: string): Promise<void> {
    this.store.sesi.delete(tokenHash);
  }

  async deleteByUser(idUser: string): Promise<void> {
    for (const [hash, s] of this.store.sesi) if (s.id_user === idUser) this.store.sesi.delete(hash);
  }

  async deleteExpired(nowMs: number): Promise<number> {
    let n = 0;
    for (const [hash, s] of this.store.sesi) {
      if (s.kedaluwarsa_ms <= nowMs) {
        this.store.sesi.delete(hash);
        n++;
      }
    }
    return n;
  }
}
