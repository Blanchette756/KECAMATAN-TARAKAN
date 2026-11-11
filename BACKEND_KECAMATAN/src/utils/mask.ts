/** 6571019900000001 → 6571********0001 */
export function maskNik(nik: string): string;
export function maskNik(nik: string | null): string | null;
export function maskNik(nik: string | null): string | null {
  if (nik === null) return null;
  if (nik.length < 8) return '*'.repeat(nik.length);
  return nik.slice(0, 4) + '*'.repeat(nik.length - 8) + nik.slice(-4);
}

/** 080000000001 → 0800-xxxx-0001 */
export function maskHp(hp: string): string;
export function maskHp(hp: string | null): string | null;
export function maskHp(hp: string | null): string | null {
  if (hp === null) return null;
  if (hp.length < 8) return 'x'.repeat(hp.length);
  return `${hp.slice(0, 4)}-xxxx-${hp.slice(-4)}`;
}
