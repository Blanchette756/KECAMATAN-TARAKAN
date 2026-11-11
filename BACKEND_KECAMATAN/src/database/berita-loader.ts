import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import Value from 'typebox/value';
import { BeritaFileSchema, type Berita } from '../types/berita.js';
import { DataValidationError } from './data-loader.js';

function periksa(nama: string, isi: unknown): { berita: Berita[]; masalah: string[] } {
  if (!Value.Check(BeritaFileSchema, isi)) {
    const masalah = Value.Errors(BeritaFileSchema, isi)
      .slice(0, 20)
      .map((e) => `${nama}: ${e.instancePath || '(akar)'} → ${e.message}`);
    return { berita: [], masalah };
  }
  const masalah: string[] = [];
  const terlihat = new Set<string>();
  for (const b of isi.berita) {
    if (terlihat.has(b.id_berita)) masalah.push(`${nama}: id_berita ganda "${b.id_berita}"`);
    terlihat.add(b.id_berita);
  }
  return { berita: isi.berita, masalah };
}

/** Berita awal dari `data/berita.json` (di-commit bersama data master). Melempar DataValidationError. */
export function muatBeritaAwal(dataDir: string): Berita[] {
  let isi: unknown;
  try {
    isi = JSON.parse(readFileSync(path.join(dataDir, 'berita.json'), 'utf8'));
  } catch (err) {
    throw new DataValidationError([`berita.json: tidak bisa dibaca sebagai JSON (${(err as Error).message})`]);
  }
  const { berita, masalah } = periksa('berita.json', isi);
  if (masalah.length > 0) throw new DataValidationError(masalah);
  return berita;
}

/**
 * Berita yang dipakai server: isi file runtime jika sudah ada dan valid, selain itu berita awal.
 * File runtime yang rusak tidak menghentikan server: berita awal dipakai, dan file itu
 * ditulis ulang pada perubahan berikutnya.
 */
export function muatBerita(dataDir: string, fileRuntime: string | null, peringatan: (pesan: string) => void = console.warn): Berita[] {
  if (fileRuntime && existsSync(fileRuntime)) {
    try {
      const { berita, masalah } = periksa(path.basename(fileRuntime), JSON.parse(readFileSync(fileRuntime, 'utf8')));
      if (masalah.length === 0) return berita;
      peringatan(`File berita ${fileRuntime} tidak valid, memakai berita awal:\n  ${masalah.join('\n  ')}`);
    } catch (err) {
      peringatan(`File berita ${fileRuntime} tidak bisa dibaca (${(err as Error).message}), memakai berita awal.`);
    }
  }
  return muatBeritaAwal(dataDir);
}
