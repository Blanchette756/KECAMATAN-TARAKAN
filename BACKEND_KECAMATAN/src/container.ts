import type { AppConfig } from './config/env.js';
import { muatBerita } from './database/berita-loader.js';
import { loadMasterData, type MasterData } from './database/data-loader.js';
import { MemoryStore } from './database/memory-store.js';
import { jalankanMigrasi } from './database/mysql/migrasi.js';
import { buatPool } from './database/mysql/pool.js';
import { muatBeritaAwalSekali, sinkronAkunDariFile } from './database/mysql/seed.js';
import { createMemoryRepositories } from './repositories/index.js';
import type { Repositories } from './repositories/interfaces.js';
import { createMysqlRepositories } from './repositories/mysql/index.js';
import { AkunPetugasService } from './services/akun-petugas.js';
import { AuthService } from './services/auth.service.js';
import { BeritaService } from './services/berita.service.js';
import type { ServiceDeps } from './services/deps.js';
import { LayananService } from './services/layanan.service.js';
import { PengajuanService } from './services/pengajuan.service.js';
import { StatistikService } from './services/statistik.service.js';
import { UnggahService } from './services/unggah.service.js';
import { WorkflowService } from './services/workflow.service.js';

export interface Services {
  auth: AuthService;
  layanan: LayananService;
  pengajuan: PengajuanService;
  workflow: WorkflowService;
  statistik: StatistikService;
  unggah: UnggahService;
  berita: BeritaService;
  akunPetugas: AkunPetugasService;
}

export interface Container {
  config: AppConfig;
  repos: Repositories;
  services: Services;
  /** Data master selalu dibaca dari sini. Dengan DB_DRIVER=memory, data transaksi juga disimpan di sini. */
  store: MemoryStore;
  tutup: () => Promise<void>;
}

export interface ContainerOptions {
  master?: MasterData;
  now?: () => Date;
}

function rakit(config: AppConfig, repos: Repositories, store: MemoryStore, opts: ContainerOptions, tutup: () => Promise<void>): Container {
  const deps: ServiceDeps = { repos, config, now: opts.now ?? (() => new Date()) };
  const unggah = new UnggahService(deps);
  const workflow = new WorkflowService(deps);
  const services: Services = {
    auth: new AuthService(deps),
    layanan: new LayananService(deps),
    pengajuan: new PengajuanService(deps, workflow, unggah),
    workflow,
    statistik: new StatistikService(deps),
    unggah,
    berita: new BeritaService(deps),
    akunPetugas: new AkunPetugasService(deps),
  };
  return { config, repos, services, store, tutup };
}

/** Container dengan data di memori, untuk pengembangan dan tes. */
export function createContainer(config: AppConfig, opts: ContainerOptions = {}): Container {
  if (config.dbDriver !== 'memory') throw new Error('createContainer() hanya untuk DB_DRIVER=memory; gunakan buatContainer()');
  const store = new MemoryStore(opts.master ?? loadMasterData(config.dataDir));
  return rakit(config, createMemoryRepositories(store, config), store, opts, async () => undefined);
}

/**
 * Container sesuai DB_DRIVER. Untuk mysql: pasang skema dan muat berita awal. Akun dummy dari users.json
 * hanya disalin bila SALIN_AKUN_DUMMY=true (misalnya database uji coba).
 */
export async function buatContainer(config: AppConfig, log: (pesan: string) => void, opts: ContainerOptions = {}): Promise<Container> {
  if (config.dbDriver === 'memory' || !config.db) return createContainer(config, opts);

  const master = opts.master ?? loadMasterData(config.dataDir);
  const db = buatPool(config.db);
  try {
    await jalankanMigrasi(db, log);
    if (config.salinAkunDummy) {
      const akun = await sinkronAkunDariFile(db, master.users);
      if (akun.baru + akun.diperbarui > 0) log(`Akun dummy dari users.json: ${akun.baru} ditambahkan, ${akun.diperbarui} diperbarui`);
    }
    const berita = await muatBeritaAwalSekali(db, muatBerita(config.dataDir, config.beritaFile, log));
    if (berita !== null) log(`Berita awal dimuat ke database: ${berita} berita`);
  } catch (err) {
    await db.end().catch(() => undefined);
    throw err;
  }
  const store = new MemoryStore(master);
  return rakit(config, createMysqlRepositories(db, store, config), store, opts, () => db.end());
}
