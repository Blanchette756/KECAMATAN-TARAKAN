import Type, { type Static } from 'typebox';
import { POLA_EMAIL, POLA_USERNAME_LOGIN } from '../constants/pola.js';

export const MockLoginBodySchema = Type.Object(
  { email: Type.String({ minLength: 3, maxLength: 120, pattern: POLA_EMAIL }) },
  { additionalProperties: false },
);
export type MockLoginBody = Static<typeof MockLoginBodySchema>;

/**
 * Huruf besar diterima karena keyboard HP sering membuat huruf pertama kapital; service menyamakannya.
 * Password tidak dibatasi pola supaya pesan galat tidak membocorkan aturan password.
 */
export const LoginPetugasBodySchema = Type.Object(
  {
    username: Type.String({ minLength: 3, maxLength: 50, pattern: POLA_USERNAME_LOGIN }),
    password: Type.String({ minLength: 1, maxLength: 200 }),
  },
  { additionalProperties: false },
);
export type LoginPetugasBody = Static<typeof LoginPetugasBodySchema>;

const TeksAtauNull = Type.Union([Type.String(), Type.Null()]);

export const UserPublikSchema = Type.Object({
  id_user: Type.String(),
  nama_lengkap: Type.String(),
  email: TeksAtauNull,
  role: Type.String(),
  seksi: TeksAtauNull,
  id_kelurahan: TeksAtauNull,
  nik_tersamar: TeksAtauNull,
  no_hp_tersamar: TeksAtauNull,
  profil_lengkap: Type.Boolean(),
});

export const LoginGoogleBodySchema = Type.Object({ credential: Type.String({ minLength: 20, maxLength: 4096 }) }, { additionalProperties: false });
export type LoginGoogleBody = Static<typeof LoginGoogleBodySchema>;

/** Panjang dan pola dicek ulang di service supaya pesannya jelas. */
export const ProfilBodySchema = Type.Object(
  {
    nama_lengkap: Type.String({ minLength: 1, maxLength: 120 }),
    nik: Type.String({ minLength: 1, maxLength: 30 }),
    no_hp: Type.String({ minLength: 1, maxLength: 30 }),
    alamat: Type.String({ minLength: 1, maxLength: 250 }),
    id_kelurahan: Type.String({ minLength: 1, maxLength: 20 }),
  },
  { additionalProperties: false },
);
export type ProfilBody = Static<typeof ProfilBodySchema>;

export const LoginResponseSchema = Type.Object({
  data: Type.Object({
    token: Type.String(),
    token_type: Type.Literal('Bearer'),
    kedaluwarsa: Type.String(),
    user: UserPublikSchema,
  }),
});

export const MeResponseSchema = Type.Object({ data: UserPublikSchema });
