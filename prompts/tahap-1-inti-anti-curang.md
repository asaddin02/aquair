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
  `depot_id` pengguna yang masuk**.
- Kurir hanya bisa melihat rit miliknya sendiri.

### 3. Aplikasi kurir (mobile-first)
Ikuti spesifikasi bagian 3:
- **Mulai rit** dengan jumlah galon isi yang dibawa.
- **Jual ke toko:** scan QR → ambil lokasi → isi galon isi, galon kosong, tunai/bon → simpan.
  **Server** yang menentukan status verifikasi (`terverifikasi`, `lokasi_jauh`,
  `lokasi_lemah`, `tanpa_qr`) dan harga yang berlaku.
- **Jual ke rumah:** pilih pelanggan terdekat atau pembeli baru → simpan dengan harga rumah.
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
Terapkan aturan **R1–R7** dari spesifikasi bagian 4 persis seperti tertulis, termasuk rumus
perkiraan Rupiah dan tingkat risiko. Setiap tanda punya penjelasan satu kalimat yang mudah
dipahami bos, misalnya: "36 dari 40 galon dicatat sebagai toko (90%). Rata-rata hari
terverifikasi: 45%." Bos bisa menandai "Sudah dicek — aman" atau "Terbukti".

### 5. Dasbor bos
Spesifikasi bagian 5:
- ringkasan hari ini,
- kartu per kurir dengan tingkat risiko,
- **"Tagihan kembali bulan ini"**,
- grafik porsi toko 30 hari,
- detail rit.

### 6. Kelola data
Spesifikasi bagian 6:
- pelanggan (termasuk kapasitas dan laku per hari untuk toko),
- **halaman cetak stiker QR A4** dan tombol **Ganti QR**,
- persetujuan pelanggan baru dan penjualan tanpa bukti,
- daftar kurir,
- pengaturan harga, radius, dan kebijakan "toko tanpa bukti = harga rumah".

### 7. Mode demo
Spesifikasi bagian 10, **wajib lengkap**:
- depot contoh "Depot Tirta Sejahtera" dengan kurir Dimas (jujur) dan Rudi (pola 36:4
  selama 20 hari, lalu membaik),
- 20 toko, 60 rumah, dan riwayat 30 hari yang **tanggalnya dihitung relatif terhadap hari
  ini**,
- tombol "Simulasi scan QR toko" dan "Simulasi berada di lokasi toko" khusus di depot demo,
- tombol "Atur ulang data demo",
- label "Data contoh" terlihat di semua layar depot demo.

## Tampilan
- Warna utama teal `#0F766E`, biru langit `#0284C7`, kuning `#D97706` untuk peringatan,
  merah `#DC2626` untuk bahaya, latar `#F8FAFC`.
- Font Plus Jakarta Sans untuk judul dan Inter untuk isi.
- Angka Rupiah paling menonjol, format `Rp4.000`, zona waktu Asia/Jakarta.
- Jangan meniru tampilan merek air kemasan.

## Selesai bila
1. Juri bisa menekan "Coba sebagai Kurir", mencatat satu penjualan rumah dan satu penjualan
   toko lewat simulasi scan, lalu melihat status verifikasi dan harga yang berlaku.
2. "Coba sebagai Bos" menampilkan Radar Kecurangan untuk Rudi dengan perkiraan selisih
   dalam Rupiah, dan kartu tagihan kembali.
3. Penjualan toko tanpa QR tercatat dengan harga rumah.
4. Kurir dari depot A tidak bisa melihat data depot B (uji lewat API).
5. Tidak ada kredensial atau token yang ditanam di kode frontend.
