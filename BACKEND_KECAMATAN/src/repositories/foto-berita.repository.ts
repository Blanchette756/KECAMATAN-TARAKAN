import type { FotoBerita } from '../types/berita.js';
import type { FotoBeritaRepository } from './interfaces.js';

/**
 * Foto berita untuk DB_DRIVER=memory (pengembangan dan tes): hanya di memori, hilang saat server dimulai ulang.
 * Di server sungguhan dipakai MysqlFotoBeritaRepository.
 */
export class MemoryFotoBeritaRepository implements FotoBeritaRepository {
  private readonly data = new Map<string, { info: FotoBerita; isi: Buffer }>();

  async simpan(f: FotoBerita, isi: Buffer): Promise<void> {
    this.data.set(f.id_berita, { info: { ...f }, isi: Buffer.from(isi) });
  }

  async baca(idBerita: string): Promise<{ info: FotoBerita; data: Buffer } | null> {
    const ada = this.data.get(idBerita);
    return ada ? { info: { ...ada.info }, data: Buffer.from(ada.isi) } : null;
  }

  async listMeta(): Promise<FotoBerita[]> {
    return [...this.data.values()].map((f) => ({ ...f.info }));
  }

  async hapus(idBerita: string): Promise<boolean> {
    return this.data.delete(idBerita);
  }
}
