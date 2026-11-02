import { mkdirSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { AppConfig } from '../config/env.js';
import { MIME_DIIZINKAN, type MimeDiizinkan } from '../types/berkas.js';
import type { User } from '../types/user.js';
import { badRequest, forbidden, notFound, validationFailed } from '../utils/errors.js';
import { newId } from '../utils/ids.js';
import { rapikanNamaFile } from './form-validator.js';

interface FileUnggahan {
  file_id: string;
  id_user: string;
  nama_file: string;
  mime_type: MimeDiizinkan;
  ukuran_byte: number;
}

/** Tanda tangan awal file: isi file dicek sendiri, Content-Type dari klien tidak dipercaya. */
const CEK_ISI: Record<MimeDiizinkan, (data: Buffer) => boolean> = {
  'application/pdf': (d) => d.subarray(0, 5).toString('latin1') === '%PDF-',
  'image/jpeg': (d) => d[0] === 0xff && d[1] === 0xd8 && d[2] === 0xff,
  'image/png': (d) => d.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
};

/**
 * Menyimpan file unggahan warga di folder privat (tidak disajikan langsung).
 * Daftar file ada di memori seperti data lain pada Fase 1, jadi hilang saat server restart.
 */
export class UnggahService {
  private readonly file = new Map<string, FileUnggahan>();
  private readonly folder: string;

  constructor(config: AppConfig) {
    this.folder = path.join(config.dataDir, 'uploads');
    mkdirSync(this.folder, { recursive: true });
  }

  async simpan(user: User, namaFile: string, mime: string, data: Buffer) {
    if (user.role !== 'WARGA') throw forbidden('Hanya warga yang dapat mengunggah berkas');
    if (!(MIME_DIIZINKAN as readonly string[]).includes(mime)) throw badRequest('Tipe file harus PDF, JPG, atau PNG');
    const mime_type = mime as MimeDiizinkan;
    if (data.length === 0 || !CEK_ISI[mime_type](data)) throw validationFailed('Isi file tidak sesuai dengan tipenya');

    const file_id = newId('FIL');
    await writeFile(path.join(this.folder, file_id), data, { flag: 'wx' });
    const catatan: FileUnggahan = { file_id, id_user: user.id_user, nama_file: rapikanNamaFile(namaFile), mime_type, ukuran_byte: data.length };
    this.file.set(file_id, catatan);
    return catatan;
  }

  /** Pastikan file milik pengunggah; dipakai saat file ditautkan ke pengajuan. */
  milik(user: User, fileId: string): FileUnggahan {
    const f = this.file.get(fileId);
    if (!f || f.id_user !== user.id_user) throw validationFailed(`File ${fileId} tidak ditemukan. Unggah ulang berkasnya.`);
    return f;
  }

  async baca(fileId: string): Promise<{ data: Buffer; info: FileUnggahan }> {
    const info = this.file.get(fileId);
    if (!info) throw notFound('File tidak ditemukan. Data unggahan hilang saat server dimulai ulang.');
    return { info, data: await readFile(path.join(this.folder, info.file_id)) };
  }
}
