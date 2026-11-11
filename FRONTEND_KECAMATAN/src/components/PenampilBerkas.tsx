import { useEffect, useRef, useState } from 'react';
import { ambilFileBerkas, type BerkasDetail } from '../api';
import { Icon } from './Icon';

/**
 * Isi berkas butuh token login, jadi diambil lewat fetch lalu ditampilkan sebagai URL blob.
 * URL lama dilepas setiap kali berkas berganti supaya memori browser tidak menumpuk.
 */
export function useUrlBerkas(berkas: BerkasDetail | undefined) {
  const [hasil, setHasil] = useState<{ url: string | null; galat: string | null }>({ url: null, galat: null });

  useEffect(() => {
    setHasil({ url: null, galat: null });
    if (!berkas?.file_url) return;
    let batal = false;
    let dibuat: string | null = null;
    ambilFileBerkas(berkas.file_url)
      .then((url) => {
        dibuat = url;
        if (batal) URL.revokeObjectURL(url);
        else setHasil({ url, galat: null });
      })
      .catch((error: Error) => !batal && setHasil({ url: null, galat: error.message }));
    return () => {
      batal = true;
      if (dibuat) URL.revokeObjectURL(dibuat);
    };
  }, [berkas?.id_berkas]);

  return hasil;
}

/** Gambar, PDF, atau keterangan jika berkas tidak bisa ditampilkan. */
export function MediaBerkas({ berkas, url, galat, kelas = '' }: { berkas?: BerkasDetail; url: string | null; galat: string | null; kelas?: string }) {
  if (url && berkas?.mime_type.startsWith('image/')) return <img className={kelas} src={url} alt={berkas.nama_syarat} />;
  if (url && berkas?.mime_type === 'application/pdf') return <iframe className={kelas} src={url} title={berkas.nama_syarat} />;
  return (
    <>
      <Icon name="image" />
      {galat ?? (berkas?.file_url ? 'Memuat…' : `${berkas?.nama_file ?? 'Berkas'} (data contoh tanpa file)`)}
    </>
  );
}

interface PenampilProps {
  daftar: BerkasDetail[];
  indeks: number;
  setIndeks: (indeks: number) => void;
  url: string | null;
  galat: string | null;
  onTutup: () => void;
}

/**
 * Penampil berkas layar penuh di halaman yang sama (dialog modal bawaan browser: Esc menutup).
 * Dipakai petugas (tombol Perbesar) dan warga (tombol Lihat). Tidak membuka tab baru, karena
 * tab baru yang dibuka setelah menunggu unduhan diblokir sebagian browser HP (misalnya Safari iPhone).
 */
export function PenampilBerkas({ daftar, indeks, setIndeks, url, galat, onTutup }: PenampilProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const berkas = daftar[indeks];
  const adaSebelumnya = indeks > 0;
  const adaBerikutnya = indeks < daftar.length - 1;

  useEffect(() => {
    const el = dialog.current;
    if (el && !el.open) {
      el.showModal();
      // Fokus awal ke Tutup, bukan Unduh, supaya Enter tidak langsung mengunduh berkas.
      el.querySelector<HTMLButtonElement>('.penampil__tutup')?.focus();
    }
  }, []);

  if (!berkas) return null;

  return (
    <dialog
      ref={dialog}
      className="penampil"
      aria-labelledby="penampil-judul"
      onClose={onTutup}
      onKeyDown={(event) => {
        if (event.key === 'ArrowLeft' && adaSebelumnya) setIndeks(indeks - 1);
        if (event.key === 'ArrowRight' && adaBerikutnya) setIndeks(indeks + 1);
      }}
    >
      <div className="penampil__atas">
        <div className="penampil__judul">
          <p className="overline">
            Berkas {indeks + 1} dari {daftar.length}
          </p>
          <h2 id="penampil-judul" className="baris__judul">
            {berkas.nama_syarat}
          </h2>
          <p className="baris__meta">{berkas.nama_file}</p>
        </div>
        {url && (
          <a className="penampil__tombol" href={url} download={berkas.nama_file}>
            <Icon name="download" />
            Unduh
          </a>
        )}
        <button type="button" className="penampil__tombol penampil__tutup" onClick={() => dialog.current?.close()}>
          ✕ Tutup
        </button>
      </div>
      <div className="penampil__isi">
        <MediaBerkas berkas={berkas} url={url} galat={galat} kelas="penampil__media" />
        {daftar.length > 1 && (
          <>
            <button type="button" className="penampil__panah penampil__panah--kiri" aria-label="Berkas sebelumnya" disabled={!adaSebelumnya} onClick={() => setIndeks(indeks - 1)}>
              <Icon name="chevron-left-16" ukuran={20} />
            </button>
            <button type="button" className="penampil__panah penampil__panah--kanan" aria-label="Berkas berikutnya" disabled={!adaBerikutnya} onClick={() => setIndeks(indeks + 1)}>
              <Icon name="chevron-right-16" ukuran={20} />
            </button>
          </>
        )}
      </div>
    </dialog>
  );
}

/** Penampil untuk satu daftar berkas, lengkap dengan pengambilan isinya. Dipakai di halaman warga. */
export function PenampilDaftarBerkas({ daftar, indeksAwal, onTutup }: { daftar: BerkasDetail[]; indeksAwal: number; onTutup: () => void }) {
  const [indeks, setIndeks] = useState(indeksAwal);
  const { url, galat } = useUrlBerkas(daftar[indeks]);
  return <PenampilBerkas daftar={daftar} indeks={indeks} setIndeks={setIndeks} url={url} galat={galat} onTutup={onTutup} />;
}
