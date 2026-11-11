import { useEffect, useRef } from 'react';

/** Selang pembaruan otomatis daftar dan status, dalam detik. */
export const SELANG_SEGARKAN = 30;
/** Jeda minimum antar-pembaruan, supaya pindah tab bolak-balik tidak memicu permintaan beruntun. */
const JEDA_MIN_MS = 5_000;

/**
 * Jalankan `muat` setiap `detik` detik selama tab terlihat, dan langsung saat pengguna kembali ke tab/jendela.
 * Hostinger tidak mendukung WebSocket, jadi data baru diambil berkala (polling).
 * `muat` sebaiknya diam saat gagal: galat jaringan sesaat tidak perlu ditampilkan, data lama tetap dipakai.
 */
export function useSegarkanOtomatis(muat: () => void, aktif = true, detik = SELANG_SEGARKAN) {
  const terbaru = useRef(muat);
  terbaru.current = muat;

  useEffect(() => {
    if (!aktif) return;
    let terakhir = Date.now();
    const jalan = () => {
      if (document.visibilityState !== 'visible' || Date.now() - terakhir < JEDA_MIN_MS) return;
      terakhir = Date.now();
      terbaru.current();
    };
    const pewaktu = window.setInterval(jalan, detik * 1000);
    document.addEventListener('visibilitychange', jalan);
    window.addEventListener('focus', jalan);
    return () => {
      window.clearInterval(pewaktu);
      document.removeEventListener('visibilitychange', jalan);
      window.removeEventListener('focus', jalan);
    };
  }, [aktif, detik]);
}
