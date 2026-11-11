/** Tombol "Login dengan Google" (Google Identity Services). Skripnya dimuat hanya di halaman Masuk. */

interface OpsiTombol {
  theme?: 'outline' | 'filled_blue' | 'filled_black';
  size?: 'large' | 'medium' | 'small';
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
  shape?: 'rectangular' | 'pill';
  width?: number;
  locale?: string;
}

interface GoogleId {
  initialize(opsi: { client_id: string; callback: (hasil: { credential: string }) => void; ux_mode?: 'popup'; cancel_on_tap_outside?: boolean }): void;
  renderButton(tempat: HTMLElement, opsi: OpsiTombol): void;
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleId } };
  }
}

let muat: Promise<GoogleId> | null = null;

export function muatGoogle(): Promise<GoogleId> {
  muat ??= new Promise((resolve, reject) => {
    const skrip = document.createElement('script');
    skrip.src = 'https://accounts.google.com/gsi/client';
    skrip.async = true;
    skrip.onload = () => (window.google ? resolve(window.google.accounts.id) : reject(new Error('Google tidak tersedia')));
    skrip.onerror = () => {
      muat = null;
      reject(new Error('Tombol Google gagal dimuat. Periksa koneksi internet lalu muat ulang halaman.'));
    };
    document.head.appendChild(skrip);
  });
  return muat;
}
