import type { Db, PoolConnection, RowDataPacket } from './pool.js';

/**
 * Skema database. Dipasang otomatis saat server start, dan versi yang sudah terpasang dicatat di `schema_versi`.
 * Migrasi yang sudah pernah jalan di server jangan diubah; perubahan skema ditambahkan sebagai versi baru.
 *
 * Waktu disimpan sebagai teks ISO-8601 UTC seperti di versi memori, jadi bisa diurutkan sebagai teks.
 * data_formulir disimpan sebagai teks JSON supaya sama di MySQL dan MariaDB. Isi file unggahan disimpan
 * di tabel karena folder aplikasi di Hostinger ditimpa setiap deploy.
 */
const OPSI_TABEL = 'ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci';

interface Migrasi {
  versi: number;
  nama: string;
  /** Perintah SQL biasa, atau fungsi bila perlu memeriksa skema dulu supaya aman diulang. */
  sql: string[] | ((conn: PoolConnection) => Promise<void>);
}

async function kolomAda(conn: PoolConnection, tabel: string, kolom: string): Promise<boolean> {
  const [r] = await conn.query<RowDataPacket[]>(
    'SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?',
    [tabel, kolom],
  );
  return r.length > 0;
}

async function indeksAda(conn: PoolConnection, tabel: string, indeks: string): Promise<boolean> {
  const [r] = await conn.query<RowDataPacket[]>(
    'SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?',
    [tabel, indeks],
  );
  return r.length > 0;
}

export const MIGRASI: readonly Migrasi[] = [
  {
    versi: 1,
    nama: 'skema awal',
    sql: [
      `CREATE TABLE IF NOT EXISTS users (
        id_user VARCHAR(40) NOT NULL PRIMARY KEY,
        id_kelurahan VARCHAR(10) NULL,
        nik CHAR(16) NOT NULL,
        nama_lengkap VARCHAR(120) NOT NULL,
        email VARCHAR(120) NOT NULL,
        no_hp VARCHAR(20) NOT NULL,
        role VARCHAR(10) NOT NULL,
        seksi VARCHAR(30) NULL,
        alamat VARCHAR(250) NOT NULL,
        aktif TINYINT(1) NOT NULL,
        UNIQUE KEY uk_users_email (email),
        UNIQUE KEY uk_users_nik (nik)
      ) ${OPSI_TABEL}`,

      `CREATE TABLE IF NOT EXISTS pengajuan (
        id_pengajuan VARCHAR(50) NOT NULL PRIMARY KEY,
        no_registrasi VARCHAR(20) NOT NULL,
        id_user VARCHAR(40) NOT NULL,
        id_layanan VARCHAR(20) NOT NULL,
        seksi VARCHAR(30) NOT NULL,
        data_formulir LONGTEXT NOT NULL,
        tgl_pengajuan VARCHAR(30) NOT NULL,
        status_pengajuan VARCHAR(30) NOT NULL,
        catatan_revisi TEXT NULL,
        catatan_internal TEXT NULL,
        alasan_penolakan TEXT NULL,
        nomor_surat VARCHAR(80) NULL,
        qr_code_tte VARCHAR(80) NULL,
        file_surat_selesai VARCHAR(200) NULL,
        id_verifikator VARCHAR(40) NULL,
        id_kasi VARCHAR(40) NULL,
        id_camat VARCHAR(40) NULL,
        id_penyerah VARCHAR(40) NULL,
        tgl_selesai VARCHAR(30) NULL,
        tgl_diperbarui VARCHAR(30) NOT NULL,
        version INT NOT NULL,
        UNIQUE KEY uk_pengajuan_no_registrasi (no_registrasi),
        KEY idx_pengajuan_user (id_user, tgl_pengajuan),
        KEY idx_pengajuan_status (status_pengajuan, seksi, tgl_pengajuan),
        CONSTRAINT fk_pengajuan_user FOREIGN KEY (id_user) REFERENCES users (id_user)
      ) ${OPSI_TABEL}`,

      `CREATE TABLE IF NOT EXISTS berkas (
        id_berkas VARCHAR(50) NOT NULL PRIMARY KEY,
        id_pengajuan VARCHAR(50) NOT NULL,
        id_syarat VARCHAR(20) NOT NULL,
        nama_file VARCHAR(200) NOT NULL,
        mime_type VARCHAR(30) NOT NULL,
        ukuran_byte INT NOT NULL,
        file_url VARCHAR(200) NOT NULL,
        status_berkas VARCHAR(20) NOT NULL,
        catatan_admin TEXT NULL,
        diunggah_pada VARCHAR(30) NOT NULL,
        KEY idx_berkas_pengajuan (id_pengajuan, id_syarat),
        CONSTRAINT fk_berkas_pengajuan FOREIGN KEY (id_pengajuan) REFERENCES pengajuan (id_pengajuan) ON DELETE CASCADE
      ) ${OPSI_TABEL}`,

      `CREATE TABLE IF NOT EXISTS riwayat_status (
        seq BIGINT NOT NULL AUTO_INCREMENT,
        id_riwayat VARCHAR(50) NOT NULL,
        id_pengajuan VARCHAR(50) NOT NULL,
        dari VARCHAR(30) NULL,
        ke VARCHAR(30) NOT NULL,
        aksi VARCHAR(30) NOT NULL,
        oleh_id_user VARCHAR(40) NOT NULL,
        oleh_role VARCHAR(10) NOT NULL,
        catatan TEXT NULL,
        waktu VARCHAR(30) NOT NULL,
        PRIMARY KEY (seq),
        UNIQUE KEY uk_riwayat_id (id_riwayat),
        KEY idx_riwayat_pengajuan (id_pengajuan, seq),
        CONSTRAINT fk_riwayat_pengajuan FOREIGN KEY (id_pengajuan) REFERENCES pengajuan (id_pengajuan) ON DELETE CASCADE
      ) ${OPSI_TABEL}`,

      `CREATE TABLE IF NOT EXISTS audit_log (
        seq BIGINT NOT NULL AUTO_INCREMENT,
        id_log VARCHAR(50) NOT NULL,
        waktu VARCHAR(30) NOT NULL,
        id_user VARCHAR(40) NOT NULL,
        role VARCHAR(10) NOT NULL,
        aksi VARCHAR(30) NOT NULL,
        target_id VARCHAR(60) NULL,
        PRIMARY KEY (seq),
        UNIQUE KEY uk_audit_id (id_log),
        KEY idx_audit_target (target_id)
      ) ${OPSI_TABEL}`,

      `CREATE TABLE IF NOT EXISTS sesi (
        token_hash CHAR(64) NOT NULL PRIMARY KEY,
        id_user VARCHAR(40) NOT NULL,
        kedaluwarsa_ms BIGINT NOT NULL,
        KEY idx_sesi_user (id_user),
        KEY idx_sesi_kedaluwarsa (kedaluwarsa_ms)
      ) ${OPSI_TABEL}`,

      `CREATE TABLE IF NOT EXISTS nomor_surat_counter (
        tahun CHAR(4) NOT NULL PRIMARY KEY,
        terakhir INT NOT NULL
      ) ${OPSI_TABEL}`,

      `CREATE TABLE IF NOT EXISTS berita (
        id_berita VARCHAR(60) NOT NULL PRIMARY KEY,
        judul VARCHAR(150) NOT NULL,
        tanggal CHAR(10) NOT NULL,
        ringkasan TEXT NOT NULL,
        diperbarui_pada VARCHAR(30) NULL
      ) ${OPSI_TABEL}`,

      `CREATE TABLE IF NOT EXISTS file_unggahan (
        file_id VARCHAR(50) NOT NULL PRIMARY KEY,
        id_user VARCHAR(40) NOT NULL,
        nama_file VARCHAR(200) NOT NULL,
        mime_type VARCHAR(30) NOT NULL,
        ukuran_byte INT NOT NULL,
        dibuat_pada VARCHAR(30) NOT NULL,
        isi MEDIUMBLOB NOT NULL,
        KEY idx_file_user (id_user)
      ) ${OPSI_TABEL}`,

      // Penanda sekali jalan, misalnya berita awal sudah dimuat.
      `CREATE TABLE IF NOT EXISTS pengaturan (
        kunci VARCHAR(50) NOT NULL PRIMARY KEY,
        nilai VARCHAR(200) NOT NULL
      ) ${OPSI_TABEL}`,
    ],
  },
  {
    versi: 2,
    nama: 'login petugas dengan password',
    // Petugas tidak wajib punya NIK, email, HP, atau alamat. UNIQUE tetap berlaku untuk nilai yang terisi.
    sql: async (conn) => {
      await conn.query(
        'ALTER TABLE users MODIFY nik CHAR(16) NULL, MODIFY email VARCHAR(120) NULL, MODIFY no_hp VARCHAR(20) NULL, MODIFY alamat VARCHAR(250) NULL',
      );
      if (!(await kolomAda(conn, 'users', 'username'))) await conn.query('ALTER TABLE users ADD COLUMN username VARCHAR(50) NULL AFTER email');
      if (!(await kolomAda(conn, 'users', 'password_hash'))) await conn.query('ALTER TABLE users ADD COLUMN password_hash VARCHAR(200) NULL AFTER username');
      if (!(await indeksAda(conn, 'users', 'uk_users_username'))) await conn.query('ALTER TABLE users ADD UNIQUE KEY uk_users_username (username)');
    },
  },
  {
    versi: 3,
    nama: 'login warga dengan Google',
    sql: async (conn) => {
      if (!(await kolomAda(conn, 'users', 'google_sub'))) await conn.query('ALTER TABLE users ADD COLUMN google_sub VARCHAR(64) NULL AFTER password_hash');
      if (!(await indeksAda(conn, 'users', 'uk_users_google_sub'))) await conn.query('ALTER TABLE users ADD UNIQUE KEY uk_users_google_sub (google_sub)');
    },
  },
  {
    versi: 4,
    nama: 'indeks tautan file untuk pembersihan berkas yatim',
    // Pencarian "file yang tidak dipakai berkas mana pun" mencocokkan berkas.file_url, jadi perlu indeks.
    sql: async (conn) => {
      if (!(await indeksAda(conn, 'berkas', 'idx_berkas_file_url'))) await conn.query('ALTER TABLE berkas ADD KEY idx_berkas_file_url (file_url)');
    },
  },
];

/** Pasang migrasi yang belum jalan. GET_LOCK mencegah dua proses memasang bersamaan. */
export async function jalankanMigrasi(db: Db, log: (pesan: string) => void): Promise<void> {
  const conn = await db.getConnection();
  try {
    const [kunci] = await conn.query<RowDataPacket[]>("SELECT GET_LOCK('kecamatan_migrasi', 30) AS dapat");
    if (kunci[0]?.dapat !== 1) throw new Error('Tidak bisa mengunci migrasi database (proses lain sedang memasang skema?)');
    try {
      await conn.query(
        `CREATE TABLE IF NOT EXISTS schema_versi (
          versi INT NOT NULL PRIMARY KEY,
          nama VARCHAR(100) NOT NULL,
          dipasang_pada VARCHAR(30) NOT NULL
        ) ${OPSI_TABEL}`,
      );
      const [baris] = await conn.query<RowDataPacket[]>('SELECT versi FROM schema_versi');
      const sudah = new Set(baris.map((b) => Number(b.versi)));
      for (const m of MIGRASI) {
        if (sudah.has(m.versi)) continue;
        log(`Memasang skema database versi ${m.versi} (${m.nama})...`);
        // DDL tidak bisa di-rollback. Setiap migrasi ditulis aman diulang (IF NOT EXISTS atau cek skema dulu),
        // jadi kalau gagal di tengah, start berikutnya melanjutkan.
        if (typeof m.sql === 'function') await m.sql(conn);
        else for (const sql of m.sql) await conn.query(sql);
        await conn.query('INSERT INTO schema_versi (versi, nama, dipasang_pada) VALUES (?, ?, ?)', [m.versi, m.nama, new Date().toISOString()]);
      }
    } finally {
      // Bila koneksi putus, kunci ikut lepas sendiri; jangan sampai galat ini menutupi galat aslinya.
      await conn.query("SELECT RELEASE_LOCK('kecamatan_migrasi')").catch(() => undefined);
    }
  } finally {
    conn.release();
  }
}
