# Identitas dan perombakan antarmuka AQUAIR

Diperbarui 16 September 2026 atas arahan pemilik proyek: ruang pemilik depot dan
PWA kurir dibuat lebih cerah dengan susunan baru. Landing biru-putih dipertahankan. Aturan bisnis tetap mengikuti
[spesifikasi produk](03-spesifikasi-produk.md).

## Arah visual

- Biru utama `#2563EB`, sidebar putih, latar `#F4F8FF`, gradasi biru langit,
  dan kartu putih dengan aksen warna sesuai pekerjaan.
- Plus Jakarta Sans untuk judul dan Inter untuk isi. Font disimpan di aplikasi,
  beserta lisensi OFL, sehingga tidak perlu mengambil font dari Google saat dibuka.
- Status tetap dibedakan dengan teks, ikon, serta warna hijau, kuning, dan merah.
- Landing memakai judul besar, pratinjau produk yang bisa diganti, penjelasan
  verifikasi, contoh hitungan berlabel ilustrasi, alur kerja, PWA, dan tanya jawab.
- Ruang pemilik memakai sidebar putih dengan menu aktif bergradasi biru. Menu
  dikelompokkan menjadi aktivitas harian, pengawasan, pelanggan/tim, dan depot.
  Bagian menu bergulir sendiri sehingga profil dan tombol keluar tetap tersedia.
  Dasbor memuat ringkasan keuangan, akses cepat, statistik, grafik, dan tindak lanjut.
  Di HP, navigasi bawah berisi Dasbor, Rit, Penjualan, Radar, dan Menu lengkap.
  Menu lengkap berupa panel dengan pencarian dan tombol dua kolom. Panel
  Perlu perhatian muncul sebelum grafik pada dasbor HP.
- Kurir memakai kartu muatan biru, dua tujuan penjualan, ringkasan setoran, dan
  penjualan terbaru. Navigasi bawah memisahkan Beranda, Riwayat, dan Setor/Mulai.
  Di laptop tersedia panel penjelasan di kiri.
- Masuk dan pendaftaran memakai tata letak dua bagian di laptop, satu kolom di HP.
- Ruang aplikasi dan halaman masuk menggunakan tema terang yang konsisten,
  termasuk saat perangkat memilih mode gelap. Landing mempertahankan tampilannya.
- Animasi menghormati preferensi pengurangan gerak. Menu modal mendukung Escape,
  perpindahan fokus dengan keyboard, dan penguncian gulir halaman belakang.

## Referensi internet

Referensi dipakai untuk mempelajari penyusunan informasi dan pola interaksi;
identitas, ilustrasi produk, tulisan, dan komponen AQUAIR dibuat untuk proyek ini.

| Sumber | Bagian yang menjadi referensi |
| --- | --- |
| [Linear — Welcome to the new Linear](https://linear.app/changelog/2024-03-20-new-linear-ui) | Hierarki navigasi, kepadatan informasi, pembagian judul, menu, dan panel. |
| [Mercury](https://mercury.com/) | Penyajian keuangan, ruang kosong, angka utama, serta akses demo produk. |
| [Stripe Payments](https://stripe.com/payments) | Landing dengan penjelasan manfaat dan pratinjau antarmuka. |
| [Mobbin](https://mobbin.com/) | Referensi pola navigasi serta antarmuka mobile dan web. |

## Logo

Logo dibuat menggunakan **tool imagegen bawaan**, lalu hasilnya disimpan di repo.
Pengecilan gambar untuk aplikasi dan ikon dilakukan secara lokal dari gambar yang
sama. Tidak ada panggilan image generation di aplikasi pengguna.

- Gambar asli: [aquair-drop.png](../frontend/public/brand/aquair-drop.png).
- Logo ringan untuk antarmuka: [aquair-mark.png](../frontend/public/brand/aquair-mark.png).
- Turunan PWA: ikon 192, 512, maskable 512, Apple Touch 180, dan favicon 32 piksel.
- Ikon maskable memakai ruang aman agar tetesan tidak terpotong bentuk ikon HP.

Prompt final yang dikirim ke tool:

> Use case: logo-design. Asset type: final standalone brand symbol for AQUAIR, an Indonesian drinking water depot management app. Create one exceptionally refined minimalist water droplet logo, with an elegant flowing white negative-space wave cut inside the bottom half. Simple bold memorable silhouette, modern Swiss identity design, flat vector-like appearance, precise curves, no thin strokes, legible at 24px. Saturated cobalt blue #2563EB with a subtle cyan-blue second plane #38BDF8. Single mark only, no text, no letters, no mockup, no shadow, no glass, no 3D, no extra objects. Centered square composition, droplet fills about 80% canvas width/height with balanced small margins. Actual transparent background. This image will be used directly as the application logo and PWA app icon.

## Susunan baru per aplikasi

Perombakan mencakup komposisi halaman dan alur kerja berikut.

| Area | Susunan dan interaksi baru |
| --- | --- |
| Landing | Judul terpusat, panggung pratinjau lebar, pilihan ruang pemilik/kurir, penjelasan verifikasi, alur pengantaran, FAQ, dan pendaftaran. |
| Dasbor pemilik | Sidebar putih, ringkasan keuangan berlatar biru langit, akses cepat operasional, statistik harian, grafik dan tindak lanjut. Di HP, ringkasan lebih ringkas dan tindak lanjut didahulukan. |
| Pelanggan | Pencarian nama, filter jenis, pilihan kartu/tabel, ringkasan lokasi, dan izin bon langsung dari kartu. |
| Kurir | Kartu anggota tim, pencarian, status rit, pengaturan akses, serta PIN. |
| Radar dan Persetujuan | Filter status pemeriksaan/jenis pengajuan, panel keputusan, dan riwayat keputusan. |
| Bon dan Galon | Kartu piutang dengan rincian, pencarian, daftar pinjaman menurut prioritas, serta koreksi saldo. |
| Rit dan Konfirmasi toko | Kartu perjalanan dengan progres, navigasi ke rincian penjualan/setoran/peta, kartu perbandingan jawaban toko, serta filter status. |
| Mesin dan Kepatuhan | Indikator interval perawatan, jadwal berikutnya, formulir dokumen, dan ringkasan daftar periksa. |
| Stiker QR | Galeri dengan identitas AQUAIR, pencarian toko, panduan pemasangan, dan cetak A4 sesuai hasil pencarian. |
| Pengaturan dan Unduh | Navigasi antarbagian, tombol simpan yang mengikuti gulir, pilihan jenis laporan berbentuk kartu, dan pratinjau periode. |
| Beranda kurir | Sisa muatan, progres galon terjual, dua tujuan pengantaran, ringkasan setoran, dan tiga penjualan terbaru. |
| Riwayat kurir | Halaman tersendiri, pencarian pelanggan, filter toko/rumah/antrean, status kirim, dan pengajuan koreksi. |
| Catat dan setor | Bagian pengisian bernomor, dampak saldo galon, ringkasan sebelum simpan, bukti pengantaran, serta pencocokan setoran. Jumlah bisa diketik atau diubah dengan tombol tambah/kurang. |
| Masuk, daftar, konfirmasi publik | Pendaftaran dikelompokkan menjadi identitas depot, akun, dan harga. Konfirmasi pengantaran toko memakai ringkasan besar dan jawaban yang jelas. |

## Struktur implementasi

- `frontend/src/gaya.css`: komponen dasar dan warna status.
- `frontend/src/tampilan.css`: fondasi identitas, landing, auth, dan komponen umum.
- `frontend/src/pengalaman.css`: komposisi baru semua ruang kerja dan penyesuaian
  layar laptop, tablet, HP, cetak, serta mode gelap.
- `frontend/src/cerah.css`: sumber visual akhir ruang aplikasi, dimuat setelah
  fondasi lama. Mencakup palet terang, navigasi pemilik, dasbor, halaman pengelolaan,
  formulir kurir, masuk/daftar, area aman PWA, dan cetak. Selector dibatasi ke
  ruang aplikasi sehingga komposisi dan ilustrasi landing tetap sama.
- `frontend/src/komponen/Ruang.js`: ringkasan, pencarian, pilihan filter, panel,
  keadaan kosong, dan bagian formulir bersama.
- `frontend/src/kurir/Riwayat.js`: riwayat lengkap dan komponen daftar penjualan
  yang juga dipakai pada beranda kurir.
- `frontend/src/komponen/Pratinjau.js`: ilustrasi produk untuk landing; semua angka
  di dalamnya adalah ilustrasi.
- `frontend/src/komponen/AuthLayout.js`: tata letak masuk dan pendaftaran bersama.
- `frontend/src/fonts.css` dan `assets/fonts/`: font lokal dan lisensi.
- `frontend/public/manifest.json` dan `sw.js`: identitas PWA, cache logo, serta
  pembaruan cache ke `aquair-v5`. Respons API tetap tidak disimpan di cache.
- `frontend/.env.production`: konfigurasi publik `GENERATE_SOURCEMAP=false` untuk
  menghindari source map TypeScript yang tidak disertakan paket `html5-qrcode`.
  Pemeriksaan ESLint dan build CI tetap aktif. Berkas ini tidak berisi rahasia.

## Validasi

### Perombakan cerah — 16 September 2026

- Build produksi ketat `CI=true npx react-scripts build` lulus.
- Seluruh 52 tes backend lulus dengan MongoDB lokal. Perombakan ini tidak
  mengubah endpoint, perhitungan harga, verifikasi, maupun format antrean.
- Pemeriksaan browser mencakup 17 halaman pemilik pada 320, 390, 768, 1024,
  dan 1440 px, serta enam halaman kurir pada 320, 390, 768, dan 1440 px.
  Tidak ditemukan pelebaran halaman atau galat JavaScript pada 109 tata letak ini.
  Sesudah penyesuaian terakhir, 44 tata letak HP/formulir/halaman publik diperiksa ulang.
- Audit otomatis WCAG A/AA pada 23 halaman/keadaan, termasuk menu terbuka,
  formulir multi-produk, bukti penjualan, dan preferensi perangkat gelap,
  selesai tanpa temuan. Kontras indikator muatan diperbaiki. Tabel keuangan
  diberi fokus keyboard dan nama agar dapat digulir lewat keyboard.
- Alur demo yang berhasil: menu HP dan pencariannya, Escape/pengembalian fokus,
  penjualan toko terverifikasi dengan beberapa produk, penjualan rumah,
  QR jauh dan persetujuan harga toko, antrean tanpa sinyal dan pengiriman ulang,
  setoran, rit baru, penjualan depot, catatan pengeluaran, dan pilihan periode.
- Unduhan CSV berhasil; cetak stiker tetap tiga kolom tanpa navigasi bawah.
  Service worker memakai `aquair-v5`, dan landing dapat dibuka ulang tanpa jaringan.
- Tombol simpan pengaturan tetap berada di atas navigasi bawah pada viewport
  pendek 390 × 430 px. Kamera/GPS dan pemasangan pada HP fisik tidak disimulasikan
  sebagai hasil uji perangkat nyata.

### Pengujian antarmuka sebelumnya — 15 September 2026

- Build produksi: `cd frontend && CI=true npx react-scripts build`.
- Backend: 33 tes lulus menggunakan MongoDB lokal dan database uji terpisah,
  termasuk login akun contoh, kata sandi salah, pemisahan depot, dan batas pembuatan demo.
- Browser: semua 14 halaman pemilik serta landing, masuk, dan daftar diperiksa
  pada laptop 1440 px dan HP 360 px. Tidak ada pelebaran halaman atau galat JavaScript.
- Semua 14 halaman pemilik juga diperiksa pada tablet 768 dan 1024 px,
  sehingga total 56 tata letak halaman pemilik diuji. Menu, pratinjau, tanya jawab, fokus keyboard, dan keypad PIN dicoba.
- Audit otomatis axe mencakup halaman publik, 14 halaman pemilik, serta layar utama
  kurir. Temuan kontras diperbaiki dan halaman terkait diperiksa ulang hingga tidak
  ada temuan pada aturan WCAG A/AA yang diuji. Tema gelap juga diperiksa pada beberapa
  halaman utama; audit otomatis ini bukan sertifikasi aksesibilitas menyeluruh.
- Alur demo: penjualan toko dengan lokasi sesuai dan jauh, penjualan rumah,
  permintaan harga toko, koreksi, persetujuan pemilik, selesai rit, rit baru, dan CSV.
  Dua belas pemeriksaan alur browser lulus, termasuk masuk demo dan antrean jaringan.
- Pendaftaran depot, keadaan kosong, masuk pemilik, pembuatan kurir/PIN, dan
  masuk melalui keypad juga diuji. Jumlah galon yang diketik diuji pada nilai
  minimum, maksimum, kosong, pembaruan galon kosong, serta simpan langsung.
- Tanpa sinyal: penjualan gagal jaringan masuk antrean HP; antrean terkirim setelah
  koneksi kembali. Pengujian tidak memakai data depot sungguhan.
- PWA: manifest biru, dimensi ikon, logo dan font lokal, serta pembukaan landing
  tanpa jaringan setelah tersimpan oleh service worker.

Kamera dan GPS fisik tetap memakai integrasi yang sudah ada. Uji transaksi browser
memakai simulasi depot contoh; pemasangan PWA pada perangkat fisik serta kamera/GPS
sungguhan tetap mengikuti [panduan mencoba aplikasi](07-mencoba-di-laptop.md).

## Melihat hasil

Buka **http://localhost:8710** setelah aplikasi lokal berjalan. Gunakan **Jelajahi
demo** untuk pemilik dan **Coba aplikasi kurir** untuk kurir. Dalam demo, tombol
**Bos / Kurir** mengganti peran pada depot contoh yang sama.

## Login dan pemasangan aplikasi

- Halaman masuk memiliki dua pilihan: **Bos** dan **Kurir**. Akun contoh
  `admin / admin` dan `kurir / kurir` dipakai melalui form yang sama dengan akun depot.
- Bagian **Cara login dan memakai AQUAIR** menjelaskan akun contoh, akun depot sendiri,
  pencatatan pengantaran, serta setoran. Landing menautkan panduan ini.
- Tombol **Pasang aplikasi** tetap dapat ditemukan tanpa menunggu tawaran browser.
  Tombol membuka dialog pemasangan browser jika tersedia, atau petunjuk yang sesuai.
  HTTP lokal menjelaskan kebutuhan HTTPS, Safari memakai panduan Bagikan, dan Chrome
  memakai menu pemasangan. Status pemasangan dibagikan ke seluruh tombol di halaman.
