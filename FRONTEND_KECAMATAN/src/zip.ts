/**
 * Pembuat file ZIP minimal tanpa kompresi (metode "stored"), cukup untuk membuat file .xlsx
 * (yang isinya beberapa file XML di dalam ZIP). Ditulis sendiri supaya tidak menambah pustaka.
 */

const TABEL_CRC = (() => {
  const tabel = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    tabel[n] = c >>> 0;
  }
  return tabel;
})();

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) crc = TABEL_CRC[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

/** Tanggal file di dalam ZIP (format DOS): 1 Januari 1980, cukup untuk file hasil unduhan. */
const TANGGAL_DOS = (0 << 9) | (1 << 5) | 1;

export function buatZip(berkas: { nama: string; isi: string }[]): Uint8Array<ArrayBuffer> {
  const enc = new TextEncoder();
  const bagianLokal: Uint8Array[] = [];
  const bagianPusat: Uint8Array[] = [];
  let posisi = 0;

  for (const { nama, isi } of berkas) {
    const namaByte = enc.encode(nama);
    const data = enc.encode(isi);
    const crc = crc32(data);

    const lokal = new DataView(new ArrayBuffer(30));
    lokal.setUint32(0, 0x04034b50, true); // tanda awal file lokal
    lokal.setUint16(4, 20, true); // versi minimum
    lokal.setUint16(6, 0x0800, true); // nama file UTF-8
    lokal.setUint16(8, 0, true); // tanpa kompresi
    lokal.setUint16(10, 0, true); // jam
    lokal.setUint16(12, TANGGAL_DOS, true);
    lokal.setUint32(14, crc, true);
    lokal.setUint32(18, data.length, true);
    lokal.setUint32(22, data.length, true);
    lokal.setUint16(26, namaByte.length, true);
    lokal.setUint16(28, 0, true);
    bagianLokal.push(new Uint8Array(lokal.buffer), namaByte, data);

    const pusat = new DataView(new ArrayBuffer(46));
    pusat.setUint32(0, 0x02014b50, true); // tanda direktori pusat
    pusat.setUint16(4, 20, true);
    pusat.setUint16(6, 20, true);
    pusat.setUint16(8, 0x0800, true);
    pusat.setUint16(10, 0, true);
    pusat.setUint16(12, 0, true);
    pusat.setUint16(14, TANGGAL_DOS, true);
    pusat.setUint32(16, crc, true);
    pusat.setUint32(20, data.length, true);
    pusat.setUint32(24, data.length, true);
    pusat.setUint16(28, namaByte.length, true);
    // 30-41: extra, komentar, disk, atribut: semuanya 0.
    pusat.setUint32(42, posisi, true); // letak header lokal
    bagianPusat.push(new Uint8Array(pusat.buffer), namaByte);

    posisi += 30 + namaByte.length + data.length;
  }

  const ukuranPusat = bagianPusat.reduce((n, b) => n + b.length, 0);
  const akhir = new DataView(new ArrayBuffer(22));
  akhir.setUint32(0, 0x06054b50, true); // tanda akhir direktori pusat
  akhir.setUint16(8, berkas.length, true);
  akhir.setUint16(10, berkas.length, true);
  akhir.setUint32(12, ukuranPusat, true);
  akhir.setUint32(16, posisi, true);

  const semua = [...bagianLokal, ...bagianPusat, new Uint8Array(akhir.buffer)];
  const hasil = new Uint8Array(semua.reduce((n, b) => n + b.length, 0));
  let i = 0;
  for (const b of semua) {
    hasil.set(b, i);
    i += b.length;
  }
  return hasil;
}
