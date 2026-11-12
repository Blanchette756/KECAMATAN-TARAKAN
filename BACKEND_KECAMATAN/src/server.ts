import { buildApp } from './app.js';
import { ConfigError, loadConfig, loadDotEnvFile } from './config/env.js';
import { buatContainer } from './container.js';
import { DataValidationError } from './database/data-loader.js';
import { seedDemoPengajuan } from './database/seed-demo.js';

/** Pesan untuk kegagalan koneksi database yang umum. */
function pesanGagalDatabase(err: unknown): string | null {
  const kode = (err as { code?: string } | null)?.code;
  switch (kode) {
    case 'ER_ACCESS_DENIED_ERROR':
      return 'Login ke database ditolak. Periksa DB_USER dan DB_PASSWORD.';
    case 'ER_BAD_DB_ERROR':
      return 'Database tidak ditemukan. Periksa DB_NAME.';
    case 'ER_DBACCESS_DENIED_ERROR':
      return 'User database tidak punya akses ke DB_NAME. Hubungkan user ke database di hPanel.';
    case 'ECONNREFUSED':
    case 'ETIMEDOUT':
    case 'ENOTFOUND':
    case 'EHOSTUNREACH':
      return 'Server database tidak dapat dihubungi. Periksa DB_HOST/DB_PORT. Dari laptop: DB_HOST=srvNNNN.hstgr.io dan IP Anda harus terdaftar di Remote MySQL hPanel. Di server Hostinger: DB_HOST=127.0.0.1.';
    default:
      return null;
  }
}

async function main(): Promise<void> {
  loadDotEnvFile();
  const config = loadConfig();
  if (config.dbDriver === 'mysql') console.log(`[db] Menyambung ke MySQL ${config.db?.host}:${config.db?.port}/${config.db?.name} ...`);
  const container = await buatContainer(config, (pesan) => console.log(`[db] ${pesan}`));
  const app = await buildApp(container);
  app.addHook('onClose', async () => container.tutup());

  const akunAwal = await container.services.akunPetugas.pastikanAkunAwal();
  if (akunAwal === 'dibuat') {
    app.log.info(`Akun petugas awal "${config.petugasAwal?.username}" dibuat. Setelah masuk, ganti passwordnya dan hapus PETUGAS_AWAL_PASSWORD dari environment variables.`);
  }
  if (config.dbDriver === 'memory' && config.petugasAwal) {
    app.log.warn('Akun petugas awal dibuat di memori dan hilang saat server restart (DB_DRIVER=memory).');
  }

  if (config.authMode === 'mock' && config.nodeEnv === 'production') {
    // Rute login tiruan tidak dipasang di production; warga masuk lewat Google, petugas dengan password.
    if (!config.googleClientId) app.log.warn('⚠ GOOGLE_CLIENT_ID belum diisi: warga belum bisa masuk.');
  }
  if (!config.nodeEnvEksplisit) {
    app.log.warn('⚠ NODE_ENV tidak diisi, dianggap "development". Di server, selalu isi NODE_ENV=production.');
  }
  if (config.dbDriver === 'memory' && config.nodeEnv === 'production') {
    app.log.warn('⚠ DB_DRIVER=memory di production: pengajuan, akun, dan sesi hilang setiap restart atau deploy. Isi DB_DRIVER=mysql.');
  }

  // Hanya kalau belum ada pengajuan, supaya data contoh tidak dobel setiap restart.
  if (config.seedDemoPengajuan && (await container.repos.pengajuan.listAll()).length === 0) {
    const contoh = await seedDemoPengajuan(container);
    if (config.nodeEnv === 'production') {
      // Jangan tulis pasangan nomor registrasi + 4 digit HP ke log server production.
      app.log.info(`Data demo: ${contoh.length} contoh pengajuan dibuat`);
    } else {
      app.log.info({ contoh_lacak: contoh }, `Data demo: ${contoh.length} contoh pengajuan dibuat`);
    }
  }

  // Berkas yang diunggah tetapi tidak pernah dipakai pengajuan dibuang berkala, supaya database hosting tidak penuh.
  const bersihkanBerkasYatim = () =>
    container.services.unggah
      .bersihkanYatim()
      .then((n) => {
        if (n > 0) app.log.info(`Pembersihan: ${n} berkas unggahan yang tidak dipakai dihapus`);
      })
      .catch((err: unknown) => app.log.warn({ err }, 'Pembersihan berkas unggahan gagal'));
  void bersihkanBerkasYatim();
  const pewaktuPembersihan = setInterval(() => void bersihkanBerkasYatim(), 6 * 3_600_000);
  pewaktuPembersihan.unref();
  app.addHook('onClose', async () => clearInterval(pewaktuPembersihan));

  // Hentikan server dengan rapi saat Hostinger me-restart/deploy.
  for (const sinyal of ['SIGINT', 'SIGTERM'] as const) {
    process.once(sinyal, () => {
      app.log.info(`${sinyal} diterima, menutup server...`);
      app.close().then(
        () => process.exit(0),
        () => process.exit(1),
      );
    });
  }

  await app.listen({ port: config.port, host: config.host });
  if (config.enableDocs) app.log.info(`Dokumentasi API: http://localhost:${config.port}/docs`);
}

main().catch((err: unknown) => {
  const db = pesanGagalDatabase(err);
  if (err instanceof ConfigError || err instanceof DataValidationError) {
    console.error(`\n✘ Server tidak dijalankan.\n${err.message}\n`);
  } else if (db) {
    console.error(`\n✘ Server tidak dijalankan.\n[db] ${db}\n(${(err as Error).message})\n`);
  } else {
    console.error(err);
  }
  process.exit(1);
});
