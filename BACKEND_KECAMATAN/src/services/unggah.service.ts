import { MAKS_FILE_YATIM_PER_WARGA, UMUR_FILE_YATIM_JAM } from '../constants/penomoran.js';
import { MIME_DIIZINKAN, type FileUnggahan, type MimeDiizinkan } from '../types/berkas.js';
import type { User } from '../types/user.js';
import { AppError, badRequest, forbidden, notFound, validationFailed } from '../utils/errors.js';
import { newId } from '../utils/ids.js';
import type { ServiceDeps } from './deps.js';
import { rapikanNamaFile } from './form-validator.js';

/** Tanda tangan awal file: isi file dicek sendiri, Content-Type dari klien tidak dipercaya. */
const CEK_ISI: Record<MimeDiizinkan, (data: Buffer) => boolean> = {
  'application/pdf': (d) => d.subarray(0, 5).toString('latin1') === '%PDF-',
  'image/jpeg': (d) => d[0] === 0xff && d[1] === 0xd8 && d[2] === 0xff,
  'image/png': (d) => d.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
};

/** Menyimpan dan membaca file unggahan warga lewat FileRepository. */
export class UnggahService {
  constructor(private readonly deps: ServiceDeps) {}

  async simpan(user: User, namaFile: string, mime: string, data: Buffer): Promise<FileUnggahan> {
    if (user.role !== 'WARGA') throw forbidden('Hanya warga yang dapat mengunggah berkas');
    if (!(MIME_DIIZINKAN as readonly string[]).includes(mime)) throw badRequest('Tipe file harus PDF, JPG, atau PNG');
    const mime_type = mime as MimeDiizinkan;
    if (data.length === 0 || !CEK_ISI[mime_type](data)) throw validationFailed('Isi file tidak sesuai dengan tipenya');

    // Batasi file yang belum dipakai, supaya unggahan berulang dari satu akun tidak memenuhi database.
    // Gangguan pada penghitungan ini tidak boleh menggagalkan unggahan warga yang sah, jadi dianggap 0.
    const yatim = await this.deps.repos.files.hitungYatim(user.id_user).catch(() => 0);
    if (yatim >= MAKS_FILE_YATIM_PER_WARGA) {
      throw new AppError(429, 'TERLALU_BANYAK_UNGGAHAN', 'Terlalu banyak berkas yang diunggah tetapi belum dipakai. Kirim permohonan Anda, atau coba lagi besok.');
    }

    const f: FileUnggahan = {
      file_id: newId('FIL'),
      id_user: user.id_user,
      nama_file: rapikanNamaFile(namaFile),
      mime_type,
      ukuran_byte: data.length,
      dibuat_pada: this.deps.now().toISOString(),
    };
    await this.deps.repos.files.create(f, data);
    return f;
  }

  /** Pastikan file ada dan milik pengunggah. Dipanggil sebelum file ditautkan ke pengajuan. */
  async milik(user: User, fileId: string): Promise<FileUnggahan> {
    const f = await this.deps.repos.files.findMeta(fileId);
    if (!f || f.id_user !== user.id_user) throw validationFailed(`File ${fileId} tidak ditemukan. Unggah ulang berkasnya.`);
    return f;
  }

  async baca(fileId: string): Promise<{ data: Buffer; info: FileUnggahan }> {
    const hasil = await this.deps.repos.files.baca(fileId);
    if (!hasil) throw notFound('File tidak ditemukan. Unggah ulang berkasnya.');
    return hasil;
  }

  /** Buang file yang diunggah tetapi tidak pernah dipakai pengajuan (lebih tua dari UMUR_FILE_YATIM_JAM). Mengembalikan jumlahnya. */
  async bersihkanYatim(): Promise<number> {
    const batas = new Date(this.deps.now().getTime() - UMUR_FILE_YATIM_JAM * 3_600_000);
    return this.deps.repos.files.hapusYatimSebelum(batas.toISOString());
  }
}
