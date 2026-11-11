import Type, { type Static } from 'typebox';

export const ID_BERITA_POLA = '^BRT-[0-9A-Za-z-]+$';
export const TANGGAL_POLA = '^[0-9]{4}-[0-9]{2}-[0-9]{2}$';

/** Batas panjang dipakai bersama oleh skema request dan validasi di service. */
export const BATAS_BERITA = { judulMin: 5, judulMaks: 150, ringkasanMin: 10, ringkasanMaks: 600 } as const;

export const BeritaSchema = Type.Object(
  {
    id_berita: Type.String({ pattern: ID_BERITA_POLA, maxLength: 60 }),
    judul: Type.String({ minLength: BATAS_BERITA.judulMin, maxLength: BATAS_BERITA.judulMaks }),
    /** Tanggal kegiatan/terbit, format YYYY-MM-DD. */
    tanggal: Type.String({ pattern: TANGGAL_POLA }),
    ringkasan: Type.String({ minLength: BATAS_BERITA.ringkasanMin, maxLength: BATAS_BERITA.ringkasanMaks }),
    diperbarui_pada: Type.Optional(Type.String()),
  },
  { additionalProperties: false },
);
export type Berita = Static<typeof BeritaSchema>;

export const BeritaFileSchema = Type.Object(
  { _catatan: Type.Optional(Type.String()), berita: Type.Array(BeritaSchema, { maxItems: 1000 }) },
  { additionalProperties: false },
);
