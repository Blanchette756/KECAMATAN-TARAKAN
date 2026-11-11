import { useEffect, useState } from 'react';
import { ambilBerita, type Berita } from '../api';

// Berita kini dikelola petugas pelayanan lewat panel admin dan diambil dari API (GET /berita).

/** "2026-09-18" → "18 September 2026" */
export const tanggalBerita = (tanggal: string) =>
  new Date(`${tanggal}T00:00:00Z`).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

/** Daftar berita untuk halaman publik. `berita` null selama memuat. */
export function useBerita() {
  const [berita, setBerita] = useState<Berita[] | null>(null);
  const [galat, setGalat] = useState<string | null>(null);
  useEffect(() => {
    ambilBerita()
      .then(setBerita)
      .catch((error: Error) => setGalat(error.message));
  }, []);
  return { berita, galat };
}
