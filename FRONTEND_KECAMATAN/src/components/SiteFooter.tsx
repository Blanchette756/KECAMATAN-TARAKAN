import { Icon } from './Icon';
import { ALAMAT, EMAIL, MEDIA_SOSIAL, TAUTAN_PETA, TELEPON, WHATSAPP } from '../data/kontak';
import { Logo } from './ui';

const TAUTAN = [
  { label: 'Beranda', href: '/#beranda' },
  { label: 'Profil Kecamatan', href: '/profil-kecamatan' },
  { label: 'Informasi Publik', href: '/informasi-publik' },
  { label: 'Pelayanan', href: '/pelayanan' },
  { label: 'Data Monografi', href: '/data-monografi' },
  { label: 'Kontak & Pengaduan', href: '/kontak' },
];

export function SiteFooter() {
  return (
    <footer className="footer" id="kontak">
      <div className="footer__columns">
        <div className="footer__identity">
          <div className="footer__brand">
            <Logo variant="footer" />
            Kecamatan Tarakan Timur
          </div>
          <p>{ALAMAT}, Kalimantan Utara</p>
          <p className="footer__contact">
            <Icon name="phone" />
            {TELEPON} · WA {WHATSAPP}
          </p>
          <p className="footer__contact">
            <Icon name="mail" />
            {EMAIL}
          </p>
          <p className="footer__social">{MEDIA_SOSIAL}</p>
        </div>

        <div className="footer__column">
          <p className="footer__title">Tautan Berguna</p>
          <div className="footer__links">
            {TAUTAN.map(({ label, href }) => (
              <a key={label} href={href}>
                {label}
              </a>
            ))}
          </div>
        </div>

        <div className="footer__column footer__column--hours">
          <p className="footer__title">Jam Pelayanan</p>
          <p className="only-desktop">Pagi: 07.30–12.00 WITA</p>
          <p className="only-desktop">Siang: 13.00–16.30 WITA</p>
          <p className="only-desktop">Sabtu, Minggu &amp; hari libur: tutup</p>
          <p className="only-mobile">07.30–12.00 · 13.00–16.30 WITA</p>
        </div>

        <div className="footer__column footer__column--map">
          <p className="footer__title">Lokasi Kantor</p>
          <a className="footer__map" href={TAUTAN_PETA} target="_blank" rel="noreferrer">
            <Icon name="map-pin" />
            Lihat di peta
          </a>
        </div>
      </div>

      <div className="footer__divider" />

      <div className="footer__bottom">
        <p>© 2026 Kecamatan Tarakan Timur. Hak cipta dilindungi.</p>
        <p className="only-desktop">{'Kebijakan Privasi  •  Aksesibilitas  •  Peta Situs'}</p>
      </div>
    </footer>
  );
}
