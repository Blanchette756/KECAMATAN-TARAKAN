import type { Berita } from '../../types/berita.js';
import type { User } from '../../types/user.js';
import { KOLOM_USER } from '../../repositories/mysql/user-berita-file.repository.js';
import { dalamTransaksi, type Db, type ResultSetHeader, type RowDataPacket } from './pool.js';

/**
 * Salin akun dari data/users.json ke tabel users setiap start. Akun yang tidak ada di file tidak disentuh.
 * Dicocokkan per id_user, bukan ON DUPLICATE KEY, supaya email atau NIK yang bentrok dengan akun lain
 * menjadi error dan tidak menimpa akun itu.
 */
export async function sinkronAkunDariFile(db: Db, users: readonly User[]): Promise<{ baru: number; diperbarui: number }> {
  return dalamTransaksi(db, async (conn) => {
    let baru = 0;
    let diperbarui = 0;
    for (const u of users) {
      const nilai = KOLOM_USER.map((k) => (k === 'aktif' ? (u.aktif ? 1 : 0) : u[k]));
      const [ada] = await conn.execute<RowDataPacket[]>('SELECT 1 FROM users WHERE id_user = ?', [u.id_user]);
      if (ada.length === 0) {
        await conn.execute(`INSERT INTO users (${KOLOM_USER.join(', ')}) VALUES (${KOLOM_USER.map(() => '?').join(', ')})`, nilai);
        baru++;
      } else {
        const ubah = KOLOM_USER.filter((k) => k !== 'id_user');
        const [hasil] = await conn.execute<ResultSetHeader>(
          `UPDATE users SET ${ubah.map((k) => `${k} = ?`).join(', ')} WHERE id_user = ?`,
          [...ubah.map((k) => (k === 'aktif' ? (u.aktif ? 1 : 0) : u[k])), u.id_user],
        );
        if (hasil.changedRows > 0) diperbarui++;
      }
    }
    return { baru, diperbarui };
  });
}

const KUNCI_BERITA_AWAL = 'berita_awal_dimuat';

/**
 * Muat berita awal satu kali, saat database masih baru. Setelah itu berita hanya dikelola lewat database,
 * jadi menghapus semua berita tidak memunculkannya lagi.
 */
export async function muatBeritaAwalSekali(db: Db, berita: readonly Berita[]): Promise<number | null> {
  return dalamTransaksi(db, async (conn) => {
    const [tanda] = await conn.execute<RowDataPacket[]>('SELECT nilai FROM pengaturan WHERE kunci = ? FOR UPDATE', [KUNCI_BERITA_AWAL]);
    if (tanda.length > 0) return null;
    for (const b of berita) {
      await conn.execute('INSERT IGNORE INTO berita (id_berita, judul, tanggal, ringkasan, diperbarui_pada) VALUES (?, ?, ?, ?, ?)', [
        b.id_berita,
        b.judul,
        b.tanggal,
        b.ringkasan,
        b.diperbarui_pada ?? null,
      ]);
    }
    await conn.execute('INSERT INTO pengaturan (kunci, nilai) VALUES (?, ?)', [KUNCI_BERITA_AWAL, new Date().toISOString()]);
    return berita.length;
  });
}
