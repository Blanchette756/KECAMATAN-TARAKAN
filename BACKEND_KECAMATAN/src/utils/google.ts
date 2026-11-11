import { createRemoteJWKSet, jwtVerify } from 'jose';

export interface IdentitasGoogle {
  /** ID akun Google yang tidak pernah berubah (email bisa berubah). */
  sub: string;
  email: string;
  nama: string;
}

/** Memeriksa ID token dari tombol "Login dengan Google". Melempar galat bila token tidak sah. */
export type VerifikasiGoogle = (credential: string) => Promise<IdentitasGoogle>;

const KUNCI_GOOGLE = new URL('https://www.googleapis.com/oauth2/v3/certs');

/**
 * Tanda tangan token dicek dengan kunci publik Google (disimpan sementara oleh jose), lalu penerbit,
 * audience (harus Client ID kita), dan masa berlaku. Email wajib sudah diverifikasi Google.
 */
export function buatVerifikasiGoogle(clientId: string): VerifikasiGoogle {
  const kunci = createRemoteJWKSet(KUNCI_GOOGLE);
  return async (credential) => {
    const { payload } = await jwtVerify(credential, kunci, {
      issuer: ['https://accounts.google.com', 'accounts.google.com'],
      audience: clientId,
      clockTolerance: 60,
    });
    const { sub, email, email_verified: terverifikasi, name } = payload as { sub?: unknown; email?: unknown; email_verified?: unknown; name?: unknown };
    if (typeof sub !== 'string' || typeof email !== 'string' || terverifikasi !== true) throw new Error('Token Google tanpa email yang terverifikasi');
    return { sub, email: email.toLowerCase(), nama: typeof name === 'string' && name.trim() ? name.trim() : email };
  };
}
