import type { SuratSelesai } from '../types/surat.js';
import type { SuratRepository } from './interfaces.js';

/**
 * Surat bertanda tangan untuk DB_DRIVER=memory (pengembangan dan tes): hanya di memori, hilang saat server dimulai ulang.
 * Di server sungguhan dipakai MysqlSuratRepository.
 */
export class MemorySuratRepository implements SuratRepository {
  private readonly data = new Map<string, { info: SuratSelesai; isi: Buffer }>();

  async simpan(s: SuratSelesai, isi: Buffer): Promise<void> {
    this.data.set(s.id_pengajuan, { info: { ...s }, isi: Buffer.from(isi) });
  }

  async findMeta(idPengajuan: string): Promise<SuratSelesai | null> {
    const ada = this.data.get(idPengajuan);
    return ada ? { ...ada.info } : null;
  }

  async baca(idPengajuan: string): Promise<{ info: SuratSelesai; data: Buffer } | null> {
    const ada = this.data.get(idPengajuan);
    return ada ? { info: { ...ada.info }, data: Buffer.from(ada.isi) } : null;
  }
}
