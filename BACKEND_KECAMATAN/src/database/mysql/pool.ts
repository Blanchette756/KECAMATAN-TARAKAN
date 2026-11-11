import mysql, { type Pool, type PoolConnection, type ResultSetHeader, type RowDataPacket } from 'mysql2/promise';
import type { DbConfig } from '../../config/env.js';

export type Db = Pool;
export type { PoolConnection, ResultSetHeader, RowDataPacket };

/**
 * Pool koneksi MySQL/MariaDB. Di server Hostinger DB_HOST=127.0.0.1. Dari laptop pakai host remote,
 * setelah IP laptop didaftarkan di Remote MySQL.
 */
export function buatPool(c: DbConfig): Db {
  return mysql.createPool({
    host: c.host,
    port: c.port,
    database: c.name,
    user: c.user,
    password: c.password,
    // Shared hosting membatasi jumlah koneksi per user.
    connectionLimit: 5,
    waitForConnections: true,
    charset: 'utf8mb4_unicode_ci',
    timezone: 'Z',
    supportBigNumbers: true,
    bigNumberStrings: false,
    enableKeepAlive: true,
    connectTimeout: 10_000,
  });
}

/** Jalankan `kerja` dalam satu transaksi. Rollback bila gagal. */
export async function dalamTransaksi<T>(db: Db, kerja: (conn: PoolConnection) => Promise<T>): Promise<T> {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const hasil = await kerja(conn);
    await conn.commit();
    return hasil;
  } catch (err) {
    await conn.rollback().catch(() => undefined);
    throw err;
  } finally {
    conn.release();
  }
}

export const teksAtauNull = (v: unknown): string | null => (v === null || v === undefined ? null : String(v));
