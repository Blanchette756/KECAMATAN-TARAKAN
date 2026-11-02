import { useEffect, useRef, useState } from 'react';
import { ambilPersyaratan, ApiError, type DaftarPersyaratan } from '../api';

interface Props {
  idLayanan: string;
  onTutup: () => void;
}

export function PersyaratanDialog({ idLayanan, onTutup }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [data, setData] = useState<DaftarPersyaratan | null>(null);
  const [galat, setGalat] = useState<string | null>(null);

  useEffect(() => {
    const el = dialog.current;
    if (el && !el.open) el.showModal();
  }, []);

  useEffect(() => {
    let batal = false;
    ambilPersyaratan(idLayanan)
      .then((hasil) => !batal && setData(hasil))
      .catch((error) => !batal && setGalat(error instanceof ApiError ? error.message : 'Terjadi kesalahan. Coba lagi beberapa saat lagi.'));
    return () => {
      batal = true;
    };
  }, [idLayanan]);

  return (
    <dialog ref={dialog} className="dialog" onClose={onTutup} aria-labelledby="judul-persyaratan">
      <div className="dialog__head">
        <div>
          <p className="overline">Persyaratan</p>
          <h2 id="judul-persyaratan" className="tile__title">
            {data?.nama_layanan ?? 'Memuat…'}
          </h2>
        </div>
        <button type="button" className="link link--button" onClick={() => dialog.current?.close()}>
          Tutup
        </button>
      </div>

      {galat && (
        <p className="tracker__error" role="alert">
          {galat}
        </p>
      )}

      {data && (
        <ol className="dialog__list">
          {data.persyaratan.map((syarat) => (
            <li key={syarat.id_syarat}>
              <span>{syarat.nama_syarat}</span>
              {syarat.keterangan && <span className="tracker__desc">{syarat.keterangan}</span>}
            </li>
          ))}
        </ol>
      )}
    </dialog>
  );
}
