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
| [docs/03-spesifikasi-produk.md](docs/03-spesifikasi-produk.md) | Peran, alur, aturan bisnis, data, layar, dan prioritas MVP |
| [docs/04-strategi-lomba.md](docs/04-strategi-lomba.md) | Rubrik, jadwal, teks submission, naskah demo, rencana upvote |
| [prompts/](prompts/) | Prompt siap tempel ke Emergent, satu berkas per tahap |

## Cara mulai di Emergent

1. Top-up kredit, lalu buka **Home > Profile > BUILDers CONTEST > Join the Contest**.
2. Buat proyek **web** baru. Tempel isi [prompts/tahap-1-inti-anti-curang.md](prompts/tahap-1-inti-anti-curang.md)
   dan lampirkan [docs/03-spesifikasi-produk.md](docs/03-spesifikasi-produk.md).
3. Setelah Tahap 1 berjalan di preview: **Deploy**, lalu **Submit Your App**. Jangan
   menunggu tahap berikutnya — perbaikan sesudah submit otomatis ikut tampil.
4. Lanjutkan ke Tahap 2 dan Tahap 3.

## Status

- [x] Riset masalah dan desain solusi
- [x] Prompt Emergent Tahap 1–3
- [ ] Tahap 1 dibangun dan di-deploy
- [ ] Submit ke lomba
- [ ] Uji coba di depot keluarga (angka nyata untuk penilaian dampak bisnis)
- [ ] Tahap 2 dan 3
