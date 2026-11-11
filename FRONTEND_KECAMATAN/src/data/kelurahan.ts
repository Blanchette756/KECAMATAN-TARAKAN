// Sumber: "06. Nama Pejabat.xlsx" (lurah, 2026) dan "09. Kontak.xlsx" (kantor kelurahan).
export interface KantorKelurahan {
  nama: string;
  lurah: string;
  alamat: string;
  whatsapp: string | null;
  email: string;
  lat: number;
  lng: number;
}

export const KANTOR_KELURAHAN: KantorKelurahan[] = [
  {
    nama: 'Gunung Lingkas',
    lurah: 'Mahrus, S.H.',
    alamat: 'Jl. Kesuma Bangsa RT 06 No. 01, Kota Tarakan 77126',
    whatsapp: '0811-5900-109',
    email: 'gununglingkas@tarakankota.go.id',
    lat: 3.29419155,
    lng: 117.59903901,
  },
  {
    nama: 'Kampung Empat',
    lurah: 'Muhammad Maulidin, S.H.',
    alamat: 'Jl. Sei Mahakam No. 01 RT 08, Kota Tarakan 77125',
    whatsapp: '0812-4107-1401',
    email: 'kel-kp4@tarakankota.go.id',
    lat: 3.301119,
    lng: 117.622038,
  },
  {
    nama: 'Kampung Enam',
    lurah: 'Mika Barung Tumanan, S.E.',
    alamat: 'Jl. Gunung Tembak RT 06 No. 34, Kota Tarakan 77123',
    whatsapp: null,
    email: 'kel-kp6@tarakankota.go.id',
    lat: 3.308504,
    lng: 117.621387,
  },
  {
    nama: 'Lingkas Ujung',
    lurah: 'Safrudin, S.E.',
    alamat: 'Jl. Yos Sudarso No. 11 RT 01/RW 01, Kota Tarakan',
    whatsapp: '0813-5689-141',
    email: 'lingkasujung@tarakankota.go.id',
    lat: 3.288677,
    lng: 117.591719,
  },
  {
    nama: 'Mamburungan',
    lurah: 'Lasinah, S.STP',
    alamat: 'Jl. Sei Sembakung RT 08 No. 01, Kota Tarakan',
    whatsapp: '0813-4810-0116',
    email: 'mamburungan@tarakankota.go.id',
    lat: 3.287999,
    lng: 117.625973,
  },
  {
    nama: 'Mamburungan Timur',
    lurah: 'H. Safaruddin, S.E.',
    alamat: 'Jl. Kelurahan RT 09/RW 02 No. 01, Kota Tarakan',
    whatsapp: '0813-9214-5880',
    email: 'mambtimur@tarakankota.go.id',
    lat: 3.273254,
    // Di berkas tertulis "117.630.007"; dibaca sebagai 117.630007.
    lng: 117.630007,
  },
  {
    nama: 'Pantai Amal',
    lurah: 'Deden Halidin, S.E.',
    alamat: 'Jl. Amal Baru RT 06 No. 01, Kota Tarakan 77129',
    whatsapp: '0821-5728-1717',
    email: 'pantaiamal@gmail.com',
    lat: 3.305167,
    lng: 117.654651,
  },
];

export const KELURAHAN = KANTOR_KELURAHAN.map((k) => k.nama);
