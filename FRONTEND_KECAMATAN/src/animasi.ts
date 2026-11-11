/**
 * Animasi "muncul saat di-scroll" untuk halaman publik.
 *
 * Ringan: satu IntersectionObserver dan satu MutationObserver, hanya menambah/menghapus kelas CSS
 * (lihat `.muncul` di styles/animasi.css). Dipasang sebelum React merender, sehingga elemen baru
 * sudah diberi kelas tersembunyi sebelum browser menggambarnya (tidak berkedip).
 * Jika "Animation effects" sistem dimatikan, CSS mengubahnya menjadi efek memudar saja.
 */
const TARGET = '.heading, .tile, .news, .stat, .info-kartu, .grafik__kartu, .alur, .produk, .bantuan, .ppid';
const JEDA_PER_ELEMEN = 120; // ms, supaya kartu yang muncul bersamaan tampil bergantian
const JEDA_MAKS = 5;
const LAMA_ANIMASI = 800 + JEDA_MAKS * JEDA_PER_ELEMEN + 200; // --gerak-muncul + jeda terlama + cadangan

export function pasangAnimasiMuncul(akar: HTMLElement) {
  if (!('IntersectionObserver' in window)) return;

  const io = new IntersectionObserver(
    (entri) => {
      let urutan = 0;
      for (const e of entri) {
        // Elemen yang sudah terlewat di atas layar (mis. halaman dibuka di #layanan) langsung ditampilkan.
        const terlewat = e.boundingClientRect.bottom < 0;
        if (!e.isIntersecting && !terlewat) continue;
        const el = e.target as HTMLElement;
        io.unobserve(el);
        el.style.transitionDelay = `${Math.min(urutan++, JEDA_MAKS) * JEDA_PER_ELEMEN}ms`;
        el.classList.add('muncul--tampil');
        // Setelah selesai, kelas dilepas agar efek hover kartu kembali normal.
        window.setTimeout(() => {
          el.classList.remove('muncul', 'muncul--tampil');
          el.style.transitionDelay = '';
        }, LAMA_ANIMASI);
      }
    },
    { rootMargin: '0px 0px -40px 0px' },
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
