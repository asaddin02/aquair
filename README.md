# AQUAIR

**Aplikasi anti-curang pengantaran galon untuk Depot Air Minum Isi Ulang (DAMIU).**

Dibuat untuk lomba Emergent **Building Indonesia** (submit tutup 20 September 2026, 23:59 WIB).
Aplikasi dibangun dan diuji di repo ini, lalu ditarik ke Emergent, dilengkapi Ringkasan AI, dan
di-deploy di sana: React + FastAPI + MongoDB, tanpa Docker dan tanpa server sendiri.

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
| [backend/](backend/) | FastAPI + MongoDB: mesin aturan Radar dan harga, API bos/kurir/publik, pembuat depot demo, tes otomatis |
| [frontend/](frontend/) | React + PWA: landing, aplikasi bos, aplikasi kurir (mobile), halaman konfirmasi pemilik toko |
| [scripts/jalankan-lokal.sh](scripts/jalankan-lokal.sh) | Menjalankan seluruh aplikasi di laptop di satu alamat |
| [docs/01-riset-masalah-damiu.md](docs/01-riset-masalah-damiu.md) | Masalah DAMIU dari riset internet, dengan sumber |
| [docs/02-kasus-kurir-curang.md](docs/02-kasus-kurir-curang.md) | Bedah kasus kurir: hitungan kerugian, pola, dan lapisan pencegahan |
| [docs/03-spesifikasi-produk.md](docs/03-spesifikasi-produk.md) | Sumber kebenaran aturan bisnis: peran, alur, Radar, contoh hitungan, data, mode demo |
| [docs/04-strategi-lomba.md](docs/04-strategi-lomba.md) | Rubrik, jadwal, teks submission, naskah demo, rencana upvote |
| [docs/06-uji-coba-depot-keluarga.md](docs/06-uji-coba-depot-keluarga.md) | Data "sebelum", naskah izin, persiapan, tabel harian, dan cara menyusun hasil |
| [docs/07-mencoba-di-laptop.md](docs/07-mencoba-di-laptop.md) | Cara menyalakan aplikasi di laptop, daftar uji sebelum dan sesudah deploy, templat perbaikan |
| [docs/08-desain-antarmuka.md](docs/08-desain-antarmuka.md) | Identitas biru, referensi desain, logo, dan validasi perombakan antarmuka |
| [docs/09-panduan-emergent.md](docs/09-panduan-emergent.md) | Aturan kerja agen Emergent: peta proyek, hemat kredit, konsistensi tampilan, PWA |
| [prompts/](prompts/) | Prompt bernomor untuk Emergent, dipakai berurutan: [1](prompts/01-deploy-dan-ringkasan-ai.md) deploy dan Ringkasan AI, [2](prompts/02-tarik-fitur-produk.md) tarik fitur multi-produk |

## Cara kerja

**Cara login:** buka halaman **Masuk**, lalu pilih **Bos** atau **Kurir**. Gunakan username/kata sandi
`admin / admin` untuk pemilik atau `kurir / kurir` untuk kurir. Setiap browser
mendapat depot contoh sendiri. Petunjuk lengkap ada di [panduan mencoba](docs/07-mencoba-di-laptop.md).

1. **Claude** (dan Codex untuk perombakan tampilan) membangun dan menguji aplikasi di repo ini.
2. **Asadin** mencobanya di laptop dengan [docs/07-mencoba-di-laptop.md](docs/07-mencoba-di-laptop.md).
3. Kode diunggah ke GitHub. **Emergent** menarik repo lewat "Pull from GitHub", lalu menjalankan
   [prompt 1](prompts/01-deploy-dan-ringkasan-ai.md): tes, deploy, Ringkasan AI.
4. **Asadin** menekan Submit Your App di Emergent.
5. Fitur berikutnya dibangun Claude di laptop, diunggah, lalu ditarik Emergent dengan prompt bernomor
   berikutnya dan di-deploy ulang (gratis).

## Status

- [x] Riset masalah dan desain solusi
- [x] Spesifikasi diperiksa ulang: hitungan Rupiah tanpa dobel, demo per pengunjung, celah muatan dan bon ditutup
- [x] Aplikasi lengkap (semua fitur kecuali Ringkasan AI) dibangun dan lulus tes otomatis serta uji antarmuka
- [x] Tampilan dirombak: identitas biru, logo tetesan air, PWA; login contoh `admin / admin` dan `kurir / kurir`
- [x] Versi yang lulus tes diunggah ke GitHub (`main`)
- [ ] Ditarik Emergent dan di-deploy, lalu Ringkasan AI ditambahkan
- [ ] Submit ke lomba
- [x] Fitur multi-produk (LPG, galon bermerek, galon baru, isi wadah kecil), penjualan di depot, dan tambalan 2 celah anti-curang (R9 galon kosong, rit kemarin wajib ditutup) dibangun dan lulus 45 tes
- [ ] Fitur multi-produk digabung ke `main` dan ditarik Emergent (prompt 2)
- [ ] Catatan kurir 7 hari terakhir terkumpul
- [ ] Uji coba di depot keluarga (angka nyata untuk penilaian dampak bisnis)
