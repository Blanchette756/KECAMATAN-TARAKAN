/**
 * Animasi "muncul saat di-scroll" untuk halaman publik.
 *
 * Ringan: satu IntersectionObserver dan satu MutationObserver, hanya menambah/menghapus kelas CSS
 * (lihat `.muncul` di styles/animasi.css). Dipasang sebelum React merender, sehingga elemen baru
 * sudah diberi kelas tersembunyi sebelum browser menggambarnya (tidak berkedip).
 * Jika "Animation effects" sistem dimatikan, CSS mengubahnya menjadi efek memudar saja.
 */
const TARGET = '.heading, .tile, .news, .stat, .info-kartu, .grafik__kartu, .alur, .produk, .bantuan, .ppid';
const JEDA_PER_ELEMEN = 50; // ms, jeda antar kartu lebih sigap dan dinamis
const JEDA_MAKS = 4;
const BATAS_WAKTU_PENGAMAN = 1000; // ms, batas waktu pengaman untuk membersihkan kelas jika transitionend terlewat

export function pasangAnimasiMuncul(akar: HTMLElement) {
  if (!('IntersectionObserver' in window)) return;

  const kurangiGerak = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const io = new IntersectionObserver(
    (entri) => {
      let urutan = 0;
      for (const e of entri) {
        // Elemen yang sudah terlewat di atas layar (mis. halaman dibuka di #layanan) langsung ditampilkan.
        const terlewat = e.boundingClientRect.bottom < 0;
        if (!e.isIntersecting && !terlewat) continue;
        const el = e.target as HTMLElement;
        io.unobserve(el);

        // Jika terlewat atau pengguna memilih kurangi gerak, tidak perlu antrean jeda.
        if (!kurangiGerak && !terlewat) {
          el.style.transitionDelay = `${Math.min(urutan++, JEDA_MAKS) * JEDA_PER_ELEMEN}ms`;
        }

        el.classList.add('muncul--tampil');

        // Setelah transisi selesai, kelas dilepas seketika agar efek hover kartu kembali normal.
        let selesai = false;
        const bersihkan = () => {
          if (selesai) return;
          selesai = true;
          el.classList.remove('muncul', 'muncul--tampil');
          el.style.transitionDelay = '';
        };

        el.addEventListener('transitionend', bersihkan, { once: true });
        // Cadangan pengaman jika event transitionend terlewat (misal tab diminimalkan atau transisi dibatalkan)
        window.setTimeout(bersihkan, BATAS_WAKTU_PENGAMAN);
      }
    },
    // Jendela pengamatan: -10px bawah agar responsif di layar HP dan tidak memotong elemen di dekat footer
    { rootMargin: '0px 0px -10px 0px' },
  );

  const daftarkan = (el: Element) => {
    // Halaman admin adalah alat kerja: tidak memakai efek muncul. Elemen di dalam kartu yang sudah
    // beranimasi juga dilewati supaya tidak bergerak dua kali.
    if (el.closest('.admin') || el.parentElement?.closest('.muncul')) return;
    el.classList.add('muncul');
    io.observe(el);
  };

  new MutationObserver((mutasi) => {
    for (const m of mutasi)
      for (const node of m.addedNodes) {
        if (!(node instanceof Element)) continue;
        if (node.matches(TARGET)) daftarkan(node);
        node.querySelectorAll(TARGET).forEach(daftarkan);
      }
  }).observe(akar, { childList: true, subtree: true });
}
