import { useState } from 'react';
import { Icon } from './Icon';
import { ambilSesi, inisial } from '../sesi';
import { Button, Logo } from './ui';

const MENU = [
  { label: 'Beranda', dropdown: false, href: '/#beranda' },
  { label: 'Profil Kecamatan', dropdown: true, href: '/profil-kecamatan' },
  { label: 'Informasi Publik', dropdown: true, href: '/informasi-publik' },
  { label: 'Pelayanan', dropdown: false, href: '/pelayanan' },
  { label: 'Data Monografi', dropdown: false, href: '/data-monografi' },
  { label: 'Kontak', dropdown: false, href: '/kontak' },
];

export function SiteHeader({ aktif }: { aktif: string }) {
  const [menuTerbuka, setMenuTerbuka] = useState(false);
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
      <Button label="Masuk" style="accent" href={sesi ? '/admin' : '/masuk'} />
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
          Jam Pelayanan: Senin–Kamis 08.00–16.00 · Jumat 08.00–11.00 WITA
        </span>
        <span className="utility__item only-mobile">
          <Icon name="shield-sm" />
          Situs resmi Pemkot Tarakan
        </span>
        <span className="utility__item only-mobile">
          <Icon name="clock-sm" />
          Sen–Jum · 08.00 WITA
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
              <li key={item.label}>
                <a className={`nav__item${item.label === aktif ? ' nav__item--active' : ''}`} href={item.href} aria-current={item.label === aktif ? 'page' : undefined}>
                  {item.label}
                  {item.dropdown && <Icon name="chevron-nav" />}
                </a>
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
        {MENU.map((item) => (
          <a
            key={item.label}
            className={`drawer__link${item.label === aktif ? ' drawer__link--active' : ''}`}
            href={item.href}
            onClick={() => setMenuTerbuka(false)}
          >
            {item.label}
          </a>
        ))}
        {akun}
      </nav>
    </header>
  );
}
