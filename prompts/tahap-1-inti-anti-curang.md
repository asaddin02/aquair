# Tahap 1 — inti anti-curang (bisa langsung di-submit)

Lampirkan `docs/03-spesifikasi-produk.md` bersama prompt ini. Tempel semua teks di bawah
garis.

---

Bangun aplikasi web bernama **AQUAIR** untuk pemilik Depot Air Minum Isi Ulang (DAMIU) di
Indonesia. Spesifikasi lengkapnya ada di berkas `03-spesifikasi-produk.md` yang saya
lampirkan. Di tahap ini kerjakan semua bagian bertanda **[T1]**. Semua teks antarmuka
memakai Bahasa Indonesia sederhana.

## Masalah yang diselesaikan

Kurir depot membawa 40 galon setiap hari untuk dijual ke toko (Rp3.000/galon) dan ke rumah
tangga (Rp4.000/galon). Kurir menulis sendiri jenis pembelinya, jadi ia bisa mencatat
pembeli rumah sebagai toko lalu mengantongi selisih Rp1.000 per galon. Catatannya selalu
"36 toko, 4 rumah", padahal toko di rutenya masih punya stok. AQUAIR menutup celah ini:
**harga toko hanya berlaku kalau ada bukti**, dan bos melihat setiap kejanggalan beserta
perkiraan kerugiannya.

## Stack

React + FastAPI + MongoDB, deploy di Emergent. Jangan memakai Docker atau layanan luar
berbayar. Lokasi memakai `navigator.geolocation`, scan QR memakai `html5-qrcode`, dan QR
dibuat dengan library `qrcode`.

## Urutan pengerjaan

Kerjakan berurutan. Kalau harus berhenti di tengah jalan, langkah 1–5 sudah cukup untuk
dicoba juri.

1. Model data, login bos dan kurir, dan penyaringan `depot_id` di setiap endpoint.
2. Mesin aturan di backend: status verifikasi, harga yang berlaku, hitungan setoran, Radar
   R1–R7, dan dua angka Rupiah. Tulis tes otomatis dari **contoh hitungan bagian 4.4**
   (kasus A dan B), dan pastikan lulus sebelum lanjut.
3. Pembuat depot demo per pengunjung (bagian 10) yang memakai mesin dari langkah 2, plus
   landing dengan tombol demo.
4. Aplikasi kurir.
5. Dasbor bos, Radar Kecurangan, dan detail rit.
6. Kelola data, stiker QR, persetujuan, bon, pengaturan, dan unduh data CSV.
7. Pendaftaran depot baru dan perapian tampilan.

## Yang dibangun

### 1. Landing publik
- Hero: "Kurir jujur, setoran utuh." Jelaskan masalah 36 toko : 4 rumah dalam satu kalimat.
- Tiga cara kerja: scan QR toko, lokasi dicocokkan, Radar Kecurangan.
- Dua tombol besar: **"Coba sebagai Bos"** dan **"Coba sebagai Kurir"** (masuk ke depot demo
  tanpa kata sandi), plus tombol "Daftarkan depot saya".
- Jangan menulis testimoni, jumlah pengguna, atau statistik karangan.

### 2. Akun dan akses
- Bos masuk dengan email dan kata sandi. Kurir masuk dengan nomor HP dan PIN 6 digit.
- Pendaftaran membuat satu depot beserta akun bosnya.
- Setiap data punya `depot_id`, dan **setiap endpoint backend wajib menyaring data berdasarkan
  `depot_id` pengguna yang masuk**. Endpoint yang menerima ID wajib memeriksa bahwa data
  itu milik depot pengguna; kalau bukan, jawab 404.
- Kurir hanya bisa melihat rit miliknya sendiri.
- 5 kali salah PIN atau kata sandi membuat akun itu dikunci 15 menit.

### 3. Aplikasi kurir (mobile-first)
Ikuti spesifikasi bagian 3:
- **Mulai rit** dengan jumlah galon isi yang dibawa. Bos menekan "Muatan cocok" atau
  membetulkan angkanya. Sebelum dicek, rit diberi label "Muatan belum dicek".
- **Jual ke toko:** scan QR → ambil lokasi (ada tombol "Ambil ulang lokasi") → isi galon
  isi, galon kosong, tunai/bon → simpan. **Server** yang menentukan status verifikasi
  (`terverifikasi`, `lokasi_jauh`, `lokasi_lemah`, `tanpa_qr`) dan harga yang berlaku.
- **Jual ke rumah:** pilih pelanggan terdekat atau pembeli baru → simpan dengan harga rumah.
- Pilihan bon hanya muncul untuk pelanggan yang diizinkan bos.
- Setelah menyimpan, tampilkan hasilnya dengan jelas, misalnya **"Terverifikasi — harga
  toko Rp3.000"** atau **"Tidak terverifikasi — dihitung harga rumah Rp4.000"**.
- **Selesai rit:** isi galon isi dibawa pulang, galon kosong, dan uang disetor. Tampilkan
  perhitungan setoran.
- Kurir tidak bisa mengubah atau menghapus penjualan. Yang tersedia hanya "Ajukan koreksi"
  dengan alasan.
- Tanpa sinyal: tampilkan "Belum tersimpan — tidak ada sinyal" dengan tombol coba lagi.
  Jangan pernah menampilkan data seolah tersimpan padahal gagal.
- Tampilan: dua tombol utama setinggi ≥ 72 px, teks ≥ 18 px, kontras tinggi, bisa dipakai
  satu tangan.

### 4. Radar Kecurangan
Terapkan **bagian 4 spesifikasi persis seperti tertulis**:
- aturan R1–R7, termasuk garis dasar R1 dari semua kurir di depot, dan stok R3 yang hanya
  menghitung galon berharga toko serta dibatasi kapasitas untuk esok hari;
- **dua angka Rupiah terpisah: "Tagihan kembali" dan "Perkiraan bocor". Jangan dijumlahkan,
  dan satu galon hanya dihitung sekali;**
- tingkat risiko per kurir per hari;
- penjelasan satu kalimat yang mudah dipahami bos, misalnya: "36 dari 40 galon dicatat
  sebagai toko (90%). Garis dasar depot: 45%.";
- tombol "Sudah dicek — aman" dan "Terbukti". Status ini tidak boleh hilang saat Radar
  dihitung ulang.

### 5. Dasbor bos
Spesifikasi bagian 5:
- semua ringkasan memakai **30 hari terakhir yang bergulir**, bukan "bulan ini",
- kartu **Tagihan kembali** dan **Perkiraan bocor** (30 hari),
- ringkasan hari ini,
- kartu per kurir dengan tingkat risiko,
- Radar dengan filter Hari ini / 7 hari / 30 hari,
- grafik porsi toko 30 hari,
- detail rit.

### 6. Kelola data
Spesifikasi bagian 6:
- pelanggan (termasuk kapasitas, laku per hari, dan "Boleh bon"),
- **halaman cetak stiker QR A4** dan tombol **Ganti QR**. **Token QR hanya dikirim ke layar
  bos, tidak pernah lewat endpoint kurir di depot sungguhan,**
- persetujuan pelanggan baru, penjualan tanpa bukti, dan koreksi,
- bon belum lunas,
- daftar kurir,
- pengaturan harga, radius, dan kebijakan "toko tanpa bukti = harga rumah". Perubahan
  berlaku untuk penjualan berikutnya; penjualan lama tetap memakai `harga_berlaku`-nya,
- **unduh data CSV** untuk penjualan, rit & setoran, tanda Radar, dan log audit, persis
  mengikuti format di spesifikasi bagian 6 (pemisah `;`, UTF-8 BOM, uang bilangan bulat,
  sel teks berawalan `=`/`+`/`-`/`@` diberi awalan `'`).

### 7. Mode demo
Spesifikasi bagian 10, **wajib lengkap**:
- **Setiap pengunjung mendapat depot demo sendiri** (ID disimpan di browser, terhapus
  otomatis sesudah 24 jam lewat TTL index), jadi pengunjung tidak saling mengganggu. Bos dan
  Kurir di browser yang sama melihat depot yang sama, dengan sakelar "Lihat sebagai: Bos |
  Kurir".
- Depot contoh "Depot Tirta Sejahtera" dengan kurir Dimas (jujur) dan Rudi (pola 36:4
  selama 20 hari, lalu membaik), 20 toko, 60 rumah, dan riwayat 30 hari yang **berakhir hari
  ini**.
- **Tanda Radar di data demo dihasilkan oleh mesin Radar yang sama**, bukan ditulis langsung.
- "Coba sebagai Kurir" langsung membuka rit aktif Rudi hari ini.
- "Simulasi scan QR toko" dengan pilihan posisi "Di lokasi toko" atau "1,2 km dari toko".
  **Depot demo tidak meminta kamera atau lokasi asli perangkat.**
- Tombol "Atur ulang data demo", dan label "Data contoh" di semua layar depot demo.

## Tampilan
- Warna utama teal `#0F766E`, biru langit `#0284C7`, kuning `#D97706` untuk peringatan,
  merah `#DC2626` untuk bahaya, latar `#F8FAFC`.
- Font Plus Jakarta Sans untuk judul dan Inter untuk isi.
- Angka Rupiah paling menonjol, format `Rp4.000`, zona waktu Asia/Jakarta.
- Jangan meniru tampilan merek air kemasan.

## Selesai bila
1. "Coba sebagai Kurir": pengunjung bisa mencatat satu penjualan rumah dan satu penjualan
   toko lewat simulasi scan, lalu melihat status verifikasi dan harga yang berlaku. Browser
   tidak meminta izin kamera atau lokasi.
2. Setelah pindah ke Bos, penjualan tadi ada di detail rit Rudi. Dasbor menampilkan kartu
   Tagihan kembali dan Perkiraan bocor 30 hari (terpisah, bukan Rp0), serta Radar
   Kecurangan untuk Rudi.
3. Penjualan "Toko tanpa QR" dan "1,2 km dari toko" tercatat dengan harga rumah.
4. Tes otomatis dari contoh bagian 4.4, kasus A dan B, lulus.
5. Dua browser berbeda mendapat depot demo yang berbeda.
6. Kurir dan bos depot A yang meminta data depot B lewat ID mendapat 404 (uji lewat API).
7. Endpoint kurir di depot sungguhan tidak pernah mengembalikan `qr_token`, dan tidak ada
   kredensial atau token yang ditanam di kode frontend.
8. Bos bisa mengunduh CSV penjualan 30 hari terakhir. Berkasnya terbuka rapi di Excel dan
   Google Sheets (kolom terpisah, waktu dan angka terbaca), dan hanya berisi data depot itu.
