# Uji coba di depot keluarga (18–19 Sep)

Uji coba ini menghasilkan satu-satunya angka nyata untuk kriteria dampak bisnis (30%).
Hanya angka dari sini yang boleh masuk deskripsi lomba. Angka ilustrasi di dokumen 02 tidak
boleh dipakai sebagai hasil.

**Data pribadi:** isi semua tabel di kertas atau di Google Sheet pribadi. Yang boleh masuk
repo dan deskripsi lomba hanya angka ringkasan. Nama depot, alamat, nama kurir, nama toko,
dan nomor HP tidak boleh masuk.

## 1. Mulai hari ini (Selasa 15 Sep): data "sebelum"

Minta keluarga mengumpulkan catatan kurir **7 hari terakhir** dari buku, nota, atau chat WA,
lalu salin per hari:

| Tanggal | Galon dibawa | Galon toko | Galon rumah | Porsi toko (toko ÷ total) | Uang disetor | Keterangan |
|---|---|---|---|---|---|---|
| | | | | | | |

- Kalau ada hari yang catatannya tidak lengkap, tulis apa adanya dan beri tanda di
  keterangan. **Jangan mengisi dengan perkiraan.**
- Catat juga harga yang berlaku saat itu (toko dan rumah), karena rumus setoran bergantung
  pada harga.

## 2. Izin dan pemberitahuan (sebelum Kamis)

- **Pemilik depot** setuju angka ringkasan tanpa nama dipakai untuk lomba.
- **Kurir** diberi tahu sebelum hari pertama. Uji coba tidak boleh disamarkan sebagai hal
  lain.
- **Pemilik toko** dimintai izin menempel stiker.

**Naskah untuk kurir** (disampaikan pemilik depot):

> Mulai [hari], semua penjualan dicatat di HP lewat aplikasi. Jual ke rumah cukup pilih
> pembelinya. Jual ke toko harus scan stiker QR yang ditempel di dalam toko. Lokasi HP
> hanya diambil saat kamu menekan Simpan, bukan sepanjang hari. Penjualan toko yang tidak
> bisa di-scan dihitung harga rumah. Kalau stikernya rusak, bilang ke saya supaya saya
> setujui. Aturan ini berlaku untuk semua kurir, dan catatannya juga melindungimu kalau ada
> yang ragu.

**Naskah untuk pemilik toko:**

> Bu/Pak, mulai minggu ini kurir kami mencatat antaran dengan scan stiker ini. Boleh
> ditempel di dalam toko, misalnya dekat kulkas atau meja kasir? Tidak ada biaya dan
> harganya tidak berubah. Sesekali kami juga akan bertanya lewat WA berapa galon yang
> diterima.

## 3. Persiapan Kamis 17 Sep (sesudah deploy)

- [ ] Daftarkan **depot sungguhan** (bukan depot demo). Isi harga toko dan harga rumah
      sesuai depot.
- [ ] Buat akun kurir (nomor HP + PIN).
- [ ] Untuk setiap toko di rute, catat nama, **kapasitas simpan** (tanya pemilik toko), dan
      **perkiraan laku per hari**.
- [ ] Cetak stiker QR di kertas A4. Lapisi selotip bening supaya tahan air.
- [ ] Datangi setiap toko: tempel stiker, lalu tekan **"Pakai lokasi saya sekarang"** sambil
      berdiri di dalam toko. Dua pekerjaan ini bisa dilakukan sekaligus.
- [ ] Rumah langganan boleh didaftarkan belakangan; kurir bisa menambah pembeli baru.
- [ ] Buka alamat aplikasi di Chrome HP kurir. Izinkan kamera dan lokasi.
- [ ] Latihan di depot: satu penjualan rumah dan satu scan stiker cadangan.

## 4. Selama uji coba (Jumat 18 – Sabtu 19 Sep, tambah Minggu 20 bila bisa)

Setiap hari:
- **Pagi:** kurir menekan Mulai rit. Pemilik depot menghitung galon di motor, lalu menekan
  **"Muatan cocok"**.
- **Sore:** kurir menekan Selesai rit. Pemilik depot menghitung uang dan galon yang
  kembali, lalu menekan **"Setoran diterima"**.
- **Malam:** buka Radar. Tandai setiap tanda "Sudah dicek — aman" atau "Terbukti".
- **Malam:** tekan **Unduh data**, unduh **Penjualan** dan **Rit & setoran** untuk hari itu,
  lalu simpan di Google Drive pribadi. Jangan ditaruh di repo, karena berisi nama toko.
  Salinan ini menjaga bukti uji coba kalau aplikasi bermasalah.
- Catat kejadian lapangan: sinyal hilang, stiker rusak, HP mati, toko tutup.

Salin angka dari aplikasi setiap hari:

| Tanggal | Galon dibawa | Galon toko (semua klaim) | Galon toko terverifikasi | Galon rumah | Porsi toko | Uang seharusnya | Uang disetor | Tagihan kembali | Kejadian |
|---|---|---|---|---|---|---|---|---|---|
| | | | | | | | | | |

## 5. Menyusun hasil (Minggu 20 Sep, sebelum 23:59)

Hitung tiga angka:

1. **Porsi toko:** rata-rata 7 hari sebelum vs rata-rata hari uji coba. Pakai "semua
   klaim" supaya sebanding dengan catatan kertas.
2. **Setoran per 40 galon:** `uang disetor ÷ galon terjual × 40`. Angka ini dipakai supaya
   hari dengan jumlah galon berbeda tetap bisa dibandingkan.
3. **Tagihan kembali:** total selama uji coba.

Kalimat untuk deskripsi lomba (isi dengan angka apa adanya, tanpa pembulatan yang
menguntungkan):

> Uji coba [n] hari di depot keluarga kami dengan satu kurir: porsi penjualan toko berubah
> dari rata-rata [X]% (catatan kertas [m] hari sebelumnya) menjadi [Y]%, dan setoran per 40
> galon berubah dari Rp[A] menjadi Rp[B].

**Kalau hasilnya tidak berubah**, tulis apa adanya. Contohnya: "Porsi toko tetap [X]%, dan
[k] dari [t] galon toko terverifikasi lewat scan QR." Itu tetap bukti bahwa aplikasinya
berjalan di lapangan.
