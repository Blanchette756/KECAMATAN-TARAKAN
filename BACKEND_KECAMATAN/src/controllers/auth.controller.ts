import type { FastifyReply, FastifyRequest } from 'fastify';
import type { Services } from '../container.js';
import { ambilToken, userDari } from '../plugins/auth.js';
import type { LoginPetugasBody, MockLoginBody } from '../schemas/auth.schema.js';
import type { HasilLogin } from '../services/auth.service.js';
import { toUserPublik } from '../services/presenter.js';

const respons = (hasil: HasilLogin) => ({
  data: { token: hasil.token, token_type: 'Bearer' as const, kedaluwarsa: hasil.kedaluwarsa, user: toUserPublik(hasil.user) },
});

export class AuthController {
  constructor(private readonly s: Services) {}

  async mockLogin(body: MockLoginBody) {
    return respons(await this.s.auth.mockLogin(body.email));
  }

  async loginPetugas(body: LoginPetugasBody) {
    return respons(await this.s.auth.loginPetugas(body.username, body.password));
  }

  me(req: FastifyRequest) {
    return { data: toUserPublik(userDari(req)) };
  }

  async logout(req: FastifyRequest, reply: FastifyReply) {
    const token = ambilToken(req);
    if (token) await this.s.auth.logout(token);
    return reply.status(204).send();
  }
}
