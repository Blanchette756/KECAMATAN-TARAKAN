import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import type { FastifyInstance } from 'fastify';
import type { AppConfig } from '../config/env.js';

/**
 * Keamanan HTTP: header Helmet, CORS hanya untuk origin frontend yang terdaftar, rate limit per IP
 * (lebih ketat di login dan lacak), dan Cache-Control supaya data pribadi tidak disimpan cache.
 * Token dikirim lewat header, bukan cookie, jadi tidak rentan CSRF.
 *
 * Hostinger tidak menyediakan Redis, jadi rate limit memakai memori proses. Ini cukup karena
 * aplikasi berjalan sebagai satu proses.
 */
export async function registerSecurity(app: FastifyInstance, config: AppConfig): Promise<void> {
  const isProd = config.nodeEnv === 'production';
  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        // Swagger UI di /docs butuh style inline dan gambar data:
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:'],
        scriptSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        // Di lokal (http://localhost) jangan paksa https, agar /docs tetap bisa dibuka.
        upgradeInsecureRequests: isProd ? [] : null,
      },
    },
    // HSTS hanya bermakna di domain ber-HTTPS (production).
    hsts: isProd ? { maxAge: 31_536_000, includeSubDomains: true } : false,
    crossOriginResourcePolicy: { policy: 'same-site' },
  });

  await app.register(cors, {
    origin: (origin, cb) => {
      // Permintaan tanpa Origin (curl, server-to-server, aplikasi mobile) tidak dibatasi CORS.
      if (!origin) return cb(null, true);
      cb(null, config.corsOrigins.includes(origin));
    },
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type'],
    credentials: false,
    maxAge: 600,
  });

  await app.register(rateLimit, {
    global: true,
    max: config.rateLimit.global,
    timeWindow: '1 minute',
    // Respons 429 diformat oleh error handler.
  });

  app.addHook('onSend', async (req, reply, payload) => {
    const url = req.url;
    const publik = /^\/api\/v1\/(layanan|kelurahan|kontak)(\/|\?|$)/.test(url);
    if (!reply.hasHeader('cache-control')) {
      reply.header('cache-control', publik && reply.statusCode < 400 ? 'public, max-age=300' : 'no-store');
    }
    return payload;
  });
}
