import { useEffect, useState } from 'react';
import { Icon } from './Icon';
import { JAM_PELAYANAN, JAM_PELAYANAN_SINGKAT } from '../data/kontak';
import { ambilSesi, inisial } from '../sesi';
import { Button, Logo } from './ui';

const MENU: { label: string; href: string; sub?: { label: string; href: string }[] }[] = [
  { label: 'Beranda', href: '/#beranda' },
  {
    label: 'Profil Kecamatan',
    href: '/profil-kecamatan',
    sub: [
      { label: 'Gambaran Umum', href: '/profil-kecamatan#gambaran-umum' },
      { label: 'Sejarah', href: '/profil-kecamatan#sejarah' },
      { label: 'Visi & Misi', href: '/profil-kecamatan#visi-misi' },
      { label: 'Wilayah', href: '/profil-kecamatan#wilayah' },
      { label: 'Struktur Organisasi', href: '/profil-kecamatan#struktur-organisasi' },
    ],
  },
  {
    label: 'Informasi Publik',
    href: '/informasi-publik',
    sub: [
      { label: 'Berita', href: '/informasi-publik?tab=Berita' },
      { label: 'Pengumuman', href: '/informasi-publik?tab=Pengumuman' },
      { label: 'Dokumen Publik', href: '/informasi-publik?tab=Dokumen Publik' },
    ],
  },
  { label: 'Pelayanan', href: '/pelayanan' },
  { label: 'Data Monografi', href: '/data-monografi' },
  { label: 'Kontak', href: '/kontak' },
];

export function SiteHeader({ aktif }: { aktif: string }) {
  const [menuTerbuka, setMenuTerbuka] = useState(false);
  const [cabangTerbuka, setCabangTerbuka] = useState<string | null>(null);

  // Menu bersubmenu hanyalah tombol: tertutup lagi bila klik di luar atau menekan Esc.
  useEffect(() => {
    if (!cabangTerbuka) return;
    const klikDiLuar = (e: MouseEvent) => {
      if (!(e.target as Element).closest('.nav__cabang')) setCabangTerbuka(null);
    };
    const tekanEsc = (e: KeyboardEvent) => e.key === 'Escape' && setCabangTerbuka(null);
    document.addEventListener('click', klikDiLuar);
    document.addEventListener('keydown', tekanEsc);
    return () => {
      document.removeEventListener('click', klikDiLuar);
      document.removeEventListener('keydown', tekanEsc);
    };
  }, [cabangTerbuka]);
  const sesi = ambilSesi();
  const akun =
    sesi?.user.role === 'WARGA' ? (
      <a className="akun" href="/permohonan">
        <span className="akun__inisial">{inisial(sesi.user.nama_lengkap)}</span>
        <span className="akun__teks">
          <span className="akun__nama">{sesi.user.nama_lengkap.replace(/\s*\(.*\)/, '')}</span>
          <span className="baris__meta">Pemohon</span>
        </span>
        <Icon name="chevron-nav" />
      </a>
    ) : (
      <Button label={sesi ? 'Panel Petugas' : 'Masuk'} style="accent" href={sesi ? '/admin' : '/masuk'} />
    );

  return (
    <header className="header" id="beranda">
      <div className="utility">
        <span className="utility__item only-desktop">
          <Icon name="shield" />
          Situs resmi Pemerintah Kota Tarakan
        </span>
        <span className="utility__item only-desktop">
          <Icon name="clock" />
          Jam Pelayanan: {JAM_PELAYANAN}
        </span>
        <span className="utility__item only-mobile">
          <Icon name="shield-sm" />
          Situs resmi Pemkot Tarakan
        </span>
        <span className="utility__item only-mobile">
          <Icon name="clock-sm" />
          {JAM_PELAYANAN_SINGKAT}
        </span>
      </div>

      <div className="mainbar">
        <a className="brand" href="/#beranda">
          <Logo variant="header" />
          <span className="brand__text">
            <span className="brand__org">Pemerintah Kota Tarakan</span>
            <span className="brand__name">Kecamatan Tarakan Timur</span>
          </span>
        </a>

        <nav className="nav" aria-label="Navigasi utama">
          <ul className="nav__list">
            {MENU.map((item) => (
              <li key={item.label} className={item.sub ? `nav__cabang${cabangTerbuka === item.label ? ' nav__cabang--buka' : ''}` : undefined}>
                {item.sub ? (
                  <button
                    type="button"
                    className={`nav__item nav__item--tombol${item.label === aktif ? ' nav__item--active' : ''}`}
                    aria-expanded={cabangTerbuka === item.label}
                    onClick={() => setCabangTerbuka(cabangTerbuka === item.label ? null : item.label)}
                  >
                    {item.label}
                    <Icon name="chevron-nav" />
                  </button>
                ) : (
                  <a className={`nav__item${item.label === aktif ? ' nav__item--active' : ''}`} href={item.href} aria-current={item.label === aktif ? 'page' : undefined}>
                    {item.label}
                  </a>
                )}
                {item.sub && (
                  <ul className="nav__sub" aria-label={`Bagian ${item.label}`}>
                    {item.sub.map((bagian) => (
                      <li key={bagian.label}>
                        <a href={bagian.href}>{bagian.label}</a>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
          {akun}
        </nav>

        <button
          type="button"
          className="menu-button"
          aria-label={menuTerbuka ? 'Tutup menu' : 'Buka menu'}
          aria-expanded={menuTerbuka}
          onClick={() => setMenuTerbuka((terbuka) => !terbuka)}
        >
          <Icon name="menu" />
        </button>
      </div>

      <nav className={`drawer${menuTerbuka ? ' drawer--open' : ''}`} aria-label="Navigasi utama">
        {MENU.map((item) =>
          item.sub ? (
            <div key={item.label}>
              <p className={`drawer__link drawer__judul${item.label === aktif ? ' drawer__link--active' : ''}`}>{item.label}</p>
              {item.sub.map((bagian) => (
                <a key={bagian.label} className="drawer__link drawer__sub" href={bagian.href} onClick={() => setMenuTerbuka(false)}>
                  {bagian.label}
                </a>
              ))}
            </div>
          ) : (
            <a
              key={item.label}
              className={`drawer__link${item.label === aktif ? ' drawer__link--active' : ''}`}
              href={item.href}
              onClick={() => setMenuTerbuka(false)}
            >
              {item.label}
            </a>
          ),
        )}
        {akun}
      </nav>
    </header>
  );
}
