import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import Type from 'typebox';
import type { PengajuanController } from '../controllers/pengajuan.controller.js';
import { userDari, type AuthGuards } from '../plugins/auth.js';
import { okResponses, PengajuanIdParamSchema } from '../schemas/common.schema.js';
import { TerbitkanBodySchema } from '../schemas/pengajuan.schema.js';
import { BATAS_SURAT_BYTE, MIME_SURAT } from '../types/surat.js';
import { badRequest } from '../utils/errors.js';
import { BODY_LIMIT_KECIL } from '../constants/pola.js';

interface Opts {
  controller: PengajuanController;
  guards: AuthGuards;
}

const bearer = [{ bearerAuth: [] }];
const UnggahSuratQuerySchema = Type.Object({ nama_file: Type.String({ minLength: 1, maxLength: 150 }) }, { additionalProperties: false });

/**
 * Surat bertanda tangan TTE. Camat menandatangani di aplikasi TTE (barcode), petugas mengunggah PDF hasilnya,
 * lalu mengirimkannya ke pemohon. Plugin terpisah supaya parser PDF tidak berlaku di rute pengajuan lain.
 */
export const suratRoutes: FastifyPluginAsyncTypebox<Opts> = async (app, { controller, guards }) => {
  app.addContentTypeParser(MIME_SURAT, { parseAs: 'buffer' }, (_req, body, done) => done(null, body));

  app.post(
    '/pengajuan/:id/surat',
    {
      bodyLimit: BATAS_SURAT_BYTE,
      onRequest: guards.wajibRole('ADMIN'),
      schema: {
        tags: ['Pengajuan – Petugas'],
        summary: 'Admin: unggah/ganti surat yang sudah ditandatangani Camat di aplikasi TTE (isi PDF langsung sebagai body, maks 10 MB)',
        security: bearer,
        params: PengajuanIdParamSchema,
        querystring: UnggahSuratQuerySchema,
        response: okResponses,
      },
    },
    async (req) => {
      if (!Buffer.isBuffer(req.body)) throw badRequest('Surat harus berformat PDF');
      return controller.unggahSurat(userDari(req), req.params.id, req.query.nama_file, String(req.headers['content-type']), req.body);
    },
  );

  app.patch(
    '/pengajuan/:id/terbitkan',
    {
      bodyLimit: BODY_LIMIT_KECIL,
      onRequest: guards.wajibRole('ADMIN'),
      schema: {
        tags: ['Pengajuan – Petugas'],
        summary: 'Admin: kirim surat bertanda tangan ke pemohon (SELESAI, atau SIAP_DIAMBIL untuk layanan ambil di kantor)',
        security: bearer,
        params: PengajuanIdParamSchema,
        body: TerbitkanBodySchema,
        response: okResponses,
      },
    },
    async (req) => controller.terbitkanSurat(userDari(req), req.params.id, req.body),
  );

  app.get(
    '/pengajuan/:id/surat',
    {
      onRequest: guards.wajibLogin,
      schema: {
        tags: ['Pengajuan – Warga', 'Pengajuan – Petugas'],
        summary: 'Unduh surat bertanda tangan (pemohon: setelah dikirim petugas; petugas: sejak diunggah)',
        security: bearer,
        params: PengajuanIdParamSchema,
      },
    },
    async (req, reply) => {
      const { data, info } = await controller.bacaSurat(userDari(req), req.params.id);
      return reply
        .header('content-type', MIME_SURAT)
        .header('content-disposition', `inline; filename="${encodeURIComponent(info.nama_file)}"`)
        // Isi surat bisa diganti selama belum dikirim, dan hanya untuk yang berhak: jangan disimpan cache bersama.
        .header('cache-control', 'private, no-store')
        .send(data);
    },
  );
};
