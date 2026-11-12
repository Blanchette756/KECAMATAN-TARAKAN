import type { User } from '../types/user.js';
import { AttemptLimiter } from '../utils/attempt-limiter.js';
import { AppError, forbidden, unauthorized } from '../utils/errors.js';
import type { IdentitasGoogle } from '../utils/google.js';
import { newId, newToken, randomKode, sha256 } from '../utils/ids.js';
import { cocokPassword, hashUntukUsernameTakAda } from '../utils/password.js';
import type { ServiceDeps } from './deps.js';

export interface HasilLogin {
  token: string;
  kedaluwarsa: string;
  user: User;
}

const PESAN_LOGIN_PETUGAS_GAGAL = 'Username atau password salah';
/** Percobaan gagal per pasangan username + IP sebelum dikunci. */
export const LOGIN_PETUGAS_MAKS_GAGAL = 5;
/**
 * Percobaan gagal per username dari semua IP sekaligus. Jauh lebih longgar, hanya untuk menahan tebakan password
 * yang disebar dari banyak IP. Dibuat longgar supaya satu orang iseng tidak bisa mengunci akun petugas dari luar.
 */
export const LOGIN_PETUGAS_MAKS_GAGAL_SEMUA_IP = 30;
const LOGIN_PETUGAS_KUNCI_MENIT = 15;

/**
 * Warga login dengan Google, petugas dengan username dan password. Login tiruan (email akun dummy)
 * hanya untuk pengembangan dan tes; rutenya tidak dipasang di production.
 * Yang disimpan untuk sesi hanya hash SHA-256 token.
 */
export class AuthService {
  /** Kunci per pasangan username + IP setelah beberapa kali password salah, melengkapi rate limit per IP. */
  private readonly gagalPetugas = new AttemptLimiter(LOGIN_PETUGAS_MAKS_GAGAL, LOGIN_PETUGAS_KUNCI_MENIT * 60_000);
  /** Kunci per username dari semua IP, untuk tebakan password yang disebar. */
  private readonly gagalPetugasSemuaIp = new AttemptLimiter(LOGIN_PETUGAS_MAKS_GAGAL_SEMUA_IP, LOGIN_PETUGAS_KUNCI_MENIT * 60_000);

  constructor(private readonly deps: ServiceDeps) {}

  get googleClientId(): string | null {
    return this.deps.config.googleClientId;
  }

  async mockLogin(email: string): Promise<HasilLogin> {
    const user = await this.deps.repos.users.findByEmail(email);
    if (!user || !user.aktif) throw unauthorized('Email tidak terdaftar sebagai akun dummy');
    if (user.role !== 'WARGA' && this.deps.config.nodeEnv === 'production') {
      throw unauthorized('Petugas masuk lewat halaman Masuk Petugas dengan username dan password');
    }
    return this.buatSesi(user);
  }

  /**
   * `ip` dipakai agar kunci akun tidak bisa dipicu orang lain: yang terkunci hanya pengguna dari IP yang salah berkali-kali,
   * bukan seluruh akun. Tanpa `ip` (mis. dipanggil dari skrip), semua dianggap satu sumber.
   */
  async loginPetugas(username: string, password: string, ip = 'tak-diketahui'): Promise<HasilLogin> {
    const kunci = username.trim().toLowerCase();
    const kunciIp = `${kunci}|${ip}`;
    const nowMs = this.deps.now().getTime();
    if (this.gagalPetugas.terkunci(kunciIp, nowMs) || this.gagalPetugasSemuaIp.terkunci(kunci, nowMs)) {
      throw new AppError(429, 'TERLALU_BANYAK_PERCOBAAN', `Terlalu banyak percobaan gagal. Coba lagi dalam ${LOGIN_PETUGAS_KUNCI_MENIT} menit.`);
    }
    const akun = await this.deps.repos.users.findKredensial(kunci);
    // Username yang tidak ada tetap melewati scrypt, supaya waktu jawabnya tidak membocorkan username mana yang ada.
    const cocok = await cocokPassword(password, akun?.password_hash ?? (await hashUntukUsernameTakAda()));
    if (!akun || !cocok || !akun.user.aktif || akun.user.role === 'WARGA') {
      this.gagalPetugas.catatGagal(kunciIp, nowMs);
      this.gagalPetugasSemuaIp.catatGagal(kunci, nowMs);
      throw unauthorized(PESAN_LOGIN_PETUGAS_GAGAL);
    }
    this.gagalPetugas.reset(kunciIp);
    return this.buatSesi(akun.user);
  }

  /**
   * Login warga dengan Google. Akun dibuat otomatis saat pertama kali masuk; NIK, HP, alamat, dan
   * kelurahan diisi sesudahnya di halaman Lengkapi Profil.
   */
  async loginGoogle(credential: string): Promise<HasilLogin> {
    const { repos } = this.deps;
    const verifikasi = this.deps.verifikasiGoogle;
    if (!verifikasi) throw new AppError(503, 'GOOGLE_BELUM_AKTIF', 'Login Google belum diaktifkan. Hubungi petugas kecamatan.');
    let id: IdentitasGoogle;
    try {
      id = await verifikasi(credential);
    } catch {
      throw unauthorized('Login Google gagal. Coba lagi.');
    }

    let user = await repos.users.findByGoogleSub(id.sub);
    if (!user) {
      const samaEmail = await repos.users.findByEmail(id.email);
      if (samaEmail && samaEmail.role !== 'WARGA') throw forbidden('Email ini dipakai akun petugas. Petugas masuk lewat halaman Masuk Petugas.');
      if (samaEmail) {
        await repos.users.tautkanGoogle(samaEmail.id_user, id.sub);
        user = samaEmail;
      } else {
        user = {
          id_user: `USR-WG-${randomKode(8)}`,
          id_kelurahan: null,
          nik: null,
          nama_lengkap: id.nama.slice(0, 120),
          email: id.email,
          no_hp: null,
          role: 'WARGA',
          seksi: null,
          alamat: null,
          aktif: true,
        };
        await repos.users.buatWargaGoogle(user, id.sub);
      }
    }
    if (!user.aktif) throw forbidden('Akun ini dinonaktifkan. Hubungi petugas kecamatan.');
    return this.buatSesi(user);
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
