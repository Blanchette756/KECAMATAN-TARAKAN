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
});

export const LoginResponseSchema = Type.Object({
  data: Type.Object({
    token: Type.String(),
    token_type: Type.Literal('Bearer'),
    kedaluwarsa: Type.String(),
    user: UserPublikSchema,
  }),
});

export const MeResponseSchema = Type.Object({ data: UserPublikSchema });
