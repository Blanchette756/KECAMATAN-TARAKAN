import type { MemoryStore } from '../database/memory-store.js';
import type { User } from '../types/user.js';
import type { UserRepository } from './interfaces.js';

export class MemoryUserRepository implements UserRepository {
  constructor(private readonly store: MemoryStore) {}

  async findById(id: string): Promise<User | null> {
    const u = this.store.users.get(id);
    return u ? structuredClone(u) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const target = email.trim().toLowerCase();
    for (const u of this.store.users.values()) {
      if (u.email?.toLowerCase() === target) return structuredClone(u);
    }
    return null;
  }

  async findKredensial(username: string): Promise<{ user: User; password_hash: string } | null> {
    const k = this.store.kredensial.get(username.trim().toLowerCase());
    const u = k ? this.store.users.get(k.id_user) : undefined;
    return k && u ? { user: structuredClone(u), password_hash: k.password_hash } : null;
  }

  async findKredensialById(idUser: string): Promise<{ user: User; username: string; password_hash: string } | null> {
    const u = this.store.users.get(idUser);
    if (!u) return null;
    for (const [username, k] of this.store.kredensial) {
      if (k.id_user === idUser) return { user: structuredClone(u), username, password_hash: k.password_hash };
    }
    return null;
  }

  async listPetugas(): Promise<{ user: User; username: string }[]> {
    const hasil: { user: User; username: string }[] = [];
    for (const [username, k] of this.store.kredensial) {
      const u = this.store.users.get(k.id_user);
      if (u) hasil.push({ user: structuredClone(u), username });
    }
    return hasil.sort((a, b) => a.user.nama_lengkap.localeCompare(b.user.nama_lengkap));
  }

  async updatePetugas(idUser: string, data: Pick<User, 'nama_lengkap' | 'role' | 'seksi' | 'aktif'>, passwordHash: string | null): Promise<void> {
    const u = this.store.users.get(idUser);
    if (!u) throw new Error(`User ${idUser} tidak ada`);
    this.store.users.set(idUser, { ...u, ...data });
    if (passwordHash !== null) {
      for (const k of this.store.kredensial.values()) if (k.id_user === idUser) k.password_hash = passwordHash;
    }
  }

  async simpanPetugas(user: User, username: string, passwordHash: string): Promise<{ id_user: string; baru: boolean }> {
    const kunci = username.trim().toLowerCase();
    const lama = this.store.kredensial.get(kunci);
    const id_user = lama?.id_user ?? user.id_user;
    this.store.users.set(id_user, structuredClone({ ...user, id_user }));
    this.store.kredensial.set(kunci, { id_user, password_hash: passwordHash });
    return { id_user, baru: !lama };
  }
}
