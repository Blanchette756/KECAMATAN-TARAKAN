import type { AppConfig } from '../config/env.js';
import type { Repositories } from '../repositories/interfaces.js';
import type { VerifikasiGoogle } from '../utils/google.js';

export interface ServiceDeps {
  repos: Repositories;
  config: AppConfig;
  /** Sumber waktu; bisa diganti di tes. */
  now: () => Date;
  /** null bila GOOGLE_CLIENT_ID belum diisi. Bisa diganti di tes. */
  verifikasiGoogle: VerifikasiGoogle | null;
}
