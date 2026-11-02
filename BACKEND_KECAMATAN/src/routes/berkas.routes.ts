import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import Type from 'typebox';
import type { AppConfig } from '../config/env.js';
import type { Services } from '../container.js';
import { userDari, type AuthGuards } from '../plugins/auth.js';
import { MIME_DIIZINKAN } from '../types/berkas.js';
import { badRequest } from '../utils/errors.js';

interface Opts {
  services: Services;
  guards: AuthGuards;
  config: AppConfig;
}

const UnggahQuerySchema = Type.Object({ nama_file: Type.String({ minLength: 1, maxLength: 150 }) }, { additionalProperties: false });
const BerkasParamSchema = Type.Object({ id: Type.String({ pattern: '^BRK-[0-9a-f-]+$' }) });

export const berkasRoutes: FastifyPluginAsyncTypebox<Opts> = async (app, { services, guards, config }) => {
  // Parser ini hanya berlaku di dalam plugin ini: rute lain tetap menerima JSON kecil.
  app.addContentTypeParser([...MIME_DIIZINKAN], { parseAs: 'buffer' }, (_req, body, done) => done(null, body));

  app.post(
    '/berkas/unggah',
    {
      bodyLimit: config.maxFileBytes,
      onRequest: guards.wajibRole('WARGA'),
      schema: {
        tags: ['Berkas'],
        summary: 'Unggah satu file (isi file langsung sebagai body, Content-Type PDF/JPG/PNG)',
        security: [{ bearerAuth: [] }],
        querystring: UnggahQuerySchema,
      },
    },
    async (req, reply) => {
      if (!Buffer.isBuffer(req.body)) throw badRequest('Tipe file harus PDF, JPG, atau PNG');
      const f = await services.unggah.simpan(userDari(req), req.query.nama_file, String(req.headers['content-type']), req.body);
      return reply.status(201).send({ data: { file_id: f.file_id, nama_file: f.nama_file, mime_type: f.mime_type, ukuran_byte: f.ukuran_byte } });
    },
  );

  app.get(
    '/berkas/:id/file',
    {
      onRequest: guards.wajibLogin,
      schema: { tags: ['Berkas'], summary: 'Ambil isi berkas (hanya pemilik dan petugas yang berhak)', security: [{ bearerAuth: [] }], params: BerkasParamSchema },
    },
    async (req, reply) => {
      const { data, info } = await services.pengajuan.bacaFileBerkas(userDari(req), req.params.id);
      return reply
        .header('content-type', info.mime_type)
        .header('content-disposition', `inline; filename="${encodeURIComponent(info.nama_file)}"`)
        .send(data);
    },
  );
};
