import Type, { type Static } from 'typebox';
import { BATAS_BERITA, ID_BERITA_POLA, TANGGAL_POLA } from '../types/berita.js';

export const BeritaInputSchema = Type.Object(
  {
    judul: Type.String({ minLength: BATAS_BERITA.judulMin, maxLength: BATAS_BERITA.judulMaks }),
    tanggal: Type.String({ pattern: TANGGAL_POLA, description: 'Format YYYY-MM-DD' }),
    ringkasan: Type.String({ minLength: BATAS_BERITA.ringkasanMin, maxLength: BATAS_BERITA.ringkasanMaks }),
  },
  { additionalProperties: false },
);
export type BeritaInput = Static<typeof BeritaInputSchema>;

export const BeritaIdParamSchema = Type.Object({ id: Type.String({ pattern: ID_BERITA_POLA, maxLength: 60 }) });
