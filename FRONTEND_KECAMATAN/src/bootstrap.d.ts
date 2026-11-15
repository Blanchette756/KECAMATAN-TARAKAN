// Bootstrap tidak membawa tipe TypeScript. Hanya komponen Collapse yang dipakai (animasi buka-tutup menu HP).
declare module 'bootstrap/js/dist/collapse' {
  export default class Collapse {
    static getOrCreateInstance(elemen: Element, konfigurasi?: { toggle?: boolean }): Collapse;
    show(): void;
    hide(): void;
  }
}
