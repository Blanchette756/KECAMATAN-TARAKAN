import type { User } from '../types/user.js';
import { AttemptLimiter } from '../utils/attempt-limiter.js';
import { AppError, unauthorized } from '../utils/errors.js';
import { newId, newToken, sha256 } from '../utils/ids.js';
import { cocokPassword, hashUntukUsernameTakAda } from '../utils/password.js';
import type { ServiceDeps } from './deps.js';

export interface HasilLogin {
  token: string;
  kedaluwarsa: string;
  user: User;
}

const PESAN_LOGIN_PETUGAS_GAGAL = 'Username atau password salah';
const LOGIN_PETUGAS_MAKS_GAGAL = 5;
const LOGIN_PETUGAS_KUNCI_MENIT = 15;

/**
 * Login petugas memakai username dan password. Login warga masih tiruan (email akun dummy)
 * sampai login Google selesai. Di production, login tiruan hanya untuk akun warga.
 * Yang disimpan untuk sesi hanya hash SHA-256 token.
 */
export class AuthService {
  /** Kunci per username setelah beberapa kali password salah, melengkapi rate limit per IP. */
  private readonly gagalPetugas = new AttemptLimiter(LOGIN_PETUGAS_MAKS_GAGAL, LOGIN_PETUGAS_KUNCI_MENIT * 60_000);

  constructor(private readonly deps: ServiceDeps) {}

  async mockLogin(email: string): Promise<HasilLogin> {
    const user = await this.deps.repos.users.findByEmail(email);
    if (!user || !user.aktif) throw unauthorized('Email tidak terdaftar sebagai akun dummy');
    if (user.role !== 'WARGA' && this.deps.config.nodeEnv === 'production') {
      throw unauthorized('Petugas masuk lewat halaman Masuk Petugas dengan username dan password');
    }
    return this.buatSesi(user);
  }

  async loginPetugas(username: string, password: string): Promise<HasilLogin> {
    const kunci = username.trim().toLowerCase();
    const nowMs = this.deps.now().getTime();
    if (this.gagalPetugas.terkunci(kunci, nowMs)) {
      throw new AppError(429, 'TERLALU_BANYAK_PERCOBAAN', `Terlalu banyak percobaan gagal. Coba lagi dalam ${LOGIN_PETUGAS_KUNCI_MENIT} menit.`);
    }
    const akun = await this.deps.repos.users.findKredensial(kunci);
    // Username yang tidak ada tetap melewati scrypt, supaya waktu jawabnya tidak membocorkan username mana yang ada.
    const cocok = await cocokPassword(password, akun?.password_hash ?? (await hashUntukUsernameTakAda()));
    if (!akun || !cocok || !akun.user.aktif || akun.user.role === 'WARGA') {
      this.gagalPetugas.catatGagal(kunci, nowMs);
      throw unauthorized(PESAN_LOGIN_PETUGAS_GAGAL);
    }
    this.gagalPetugas.reset(kunci);
    return this.buatSesi(akun.user);
  }

  private async buatSesi(user: User): Promise<HasilLogin> {
    const { repos, config, now } = this.deps;
    await repos.sesi.deleteExpired(now().getTime());
    // Batasi sesi aktif per akun; sesi yang paling dulu kedaluwarsa dicabut.
    const aktif = (await repos.sesi.listByUser(user.id_user)).sort((a, b) => a.kedaluwarsa_ms - b.kedaluwarsa_ms);
    for (const lama of aktif.slice(0, Math.max(0, aktif.length - (config.maxSesiPerUser - 1)))) {
      await repos.sesi.delete(lama.token_hash);
    }
    const token = newToken();
    const kedaluwarsaMs = now().getTime() + config.sessionTtlMinutes * 60_000;
    await repos.sesi.create({ token_hash: sha256(token), id_user: user.id_user, kedaluwarsa_ms: kedaluwarsaMs });
    await repos.audit.add({
      id_log: newId('LOG'),
      waktu: now().toISOString(),
      id_user: user.id_user,
      role: user.role,
      aksi: 'LOGIN',
      target_id: null,
    });
    return { token, kedaluwarsa: new Date(kedaluwarsaMs).toISOString(), user };
  }

  /** Mengembalikan user pemilik token, atau null bila token tidak valid/kedaluwarsa. */
  async verifyToken(token: string): Promise<User | null> {
    const { repos, now } = this.deps;
    const hash = sha256(token);
    const sesi = await repos.sesi.findByHash(hash);
    if (!sesi) return null;
    if (sesi.kedaluwarsa_ms <= now().getTime()) {
      await repos.sesi.delete(hash);
      return null;
    }
    const user = await repos.users.findById(sesi.id_user);
    return user && user.aktif ? user : null;
  }

  async logout(token: string): Promise<void> {
    await this.deps.repos.sesi.delete(sha256(token));
  }
}
