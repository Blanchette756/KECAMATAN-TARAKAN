import type { Db } from '../../database/mysql/pool.js';
import type { MemoryStore } from '../../database/memory-store.js';
import type { Repositories } from '../interfaces.js';
import { MemoryMasterRepository } from '../layanan.repository.js';
import { MysqlBerkasRepository } from './berkas.repository.js';
import { MysqlAuditRepository, MysqlRiwayatRepository, MysqlSesiRepository } from './log.repository.js';
import { MysqlPengajuanRepository } from './pengajuan.repository.js';
import { MysqlBeritaRepository, MysqlFileRepository, MysqlUserRepository } from './user-berita-file.repository.js';

/** Repository MySQL. Data master tetap dibaca dari folder data/ karena ikut di-commit bersama kode. */
export function createMysqlRepositories(db: Db, store: MemoryStore, config: { auditLogMax: number }): Repositories {
  return {
    users: new MysqlUserRepository(db),
    master: new MemoryMasterRepository(store),
    pengajuan: new MysqlPengajuanRepository(db),
    berkas: new MysqlBerkasRepository(db),
    riwayat: new MysqlRiwayatRepository(db),
    audit: new MysqlAuditRepository(db, config.auditLogMax),
    sesi: new MysqlSesiRepository(db),
    berita: new MysqlBeritaRepository(db),
    files: new MysqlFileRepository(db),
  };
}
