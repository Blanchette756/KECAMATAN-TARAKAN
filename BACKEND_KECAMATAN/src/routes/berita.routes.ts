import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import Type from 'typebox';
import type { BeritaController } from '../controllers/berita.controller.js';
import { userDari, type AuthGuards } from '../plugins/auth.js';
import { BeritaIdParamSchema, BeritaInputSchema } from '../schemas/berita.schema.js';
import { createdResponses, okResponses } from '../schemas/common.schema.js';
import { BATAS_FOTO_BERITA_BYTE, MIME_FOTO_BERITA } from '../types/berita.js';
import { badRequest } from '../utils/errors.js';

interface Opts {
  controller: BeritaController;
  guards: AuthGuards;
}

const bearer = [{ bearerAuth: [] }];
/** Batas body untuk berita, supaya kiriman besar ditolak sebelum divalidasi. */
const BODY_LIMIT_BERITA = 8 * 1024;
/** `v` hanya penanda versi agar cache browser berganti saat foto diganti; nilainya tidak dipakai server. */
const FotoQuerySchema = Type.Object({ v: Type.Optional(Type.String({ maxLength: 40 })) }, { additionalProperties: false });

export const beritaRoutes: FastifyPluginAsyncTypebox<Opts> = async (app, { controller, guards }) => {
  // Parser foto hanya berlaku di dalam plugin ini: rute lain tetap menerima JSON kecil.
  app.addContentTypeParser([...MIME_FOTO_BERITA], { parseAs: 'buffer' }, (_req, body, done) => done(null, body));

  app.get('/berita', { schema: { tags: ['Berita'], summary: 'Daftar berita kecamatan (publik, terbaru di atas)' } }, async () => controller.daftar());

  app.post(
    '/berita',
    {
      bodyLimit: BODY_LIMIT_BERITA,
      onRequest: guards.wajibRole('ADMIN'),
      schema: { tags: ['Berita'], summary: 'Petugas pelayanan: tambah berita', security: bearer, body: BeritaInputSchema, response: createdResponses },
    },
    async (req, reply) => reply.status(201).send(await controller.tambah(userDari(req), req.body)),
  );

  app.patch(
    '/berita/:id',
    {
      bodyLimit: BODY_LIMIT_BERITA,
      onRequest: guards.wajibRole('ADMIN'),
      schema: { tags: ['Berita'], summary: 'Petugas pelayanan: ubah berita', security: bearer, params: BeritaIdParamSchema, body: BeritaInputSchema, response: okResponses },
    },
    async (req) => controller.ubah(userDari(req), req.params.id, req.body),
  );

  app.delete(
    '/berita/:id',
    {
      bodyLimit: BODY_LIMIT_BERITA,
      onRequest: guards.wajibRole('ADMIN'),
      schema: { tags: ['Berita'], summary: 'Petugas pelayanan: hapus berita', security: bearer, params: BeritaIdParamSchema, response: okResponses },
    },
    async (req) => controller.hapus(userDari(req), req.params.id),
  );

  app.post(
    '/berita/:id/foto',
    {
      bodyLimit: BATAS_FOTO_BERITA_BYTE,
      onRequest: guards.wajibRole('ADMIN'),
      schema: {
        tags: ['Berita'],
        summary: 'Petugas pelayanan: pasang/ganti foto berita (isi file langsung sebagai body, Content-Type JPG/PNG, maks 10 MB)',
        security: bearer,
        params: BeritaIdParamSchema,
        response: okResponses,
      },
    },
    async (req) => {
      if (!Buffer.isBuffer(req.body)) throw badRequest('Foto harus berformat JPG atau PNG');
      return controller.simpanFoto(userDari(req), req.params.id, String(req.headers['content-type']), req.body);
    },
  );

  app.delete(
    '/berita/:id/foto',
    {
      bodyLimit: BODY_LIMIT_BERITA,
      onRequest: guards.wajibRole('ADMIN'),
      schema: { tags: ['Berita'], summary: 'Petugas pelayanan: hapus foto berita', security: bearer, params: BeritaIdParamSchema, response: okResponses },
    },
    async (req) => controller.hapusFoto(userDari(req), req.params.id),
  );

  app.get(
    '/berita/:id/foto',
    { schema: { tags: ['Berita'], summary: 'Foto berita (publik)', params: BeritaIdParamSchema, querystring: FotoQuerySchema } },
    async (req, reply) => {
      const { data, info } = await controller.bacaFoto(req.params.id);
      return (
        reply
          .header('content-type', info.mime_type)
          // Alamat gambar memuat ?v=<waktu ganti foto>, jadi isinya tidak pernah berubah untuk alamat yang sama.
          .header('cache-control', req.query.v ? 'public, max-age=31536000, immutable' : 'public, max-age=300')
          .send(data)
      );
    },
  );
};
