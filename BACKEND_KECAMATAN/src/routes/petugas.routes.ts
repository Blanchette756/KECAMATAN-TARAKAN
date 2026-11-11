import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import Type from 'typebox';
import { BODY_LIMIT_KECIL, POLA_USERNAME_LOGIN } from '../constants/pola.js';
import type { Services } from '../container.js';
import { userDari, type AuthGuards } from '../plugins/auth.js';
import { createdResponses, okResponses } from '../schemas/common.schema.js';
import { SeksiSchema } from '../types/common.js';

interface Opts {
  services: Services;
  guards: AuthGuards;
}

const bearer = [{ bearerAuth: [] }];
const PeranSchema = Type.Union([Type.Literal('ADMIN'), Type.Literal('KASI'), Type.Literal('CAMAT')]);
const SeksiAtauNull = Type.Union([SeksiSchema, Type.Null()]);
// Aturan panjang password dan nama diperiksa di service supaya pesannya jelas.
const Password = Type.String({ minLength: 1, maxLength: 200 });
const Nama = Type.String({ minLength: 1, maxLength: 120 });

const AkunBaruSchema = Type.Object(
  {
    username: Type.String({ minLength: 3, maxLength: 50, pattern: POLA_USERNAME_LOGIN }),
    nama_lengkap: Nama,
    role: PeranSchema,
    seksi: Type.Optional(SeksiAtauNull),
    password: Password,
  },
  { additionalProperties: false },
);

const UbahAkunSchema = Type.Object(
  {
    nama_lengkap: Type.Optional(Nama),
    role: Type.Optional(PeranSchema),
    seksi: Type.Optional(SeksiAtauNull),
    aktif: Type.Optional(Type.Boolean()),
    password: Type.Optional(Password),
  },
  { additionalProperties: false, minProperties: 1 },
);

const GantiPasswordSchema = Type.Object({ password_lama: Password, password_baru: Password }, { additionalProperties: false });
const IdParamSchema = Type.Object({ id: Type.String({ pattern: '^USR-[A-Z0-9-]{3,40}$' }) });

export const petugasRoutes: FastifyPluginAsyncTypebox<Opts> = async (app, { services, guards }) => {
  app.get(
    '/petugas',
    { onRequest: guards.wajibRole('ADMIN'), schema: { tags: ['Akun Petugas'], summary: 'Daftar akun petugas', security: bearer, response: okResponses } },
    async (req) => ({ data: await services.akunPetugas.daftar(userDari(req)) }),
  );

  app.post(
    '/petugas',
    {
      bodyLimit: BODY_LIMIT_KECIL,
      onRequest: guards.wajibRole('ADMIN'),
      schema: { tags: ['Akun Petugas'], summary: 'Petugas Pelayanan: tambah akun petugas', security: bearer, body: AkunBaruSchema, response: createdResponses },
    },
    async (req, reply) => reply.status(201).send({ data: await services.akunPetugas.tambah(userDari(req), { ...req.body, seksi: req.body.seksi ?? null }) }),
  );

  app.patch(
    '/petugas/:id',
    {
      bodyLimit: BODY_LIMIT_KECIL,
      onRequest: guards.wajibRole('ADMIN'),
      schema: {
        tags: ['Akun Petugas'],
        summary: 'Petugas Pelayanan: ubah akun, reset password, atau nonaktifkan',
        security: bearer,
        params: IdParamSchema,
        body: UbahAkunSchema,
        response: okResponses,
      },
    },
    async (req) => ({ data: await services.akunPetugas.ubah(userDari(req), req.params.id, req.body) }),
  );

  app.patch(
    '/auth/password',
    {
      bodyLimit: BODY_LIMIT_KECIL,
      onRequest: guards.wajibRole('ADMIN', 'KASI', 'CAMAT'),
      schema: { tags: ['Auth'], summary: 'Petugas: ganti password sendiri', security: bearer, body: GantiPasswordSchema, response: okResponses },
    },
    async (req) => {
      await services.akunPetugas.gantiPasswordSendiri(userDari(req), req.body.password_lama, req.body.password_baru);
      return { data: { berhasil: true } };
    },
  );
};
