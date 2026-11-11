import type { MemoryStore } from '../database/memory-store.js';
import type { FileUnggahan } from '../types/berkas.js';
import type { FileRepository } from './interfaces.js';

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
}
