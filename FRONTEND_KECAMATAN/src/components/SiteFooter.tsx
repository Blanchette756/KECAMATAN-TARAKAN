import { Icon } from './Icon';
import { TAUTAN_PETA } from '../data/kontak';
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
          <p>Jl. Sei Mahakam RT.10 No. 01, Kelurahan Kampung Empat, Kecamatan Tarakan Timur, Kota Tarakan, Kalimantan Utara</p>
          <p className="footer__contact">
            <Icon name="phone" />
            (0551) 22490 · WA 0852-1168-6871
          </p>
          <p className="footer__contact">
            <Icon name="mail" />
            kecamatan.tarakantimur@gmail.com
          </p>
          <p className="footer__social">{'Instagram  •  Facebook  •  YouTube'}</p>
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
          <p className="only-desktop">Senin–Kamis: 08.00–16.00 WITA</p>
          <p className="only-desktop">Jumat: 08.00–11.00 WITA</p>
          <p className="only-desktop">Sabtu, Minggu &amp; hari libur: tutup</p>
          <p className="only-mobile">Senin–Kamis 08.00–16.00 · Jumat 08.00–11.00 WITA</p>
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
