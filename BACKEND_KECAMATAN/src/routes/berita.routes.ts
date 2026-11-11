import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import type { BeritaController } from '../controllers/berita.controller.js';
import { userDari, type AuthGuards } from '../plugins/auth.js';
import { BeritaIdParamSchema, BeritaInputSchema } from '../schemas/berita.schema.js';
import { createdResponses, okResponses } from '../schemas/common.schema.js';

interface Opts {
  controller: BeritaController;
  guards: AuthGuards;
}

const bearer = [{ bearerAuth: [] }];
/** Berita cukup kecil; batas body mencegah kiriman raksasa sebelum divalidasi. */
const BODY_LIMIT_BERITA = 8 * 1024;

export const beritaRoutes: FastifyPluginAsyncTypebox<Opts> = async (app, { controller, guards }) => {
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
};
