import type { Ringkas } from './api';
import { buatZip } from './zip';

/**
 * Rekap berkas yang diajukan dalam rentang tanggal, seperti rekening koran. Tersedia dua bentuk:
 * - Excel (.xlsx): rapi di Excel mana pun (kolom terpisah, lebar pas, judul tebal, filter, judul tetap saat digulir).
 * - CSV: teks polos berpemisah koma untuk Google Sheets atau aplikasi lain.
 */
const ZONA = 'Asia/Makassar';

/** Tanggal WITA dalam bentuk YYYY-MM-DD (format bawaan input tanggal). */
export const tanggalWita = (iso: string | Date) => new Intl.DateTimeFormat('en-CA', { timeZone: ZONA }).format(new Date(iso));

/** Tanggal 1 bulan ini (WITA), YYYY-MM-DD. */
export const awalBulanWita = () => `${tanggalWita(new Date()).slice(0, 8)}01`;

/** "2026-11-23" -> "23/11/2026" */
const tglIndonesia = (ymd: string) => ymd.split('-').reverse().join('/');

interface WaktuWita {
  tahun: number;
  bulan: number;
  hari: number;
  jam: number;
  menit: number;
}

function waktuWita(iso: string): WaktuWita {
  const b = new Intl.DateTimeFormat('en-CA', { timeZone: ZONA, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    .formatToParts(new Date(iso))
    .reduce<Record<string, string>>((hasil, { type, value }) => ({ ...hasil, [type]: value }), {});
  return { tahun: Number(b.year), bulan: Number(b.month), hari: Number(b.day), jam: Number(b.hour), menit: Number(b.minute) };
}

const dua = (n: number) => String(n).padStart(2, '0');
/** "2026-11-23 01:30": urut bila diurutkan sebagai teks dan dikenali Excel/Sheets sebagai tanggal. */
const teksWaktu = (w: WaktuWita) => `${w.tahun}-${dua(w.bulan)}-${dua(w.hari)} ${dua(w.jam)}:${dua(w.menit)}`;
/** Nomor seri tanggal Excel (hari sejak 30 Des 1899), dari jam dinding WITA. */
const seriExcel = (w: WaktuWita) => Date.UTC(w.tahun, w.bulan - 1, w.hari, w.jam, w.menit) / 86_400_000 + 25_569;

/** Berkas yang diajukan antara `dari` dan `sampai` (YYYY-MM-DD, keduanya termasuk), menurut tanggal WITA. */
export const dalamRentang = (item: Ringkas, dari: string, sampai: string) => {
  const tgl = tanggalWita(item.tgl_pengajuan);
  return tgl >= dari && tgl <= sampai;
};

type Nilai = { teks: string } | { angka: number } | { waktu: WaktuWita } | null;

const KOLOM: { judul: string; lebarMin: number }[] = [
  { judul: 'No', lebarMin: 5 },
  { judul: 'Kode Permohonan', lebarMin: 20 },
  { judul: 'Tanggal Diajukan (WITA)', lebarMin: 18 },
  { judul: 'Pemohon', lebarMin: 18 },
  { judul: 'Layanan', lebarMin: 18 },
  { judul: 'Status', lebarMin: 14 },
  { judul: 'Petugas Pelayanan', lebarMin: 18 },
  { judul: 'Nomor Surat', lebarMin: 14 },
  { judul: 'Tanggal Selesai (WITA)', lebarMin: 18 },
];

/** Baris rekap, urut dari yang paling lama diajukan (seperti mutasi rekening). */
function barisRekap(daftar: Ringkas[], namaLayanan: (item: Ringkas) => string): Nilai[][] {
  const teks = (s: string | null | undefined): Nilai => (s ? { teks: s } : null);
  return [...daftar]
    .sort((a, b) => a.tgl_pengajuan.localeCompare(b.tgl_pengajuan))
    .map((item, i) => [
      { angka: i + 1 },
      teks(item.no_registrasi),
      { waktu: waktuWita(item.tgl_pengajuan) },
      teks(item.pemohon?.nama_lengkap),
      teks(namaLayanan(item)),
      teks(item.label_status),
      teks(item.penangan?.nama_lengkap),
      teks(item.nomor_surat),
      item.tgl_selesai ? { waktu: waktuWita(item.tgl_selesai) } : null,
    ]);
}

const keTeks = (n: Nilai) => (n === null ? '' : 'teks' in n ? n.teks : 'angka' in n ? String(n.angka) : teksWaktu(n.waktu));

// ---------- CSV ----------

/**
 * Satu sel CSV. Teks yang diawali = + - @ diberi petik satu supaya Excel tidak menjalankannya sebagai rumus
 * (nama atau isian dari warga tidak boleh bisa menjalankan rumus di komputer kantor).
 */
function selCsv(nilai: string): string {
  let teks = nilai;
  if (/^[=+\-@\t\r]/.test(teks)) teks = `'${teks}`;
  return /[",\n\r]/.test(teks) ? `"${teks.replace(/"/g, '""')}"` : teks;
}

/** CSV standar berpemisah koma, dengan BOM supaya huruf non-Latin terbaca benar di Excel. */
export function buatCsv(daftar: Ringkas[], namaLayanan: (item: Ringkas) => string): string {
  const baris = [KOLOM.map((k) => k.judul), ...barisRekap(daftar, namaLayanan).map((b) => b.map(keTeks))];
  return '﻿' + baris.map((b) => b.map(selCsv).join(',')).join('\r\n') + '\r\n';
}

// ---------- Excel (.xlsx) ----------

const escXml = (s: string) =>
  s
    // Karakter kendali tidak sah di XML dan membuat Excel menolak file.
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const hurufKolom = (i: number) => String.fromCharCode(65 + i); // cukup sampai kolom Z

/** Gaya sel (indeks cellXfs di styles.xml). */
const GAYA = { biasa: 0, judul: 1, kepala: 2, isi: 3, nomor: 4, waktu: 5 } as const;

const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="1"><numFmt numFmtId="164" formatCode="dd/mm/yyyy hh:mm"/></numFmts>
<fonts count="3"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="14"/><name val="Calibri"/></font></fonts>
<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFFF3B8"/><bgColor indexed="64"/></patternFill></fill></fills>
<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FFBFBFBF"/></left><right style="thin"><color rgb="FFBFBFBF"/></right><top style="thin"><color rgb="FFBFBFBF"/></top><bottom style="thin"><color rgb="FFBFBFBF"/></bottom><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="6">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="top"/></xf>
<xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="top"/></xf>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

function sel(ref: string, nilai: Nilai, gaya: number): string {
  if (nilai === null) return `<c r="${ref}" s="${gaya}"/>`;
  if ('angka' in nilai) return `<c r="${ref}" s="${gaya}"><v>${nilai.angka}</v></c>`;
  if ('waktu' in nilai) return `<c r="${ref}" s="${GAYA.waktu}"><v>${seriExcel(nilai.waktu)}</v></c>`;
  return `<c r="${ref}" t="inlineStr" s="${gaya}"><is><t xml:space="preserve">${escXml(nilai.teks)}</t></is></c>`;
}

export interface InfoRekap {
  dari: string;
  sampai: string;
  /** Mis. "Layanan: Dispensasi Nikah; Petugas: Berkas saya". Kosong bila tanpa filter tambahan. */
  filter: string;
}

/** File .xlsx dengan judul dan periode di atas tabel, seperti rekening koran. */
export function buatXlsx(daftar: Ringkas[], namaLayanan: (item: Ringkas) => string, info: InfoRekap): Uint8Array<ArrayBuffer> {
  const data = barisRekap(daftar, namaLayanan);
  const sekarang = waktuWita(new Date().toISOString());
  const atas = [
    'Rekap Berkas Permohonan – Kecamatan Tarakan Timur',
    `Periode: ${tglIndonesia(info.dari)} s.d. ${tglIndonesia(info.sampai)} (menurut tanggal permohonan diajukan, WITA)`,
    `Jumlah: ${data.length} berkas · Diunduh ${dua(sekarang.hari)}/${dua(sekarang.bulan)}/${sekarang.tahun} ${dua(sekarang.jam)}.${dua(sekarang.menit)} WITA${info.filter ? ` · Filter: ${info.filter}` : ''}`,
  ];
  const BARIS_KEPALA = atas.length + 2; // satu baris kosong sebelum tabel
  const kolomAkhir = hurufKolom(KOLOM.length - 1);
  const barisAkhir = BARIS_KEPALA + data.length;

  // Lebar kolom mengikuti isi terpanjang (dibatasi supaya teks panjang dibungkus, bukan melebar terus).
  const lebar = KOLOM.map((k, i) =>
    // +3: huruf Calibri lebih lebar dari satuan lebar kolom Excel, jadi beri sedikit ruang supaya tidak terlipat.
    Math.min(45, Math.max(k.lebarMin, k.judul.length + 3, ...data.map((b) => (b[i] && 'waktu' in b[i]! ? 16 : keTeks(b[i]).length) + 3))),
  );

  const xmlBaris: string[] = [];
  atas.forEach((teks, i) => xmlBaris.push(`<row r="${i + 1}">${sel(`A${i + 1}`, { teks }, i === 0 ? GAYA.judul : GAYA.biasa)}</row>`));
  xmlBaris.push(`<row r="${BARIS_KEPALA}" ht="30" customHeight="1">${KOLOM.map((k, i) => sel(`${hurufKolom(i)}${BARIS_KEPALA}`, { teks: k.judul }, GAYA.kepala)).join('')}</row>`);
  data.forEach((b, r) => {
    const nomor = BARIS_KEPALA + 1 + r;
    xmlBaris.push(`<row r="${nomor}">${b.map((n, i) => sel(`${hurufKolom(i)}${nomor}`, n, i === 0 ? GAYA.nomor : GAYA.isi)).join('')}</row>`);
  });

  const filterRef = `A${BARIS_KEPALA}:${kolomAkhir}${Math.max(barisAkhir, BARIS_KEPALA)}`;
  const sheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>
<sheetViews><sheetView workbookViewId="0"><pane ySplit="${BARIS_KEPALA}" topLeftCell="A${BARIS_KEPALA + 1}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
<sheetFormatPr defaultRowHeight="15"/>
<cols>${lebar.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols>
<sheetData>${xmlBaris.join('')}</sheetData>
<autoFilter ref="${filterRef}"/>
<pageMargins left="0.4" right="0.4" top="0.5" bottom="0.5" header="0.3" footer="0.3"/>
<pageSetup paperSize="9" orientation="landscape" fitToWidth="1" fitToHeight="0"/>
</worksheet>`;

  const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets><sheet name="Rekap" sheetId="1" r:id="rId1"/></sheets>
<definedNames><definedName name="_xlnm._FilterDatabase" localSheetId="0" hidden="1">Rekap!$A$${BARIS_KEPALA}:$${kolomAkhir}$${Math.max(barisAkhir, BARIS_KEPALA)}</definedName><definedName name="_xlnm.Print_Titles" localSheetId="0">Rekap!$${BARIS_KEPALA}:$${BARIS_KEPALA}</definedName></definedNames>
</workbook>`;

  return buatZip([
    {
      nama: '[Content_Types].xml',
      isi: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`,
    },
    {
      nama: '_rels/.rels',
      isi: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    },
    { nama: 'xl/workbook.xml', isi: workbook },
    {
      nama: 'xl/_rels/workbook.xml.rels',
      isi: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    },
    { nama: 'xl/worksheets/sheet1.xml', isi: sheet },
    { nama: 'xl/styles.xml', isi: STYLES },
  ]);
}

/** Unduh file tanpa server (berkas sudah ada di halaman). */
export function unduhFile(namaFile: string, isi: string | Uint8Array<ArrayBuffer>, tipe: string) {
  const url = URL.createObjectURL(new Blob([isi], { type: tipe }));
  const tautan = document.createElement('a');
  tautan.href = url;
  tautan.download = namaFile;
  document.body.appendChild(tautan);
  tautan.click();
  tautan.remove();
  // Beri waktu browser mulai mengunduh sebelum alamat sementaranya dibuang.
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export const TIPE_CSV = 'text/csv;charset=utf-8';
export const TIPE_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
