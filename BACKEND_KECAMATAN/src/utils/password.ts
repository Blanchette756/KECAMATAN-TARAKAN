import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from 'node:crypto';

/**
 * Hash password dengan scrypt (bawaan Node). Format tersimpan:
 *   scrypt$N$r$p$salt$hash   (salt dan hash dalam base64url)
 * Parameter ikut disimpan, jadi bisa dinaikkan nanti tanpa merusak password lama.
 */
const N = 32_768;
const R = 8;
const P = 1;
const PANJANG_KUNCI = 32;

export const PANJANG_PASSWORD_MIN = 8;

function turunkan(password: string, salt: Buffer, opsi: { N: number; r: number; p: number }): Promise<Buffer> {
  const o: ScryptOptions = { ...opsi, maxmem: 128 * opsi.N * opsi.r * 2 };
  return new Promise((resolve, reject) => {
    scrypt(password.normalize('NFKC'), salt, PANJANG_KUNCI, o, (err, kunci) => (err ? reject(err) : resolve(kunci)));
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const kunci = await turunkan(password, salt, { N, r: R, p: P });
  return ['scrypt', N, R, P, salt.toString('base64url'), kunci.toString('base64url')].join('$');
}

/** false juga untuk hash yang formatnya tidak dikenal. */
export async function cocokPassword(password: string, tersimpan: string): Promise<boolean> {
  const [nama, n, r, p, saltB64, hashB64, ...sisa] = tersimpan.split('$');
  if (nama !== 'scrypt' || sisa.length > 0 || !saltB64 || !hashB64) return false;
  const opsi = { N: Number(n), r: Number(r), p: Number(p) };
  if (![opsi.N, opsi.r, opsi.p].every((x) => Number.isInteger(x) && x > 0) || opsi.N > 1_048_576) return false;
  const harapan = Buffer.from(hashB64, 'base64url');
  const kunci = await turunkan(password, Buffer.from(saltB64, 'base64url'), opsi);
  return kunci.length === harapan.length && timingSafeEqual(kunci, harapan);
}

/** Hash untuk username yang tidak ada, supaya waktu jawab sama dengan username yang ada. */
let hashPengganti: Promise<string> | null = null;
export const hashUntukUsernameTakAda = (): Promise<string> => (hashPengganti ??= hashPassword(randomBytes(16).toString('hex')));
