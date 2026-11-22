import type { Services } from '../container.js';
import type { BeritaInput } from '../schemas/berita.schema.js';
import type { User } from '../types/user.js';

export class BeritaController {
  constructor(private readonly s: Services) {}

  async daftar() {
    const data = await this.s.berita.daftar();
    return { data, meta: { total: data.length } };
  }

  async tambah(user: User, body: BeritaInput) {
    return { data: await this.s.berita.tambah(user, body) };
  }

  async ubah(user: User, id: string, body: BeritaInput) {
    return { data: await this.s.berita.ubah(user, id, body) };
  }

  async hapus(user: User, id: string) {
    return { data: await this.s.berita.hapus(user, id) };
  }

  async simpanFoto(user: User, id: string, mime: string, data: Buffer) {
    return { data: await this.s.berita.simpanFoto(user, id, mime, data) };
  }

  async hapusFoto(user: User, id: string) {
    return { data: await this.s.berita.hapusFoto(user, id) };
  }

  /** Mengembalikan isi foto mentah; route yang mengatur header gambar. */
  bacaFoto(id: string) {
    return this.s.berita.bacaFoto(id);
  }
}
