import { randomUUID } from 'node:crypto';
import { mkdir, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Berita } from '../types/berita.js';
import type { BeritaRepository } from './interfaces.js';

const CATATAN_FILE = 'Ditulis otomatis oleh server setiap petugas menambah, mengubah, atau menghapus berita. Jangan disunting manual.';

/**
 * Berita disimpan di memori, dan (kecuali saat tes) ditulis ulang ke file JSON setiap ada perubahan,
 * sehingga tetap ada walau server dimulai ulang. Ini jembatan Fase 1; di Fase 2 diganti tabel MySQL
 * dengan interface yang sama.
 */
export class FileBeritaRepository implements BeritaRepository {
  private readonly data = new Map<string, Berita>();
  /** Penulisan file diantrekan satu per satu agar perubahan yang berdekatan tidak saling menimpa. */
  private antrean: Promise<void> = Promise.resolve();

  constructor(
    awal: Berita[],
    private readonly file: string | null,
  ) {
    for (const b of awal) this.data.set(b.id_berita, structuredClone(b));
  }

  async list(): Promise<Berita[]> {
    return [...this.data.values()].map((b) => structuredClone(b));
  }

  async findById(id: string): Promise<Berita | null> {
    const b = this.data.get(id);
    return b ? structuredClone(b) : null;
  }

  async create(b: Berita): Promise<void> {
    this.data.set(b.id_berita, structuredClone(b));
    await this.simpan();
  }

  async update(b: Berita): Promise<void> {
    this.data.set(b.id_berita, structuredClone(b));
    await this.simpan();
  }

  async delete(id: string): Promise<boolean> {
    const ada = this.data.delete(id);
    if (ada) await this.simpan();
    return ada;
  }

  private simpan(): Promise<void> {
    const file = this.file;
    if (!file) return Promise.resolve();
    // Isi file diambil saat giliran menulis tiba, jadi tulisan terakhir selalu memuat keadaan terbaru.
    const tulis = async () => {
      await mkdir(path.dirname(file), { recursive: true });
      const sementara = `${file}.${randomUUID()}.tmp`;
      await writeFile(sementara, JSON.stringify({ _catatan: CATATAN_FILE, berita: [...this.data.values()] }, null, 2), 'utf8');
      // rename menggantikan file lama sekaligus, jadi file tidak pernah setengah tertulis.
      await rename(sementara, file);
    };
    this.antrean = this.antrean.then(tulis, tulis);
    return this.antrean;
  }
}
