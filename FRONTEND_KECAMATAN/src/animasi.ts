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


type PerambanDaya = Navigator & { deviceMemory?: number; connection?: { saveData?: boolean; effectiveType?: string } };

/** HP RAM kecil, prosesor sedikit, hemat data, atau sinyal 2G/3G → efek tambahan dimatikan dan gerak dipersingkat. */
function perangkatLemah() {
  const n = navigator as PerambanDaya;
  return (n.deviceMemory ?? 8) <= 2 || (n.hardwareConcurrency ?? 8) <= 4 || n.connection?.saveData === true || /3g/.test(n.connection?.effectiveType ?? '');
}

/** Angka "59.413" atau "59,11" dihitung naik dari 0. Hanya mengubah isi teks yang ada, bukan struktur DOM React. */
function hitungNaik(el: HTMLElement) {
  const simpul = el.firstChild;
  const asli = el.textContent ?? '';
  const cocok = /^(\d{1,3}(?:\.\d{3})*)(?:,(\d+))?$/.exec(asli.trim());
  if (!cocok || !(simpul instanceof Text)) return;
  const desimal = cocok[2]?.length ?? 0;
  const akhir = Number(cocok[1].replace(/\./g, '') + (cocok[2] ? '.' + cocok[2] : ''));
  const format = new Intl.NumberFormat('id-ID', { minimumFractionDigits: desimal, maximumFractionDigits: desimal });
  const lama = 1100;
  const mulai = performance.now();
  const langkah = (sekarang: number) => {
    const p = Math.min(1, (sekarang - mulai) / lama);
    simpul.nodeValue = p < 1 ? format.format(akhir * (1 - Math.pow(1 - p, 3))) : asli;
    if (p < 1) requestAnimationFrame(langkah);
  };
  simpul.nodeValue = format.format(0);
  requestAnimationFrame(langkah);
}

/**
 * Efek tambahan yang murah: garis kemajuan scroll (satu elemen, hanya transform), angka statistik
 * menghitung naik saat terlihat, dan mode hemat untuk perangkat lemah. Tanpa library.
 */
function pasangEfekRingan(akar: HTMLElement) {
  const lemah = perangkatLemah();
  const kurangiGerak = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (lemah) document.documentElement.classList.add('hemat');
  if (lemah || kurangiGerak || !('IntersectionObserver' in window)) return;

  if (!window.location.pathname.startsWith('/admin')) {
    const garis = document.createElement('div');
    garis.className = 'progres-gulir';
    garis.setAttribute('aria-hidden', 'true');
    document.body.appendChild(garis);
    let menunggu = false;
    const perbarui = () => {
      menunggu = false;
      const sisa = document.documentElement.scrollHeight - window.innerHeight;
      garis.style.transform = 'scaleX(' + (sisa > 0 ? Math.min(1, window.scrollY / sisa) : 0) + ')';
    };
    window.addEventListener(
      'scroll',
      () => {
        if (menunggu) return;
        menunggu = true;
        requestAnimationFrame(perbarui);
      },
      { passive: true },
    );
  }

  const angka = new IntersectionObserver(
    (entri) => {
      for (const e of entri) {
        if (!e.isIntersecting) continue;
        angka.unobserve(e.target);
        hitungNaik(e.target as HTMLElement);
      }
    },
    { threshold: 0.6 },
  );
  const cariAngka = (induk: ParentNode) => induk.querySelectorAll('.stat__number').forEach((el) => angka.observe(el));
  new MutationObserver((mutasi) => {
    for (const m of mutasi) for (const node of m.addedNodes) if (node instanceof Element) cariAngka(node);
  }).observe(akar, { childList: true, subtree: true });
  cariAngka(akar);
}

export function pasangAnimasiMuncul(akar: HTMLElement) {
  pasangEfekRingan(akar);
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

  // Jaring pengaman: elemen yang disembunyikan menunggu pengamat. Bila pengamat tidak juga bereaksi
  // (browser lama atau HP yang sangat lambat), elemen yang sedang terlihat tetap ditampilkan,
  // supaya halaman tidak tampak kosong.
  window.setTimeout(() => {
    document.querySelectorAll<HTMLElement>('.muncul:not(.muncul--tampil)').forEach((el) => {
      const kotak = el.getBoundingClientRect();
      if (kotak.top < window.innerHeight && kotak.bottom > 0) {
        io.unobserve(el);
        el.classList.remove('muncul');
      }
    });
  }, 4000);
}
