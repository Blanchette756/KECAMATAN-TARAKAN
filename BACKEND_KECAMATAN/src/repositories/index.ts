import type { MemoryStore } from '../database/memory-store.js';
import type { Repositories } from './interfaces.js';
import type { AppConfig } from '../config/env.js';
import { MemoryUserRepository } from './user.repository.js';
import { MemoryMasterRepository } from './layanan.repository.js';
import { MemoryPengajuanRepository } from './pengajuan.repository.js';
import { MemoryBerkasRepository } from './berkas.repository.js';
import { MemoryAuditRepository, MemoryRiwayatRepository, MemorySesiRepository } from './log.repository.js';
import { FileBeritaRepository } from './berita.repository.js';
import { MemoryFileRepository } from './file.repository.js';
import { muatBerita } from '../database/berita-loader.js';

/** Repository di memori (DB_DRIVER=memory). Versi MySQL ada di ./mysql/. */
export function createMemoryRepositories(store: MemoryStore, config: Pick<AppConfig, 'auditLogMax' | 'dataDir' | 'beritaFile'>): Repositories {
  return {
    users: new MemoryUserRepository(store),
    master: new MemoryMasterRepository(store),
    pengajuan: new MemoryPengajuanRepository(store),
    berkas: new MemoryBerkasRepository(store),
    riwayat: new MemoryRiwayatRepository(store),
    audit: new MemoryAuditRepository(store, config.auditLogMax),
    sesi: new MemorySesiRepository(store),
    berita: new FileBeritaRepository(muatBerita(config.dataDir, config.beritaFile), config.beritaFile),
    files: new MemoryFileRepository(store),
  };
}
