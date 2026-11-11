/**
 * Pola regex bersama. Pola untuk input dari luar harus berjalan linear, karena TypeBox tetap
 * menjalankan `pattern` saat menyusun pesan error walaupun `maxLength` sudah gagal.
 *
 * Domain email ditulis sebagai label tanpa titik yang dipisah titik, jadi hanya ada satu cara
 * mencocokkan. Pola lama `[^@\s]+\.[^@\s]+` ambigu dan bisa memakan waktu kuadratik.
 */
export const POLA_EMAIL = '^[^@\\s]+@[^@\\s.]+(?:\\.[^@\\s.]+)+$';

/** Batas body untuk endpoint publik kecil (login, lacak). */
export const BODY_LIMIT_KECIL = 1024;
