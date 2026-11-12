import type { MemoryStore } from '../database/memory-store.js';
import type { FileUnggahan } from '../types/berkas.js';
import type { FileRepository } from './interfaces.js';

const AWALAN_TAUTAN = 'unggah://';

/** File unggahan di memori, untuk pengembangan dan tes. */
export class MemoryFileRepository implements FileRepository {
  constructor(private readonly store: MemoryStore) {}

  async create(f: FileUnggahan, isi: Buffer): Promise<void> {
    if (this.store.files.has(f.file_id)) throw new Error(`Duplikat file_id ${f.file_id}`);
    this.store.files.set(f.file_id, { info: structuredClone(f), data: Buffer.from(isi) });
  }

  async findMeta(fileId: string): Promise<FileUnggahan | null> {
    const f = this.store.files.get(fileId);
    return f ? structuredClone(f.info) : null;
  }

  async baca(fileId: string): Promise<{ info: FileUnggahan; data: Buffer } | null> {
    const f = this.store.files.get(fileId);
    return f ? { info: structuredClone(f.info), data: Buffer.from(f.data) } : null;
  }

  /** ID file yang sedang dipakai berkas pengajuan. */
  private idDipakai(): Set<string> {
    const dipakai = new Set<string>();
    for (const b of this.store.berkas.values()) if (b.file_url.startsWith(AWALAN_TAUTAN)) dipakai.add(b.file_url.slice(AWALAN_TAUTAN.length));
    return dipakai;
  }

  async hitungYatim(idUser: string): Promise<number> {
    const dipakai = this.idDipakai();
    let n = 0;
    for (const [id, f] of this.store.files) if (f.info.id_user === idUser && !dipakai.has(id)) n++;
    return n;
  }

  async hapusBilaYatim(fileId: string): Promise<boolean> {
    if (!this.store.files.has(fileId) || this.idDipakai().has(fileId)) return false;
    return this.store.files.delete(fileId);
  }

  async hapusYatimSebelum(sebelumIso: string): Promise<number> {
    const dipakai = this.idDipakai();
    let n = 0;
    for (const [id, f] of [...this.store.files]) {
      if (f.info.dibuat_pada < sebelumIso && !dipakai.has(id)) {
        this.store.files.delete(id);
        n++;
      }
    }
    return n;
  }
}
