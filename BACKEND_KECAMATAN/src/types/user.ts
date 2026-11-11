import Type, { type Static } from 'typebox';
import { RoleSchema, SeksiSchema } from './common.js';
import { POLA_EMAIL } from '../constants/pola.js';

export const KelurahanSchema = Type.Object(
  {
    id_kelurahan: Type.String({ pattern: '^KEL-[0-9]{3}$' }),
    nama: Type.String({ minLength: 2, maxLength: 100 }),
  },
  { additionalProperties: false },
);
export type Kelurahan = Static<typeof KelurahanSchema>;

export const UserSchema = Type.Object(
  {
    id_user: Type.String({ pattern: '^USR-[A-Z0-9-]{3,30}$' }),
    id_kelurahan: Type.Union([Type.String(), Type.Null()]),
    // NIK, email, HP, dan alamat boleh null: petugas tidak wajib punya, warga mengisinya di profil.
    nik: Type.Union([Type.String({ pattern: '^[0-9]{16}$' }), Type.Null()]),
    nama_lengkap: Type.String({ minLength: 2, maxLength: 120 }),
    email: Type.Union([Type.String({ pattern: POLA_EMAIL, maxLength: 120 }), Type.Null()]),
    no_hp: Type.Union([Type.String({ pattern: '^08[0-9]{8,12}$' }), Type.Null()]),
    role: RoleSchema,
    /** Wajib diisi untuk KASI (bidang yang ia pegang). null untuk role lain. */
    seksi: Type.Union([SeksiSchema, Type.Null()]),
    alamat: Type.Union([Type.String({ maxLength: 250 }), Type.Null()]),
    aktif: Type.Boolean(),
  },
  { additionalProperties: false },
);
export type User = Static<typeof UserSchema>;

/** Data user yang aman dikirim ke klien (tanpa NIK/HP lengkap). */
export interface UserPublik {
  id_user: string;
  nama_lengkap: string;
  email: string | null;
  role: User['role'];
  seksi: User['seksi'];
  id_kelurahan: string | null;
  nik_tersamar: string | null;
  no_hp_tersamar: string | null;
  /** false bila warga belum mengisi NIK, HP, alamat, atau kelurahan. Petugas selalu true. */
  profil_lengkap: boolean;
}

/** Warga wajib melengkapi profil sebelum mengajukan permohonan. */
export const profilLengkap = (u: User): boolean =>
  u.role !== 'WARGA' || (u.nik !== null && u.no_hp !== null && u.alamat !== null && u.id_kelurahan !== null);
