import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import type { AppConfig } from '../config/env.js';
import type { AuthController } from '../controllers/auth.controller.js';
import type { AuthGuards } from '../plugins/auth.js';
import { LoginGoogleBodySchema, LoginPetugasBodySchema, LoginResponseSchema, MeResponseSchema, MockLoginBodySchema, ProfilBodySchema } from '../schemas/auth.schema.js';
import { errorResponses, okResponses } from '../schemas/common.schema.js';
import { BODY_LIMIT_KECIL } from '../constants/pola.js';

interface Opts {
  controller: AuthController;
  guards: AuthGuards;
  config: AppConfig;
}

const bearer = [{ bearerAuth: [] }];

export const authRoutes: FastifyPluginAsyncTypebox<Opts> = async (app, { controller, guards, config }) => {
  // Login tiruan cukup dengan email, jadi tidak pernah dipasang di production:
  // akun warga asli punya email Gmail yang bisa diketahui orang lain.
  if (config.nodeEnv !== 'production') {
    app.post(
      '/auth/mock-login',
      {
        bodyLimit: BODY_LIMIT_KECIL,
        config: { rateLimit: { max: config.rateLimit.login, timeWindow: '1 minute' } },
        schema: {
          tags: ['Auth'],
          summary: 'Login tiruan dengan email akun dummy, tanpa password',
          body: MockLoginBodySchema,
          response: { 200: LoginResponseSchema, 401: errorResponses[401], 429: errorResponses[429] },
        },
      },
      async (req) => controller.mockLogin(req.body),
    );
  }

  app.get('/auth/google-config', { schema: { tags: ['Auth'], summary: 'Client ID Google untuk tombol login warga' } }, async () => controller.googleConfig());

  app.post(
    '/auth/google',
    {
      bodyLimit: 8 * 1024,
      config: { rateLimit: { max: config.rateLimit.login, timeWindow: '1 minute' } },
      schema: {
        tags: ['Auth'],
        summary: 'Login warga dengan ID token dari tombol Login dengan Google',
        body: LoginGoogleBodySchema,
        response: { 200: LoginResponseSchema, 401: errorResponses[401], 403: errorResponses[403], 429: errorResponses[429] },
      },
    },
    async (req) => controller.loginGoogle(req.body),
  );

  app.get(
    '/auth/profil',
    { onRequest: guards.wajibRole('WARGA'), schema: { tags: ['Auth'], summary: 'Warga: profil lengkap milik sendiri', security: bearer, response: okResponses } },
    async (req) => controller.profil(req),
  );

  app.patch(
    '/auth/profil',
    {
      bodyLimit: BODY_LIMIT_KECIL,
      onRequest: guards.wajibRole('WARGA'),
      schema: { tags: ['Auth'], summary: 'Warga: lengkapi atau ubah profil', security: bearer, body: ProfilBodySchema, response: okResponses },
    },
    async (req) => controller.simpanProfil(req, req.body),
  );

  app.post(
    '/auth/login-petugas',
    {
      bodyLimit: BODY_LIMIT_KECIL,
      config: { rateLimit: { max: config.rateLimit.login, timeWindow: '1 minute' } },
      schema: {
        tags: ['Auth'],
        summary: 'Login petugas (Admin, Kasi, Camat) dengan username dan password',
        body: LoginPetugasBodySchema,
        response: { 200: LoginResponseSchema, 401: errorResponses[401], 429: errorResponses[429] },
      },
    },
    async (req) => controller.loginPetugas(req.body),
  );

  app.get(
    '/auth/me',
    {
      onRequest: guards.wajibLogin,
      schema: { tags: ['Auth'], summary: 'Profil user yang sedang login', security: [{ bearerAuth: [] }], response: { 200: MeResponseSchema, 401: errorResponses[401] } },
    },
    async (req) => controller.me(req),
  );

  app.post(
    '/auth/logout',
    { onRequest: guards.wajibLogin, schema: { tags: ['Auth'], summary: 'Akhiri sesi', security: [{ bearerAuth: [] }] } },
    async (req, reply) => controller.logout(req, reply),
  );
};
