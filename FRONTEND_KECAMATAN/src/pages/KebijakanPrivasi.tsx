import { SiteFooter } from '../components/SiteFooter';
import { SiteHeader } from '../components/SiteHeader';
import { PageBanner } from '../components/ui';
import { ALAMAT, EMAIL, WHATSAPP } from '../data/kontak';

const BERLAKU = '11 November 2026';

const BAGIAN: { judul: string; isi: (string | string[])[] }[] = [
  {
    judul: 'Siapa kami',
    isi: [
      `Layanan online ini dikelola Kantor Kecamatan Tarakan Timur, Kota Tarakan, ${ALAMAT}. Pertanyaan tentang data pribadi dapat dikirim ke ${EMAIL} atau WhatsApp ${WHATSAPP}.`,
    ],
  },
  {
    judul: 'Data yang kami kumpulkan',
    isi: [
      [
        'Dari akun Google saat Anda masuk: nama, alamat email, dan ID akun Google. Kami tidak pernah menerima kata sandi Google Anda.',
        'Yang Anda isi di halaman Profil: nama lengkap sesuai KTP, NIK, nomor HP/WhatsApp, alamat, dan kelurahan.',
        'Yang Anda isi saat mengajukan permohonan: isian formulir layanan dan berkas persyaratan yang Anda unggah (foto atau scan dokumen).',
        'Catatan teknis: waktu masuk, riwayat status permohonan, catatan setiap kali petugas membuka data Anda, serta alamat IP di log server untuk keamanan.',
      ],
    ],
  },
  {
    judul: 'Untuk apa data dipakai',
    isi: [
      [
        'Memeriksa dan memproses permohonan layanan administrasi yang Anda ajukan, sampai surat selesai.',
        'Menghubungi Anda bila ada berkas yang perlu diperbaiki atau surat sudah siap diambil.',
        'Fitur lacak status tanpa masuk, yang memakai nomor registrasi dan 4 angka terakhir nomor HP Anda.',
        'Menjaga keamanan layanan, misalnya membatasi percobaan masuk yang berulang.',
      ],
      'Data Anda tidak dipakai untuk promosi dan tidak dijual kepada siapa pun.',
    ],
  },
  {
    judul: 'Siapa yang dapat melihat data Anda',
    isi: [
      'Hanya petugas kecamatan yang memproses permohonan sesuai tugasnya: petugas pelayanan, kepala seksi, dan camat. Setiap kali petugas membuka data pribadi pemohon, kejadian itu dicatat. Di daftar permohonan, NIK dan nomor HP ditampilkan tersamar.',
      'Data tidak dibagikan kepada pihak lain, kecuali diwajibkan oleh peraturan perundang-undangan. Data disimpan di server penyedia hosting yang kami sewa untuk menjalankan situs ini.',
    ],
  },
  {
    judul: 'Penyimpanan dan keamanan',
    isi: [
      'Data disimpan di database server hosting dan dikirim melalui koneksi terenkripsi (HTTPS). Akun petugas dilindungi kata sandi yang disimpan dalam bentuk acak (hash). Data disimpan selama diperlukan untuk pelayanan dan pengarsipan sesuai ketentuan yang berlaku.',
    ],
  },
  {
    judul: 'Hak Anda',
    isi: [
      'Sesuai Undang-Undang Nomor 27 Tahun 2022 tentang Pelindungan Data Pribadi, Anda berhak:',
      [
        'Melihat dan memperbarui data profil Anda sendiri kapan saja di halaman Profil.',
        'Meminta penjelasan tentang pemakaian data Anda.',
        'Meminta perbaikan atau penghapusan data dengan menghubungi kecamatan. Data permohonan yang sudah diproses dapat tetap disimpan untuk keperluan arsip pemerintahan.',
      ],
    ],
  },
  {
    judul: 'Cookie dan layanan pihak ketiga',
    isi: [
      'Situs ini tidak memakai cookie iklan atau pelacak. Sesi masuk disimpan di penyimpanan sesi browser dan hilang saat tab ditutup. Tombol "Lanjutkan dengan Google" memuat skrip dari Google, yang tunduk pada Kebijakan Privasi Google.',
    ],
  },
  {
    judul: 'Perubahan kebijakan',
    isi: [`Kebijakan ini dapat diperbarui. Tanggal berlaku versi terbaru tercantum di bagian atas halaman ini.`],
  },
];

export function KebijakanPrivasi() {
  return (
    <>
      <SiteHeader aktif="" />
      <main>
        <PageBanner halaman="Kebijakan Privasi" overline="Pelindungan data pribadi" judul="Kebijakan Privasi" deskripsi={`Cara layanan online Kecamatan Tarakan Timur mengelola data pribadi Anda. Berlaku sejak ${BERLAKU}.`} />
        <article className="privasi">
          {BAGIAN.map(({ judul, isi }, urutan) => (
            <section key={judul} className="privasi__bagian">
              <h2 className="timeline__judul">
                {urutan + 1}. {judul}
              </h2>
              {isi.map((blok, i) =>
                Array.isArray(blok) ? (
                  <ul key={i} className="privasi__daftar">
                    {blok.map((butir) => (
                      <li key={butir}>{butir}</li>
                    ))}
                  </ul>
                ) : (
                  <p key={i} className="teks-sekunder">
                    {blok}
                  </p>
                ),
              )}
            </section>
          ))}
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
