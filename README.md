# AQUAIR

**Aplikasi anti-curang pengantaran galon untuk Depot Air Minum Isi Ulang (DAMIU).**

Dibuat untuk lomba Emergent **Building Indonesia** (submit tutup 20 September 2026, 23:59 WIB).
Seluruh aplikasi dibangun dan di-deploy di Emergent: React + FastAPI + MongoDB, tanpa Docker
dan tanpa server sendiri.

## Masalah yang diselesaikan

Kurir depot membawa 40 galon untuk dijual ke toko (Rp3.000/galon) dan rumah tangga
(Rp4.000/galon). Tidak ada bukti siapa yang benar-benar menerima galon, jadi kurir bisa
mencatat pembeli rumah sebagai toko lalu mengantongi selisih Rp1.000 per galon. Catatan
harian "36 toko, 4 rumah" terus berulang, padahal toko di rute itu masih punya stok yang
belum laku.

AQUAIR membuat klaim **harga toko wajib punya bukti**:
- scan stiker QR milik toko,
- lokasi kurir harus cocok dengan titik toko,
- stok toko harus masuk akal,
- pemilik toko bisa mengonfirmasi sendiri.

Klaim tanpa bukti dihitung dengan harga rumah. Bos melihat semua kejanggalan beserta
perkiraan kerugiannya dalam Rupiah.

## Peta dokumen

| Berkas | Isi |
|---|---|
| [docs/01-riset-masalah-damiu.md](docs/01-riset-masalah-damiu.md) | Masalah DAMIU dari riset internet, dengan sumber |
| [docs/02-kasus-kurir-curang.md](docs/02-kasus-kurir-curang.md) | Bedah kasus kurir: hitungan kerugian, pola, dan lapisan pencegahan |
| [docs/03-spesifikasi-produk.md](docs/03-spesifikasi-produk.md) | Peran, alur, aturan bisnis, contoh hitungan, data, layar, dan mode demo |
| [docs/04-strategi-lomba.md](docs/04-strategi-lomba.md) | Rubrik, jadwal, teks submission, naskah demo, rencana upvote |
| [docs/05-panduan-uji-tahap-1.md](docs/05-panduan-uji-tahap-1.md) | Daftar uji hasil Emergent sebelum deploy, dan templat prompt perbaikan |
| [docs/06-uji-coba-depot-keluarga.md](docs/06-uji-coba-depot-keluarga.md) | Data "sebelum", naskah izin, persiapan, tabel harian, dan cara menyusun hasil |
| [prompts/](prompts/) | Prompt siap tempel ke Emergent, satu berkas per tahap |
| [desain/prototipe/](desain/prototipe/) | Prototipe UI yang bisa diklik untuk semua layar Tahap 1–3, dengan data contoh fiktif. Buka `index.html` di Chrome (butuh internet untuk font dan QR). Ini acuan tampilan; kalau berbeda dengan spesifikasi, spesifikasi yang berlaku. |

## Cara mulai di Emergent

1. Top-up kredit, lalu buka **Home > Profile > BUILDers CONTEST > Join the Contest**.
2. Buat proyek **web** baru. Tempel isi [prompts/tahap-1-inti-anti-curang.md](prompts/tahap-1-inti-anti-curang.md)
   dan lampirkan [docs/03-spesifikasi-produk.md](docs/03-spesifikasi-produk.md).
3. Uji hasilnya dengan [docs/05-panduan-uji-tahap-1.md](docs/05-panduan-uji-tahap-1.md).
4. Setelah lulus: **Deploy**, lalu **Submit Your App**. Jangan menunggu tahap berikutnya —
   perbaikan sesudah submit otomatis ikut tampil.
5. Lanjutkan ke Tahap 2 dan Tahap 3.

Kalau Emergent menawarkan simpan kode ke GitHub, pilih **repo baru** (misalnya
`aquair-app`), bukan repo ini, supaya dokumen di sini tidak tertimpa.

## Status

- [x] Riset masalah dan desain solusi
- [x] Prompt Emergent Tahap 1–3
- [x] Spesifikasi diperiksa ulang: hitungan Rupiah tanpa dobel, demo per pengunjung, celah muatan dan bon ditutup
- [x] Prototipe UI semua layar Tahap 1–3
- [ ] Catatan kurir 7 hari terakhir terkumpul
- [ ] Tahap 1 dibangun, diuji, dan di-deploy
- [ ] Submit ke lomba
- [ ] Uji coba di depot keluarga (angka nyata untuk penilaian dampak bisnis)
- [ ] Tahap 2 dan 3
