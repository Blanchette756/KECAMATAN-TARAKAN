import type { FastifyReply, FastifyRequest } from 'fastify';
import type { Services } from '../container.js';
import { ambilToken, userDari } from '../plugins/auth.js';
import type { LoginGoogleBody, LoginPetugasBody, MockLoginBody, ProfilBody } from '../schemas/auth.schema.js';
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

  async loginGoogle(body: LoginGoogleBody) {
    return respons(await this.s.auth.loginGoogle(body.credential));
  }

  googleConfig() {
    return { data: { client_id: this.s.auth.googleClientId } };
  }

  async profil(req: FastifyRequest) {
    return { data: await this.s.profil.lihat(userDari(req)) };
  }

  async simpanProfil(req: FastifyRequest, body: ProfilBody) {
    return { data: { user: toUserPublik(await this.s.profil.simpan(userDari(req), body)) } };
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
