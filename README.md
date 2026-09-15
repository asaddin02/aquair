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

## Isi repo

| Bagian | Isi |
|---|---|
| [backend/](backend/) | FastAPI + MongoDB: mesin aturan Radar dan harga, API bos/kurir/publik, pembuat depot demo, 26 tes otomatis |
| [frontend/](frontend/) | React + PWA: landing, aplikasi bos, aplikasi kurir (mobile), halaman konfirmasi pemilik toko |
| [scripts/jalankan-lokal.sh](scripts/jalankan-lokal.sh) | Menjalankan seluruh aplikasi di laptop di satu alamat |
| [docs/01-riset-masalah-damiu.md](docs/01-riset-masalah-damiu.md) | Masalah DAMIU dari riset internet, dengan sumber |
| [docs/02-kasus-kurir-curang.md](docs/02-kasus-kurir-curang.md) | Bedah kasus kurir: hitungan kerugian, pola, dan lapisan pencegahan |
| [docs/03-spesifikasi-produk.md](docs/03-spesifikasi-produk.md) | Sumber kebenaran aturan bisnis: peran, alur, Radar, contoh hitungan, data, mode demo |
| [docs/04-strategi-lomba.md](docs/04-strategi-lomba.md) | Rubrik, jadwal, teks submission, naskah demo, rencana upvote |
| [docs/05-panduan-uji-tahap-1.md](docs/05-panduan-uji-tahap-1.md) | Daftar uji sebelum deploy dan submit |
| [docs/06-uji-coba-depot-keluarga.md](docs/06-uji-coba-depot-keluarga.md) | Data "sebelum", naskah izin, persiapan, tabel harian, dan cara menyusun hasil |
| [docs/07-mencoba-di-laptop.md](docs/07-mencoba-di-laptop.md) | Cara menyalakan aplikasi di laptop dan daftar yang perlu dicoba |
| [prompts/impor-dan-deploy.md](prompts/impor-dan-deploy.md) | Prompt untuk Emergent: tarik repo, tambah Ringkasan AI, deploy |
| [desain/prototipe/](desain/prototipe/) | Prototipe tampilan awal (acuan desain) |

## Cara kerja

1. **Claude** membangun dan menguji aplikasi di repo ini.
2. **Asadin** mencobanya di laptop dengan [docs/07-mencoba-di-laptop.md](docs/07-mencoba-di-laptop.md).
3. Setelah sesuai, kode diunggah ke GitHub. **Emergent** menarik repo lewat "Pull from GitHub",
   lalu menjalankan [prompts/impor-dan-deploy.md](prompts/impor-dan-deploy.md): tes, Ringkasan AI, deploy.
4. **Asadin** menekan Submit Your App di Emergent.

## Status

- [x] Riset masalah dan desain solusi
- [x] Prompt Emergent Tahap 1–3
- [x] Spesifikasi diperiksa ulang: hitungan Rupiah tanpa dobel, demo per pengunjung, celah muatan dan bon ditutup
- [x] Prototipe UI semua layar Tahap 1–3
- [x] Aplikasi lengkap (Tahap 1–3 kecuali Ringkasan AI) dibangun dan lulus tes otomatis serta uji antarmuka
- [ ] Dicoba Asadin di laptop
- [ ] Catatan kurir 7 hari terakhir terkumpul
- [ ] Ditarik Emergent, Ringkasan AI ditambahkan, dan di-deploy
- [ ] Submit ke lomba
- [ ] Uji coba di depot keluarga (angka nyata untuk penilaian dampak bisnis)
