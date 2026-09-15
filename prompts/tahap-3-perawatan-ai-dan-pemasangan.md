# Tahap 3 — perawatan mesin, kepatuhan, ringkasan AI, dan pemasangan di HP

Tempel sesudah Tahap 2 berjalan.

---

Lanjutkan AQUAIR. Kerjakan bagian spesifikasi bertanda **[T3]** tanpa mengubah perilaku
tahap sebelumnya.

## 1. Perawatan mesin
- **Halaman "Perawatan"** berisi daftar komponen dengan tanggal ganti terakhir dan interval
  default:
  - filter sedimen 90 hari,
  - filter karbon 180 hari,
  - filter mangan 300 hari,
  - lampu UV 365 hari,
  - membran RO 540 hari.
- Bos bisa menambah komponen dan mengubah interval.
- Status tiap komponen: aman / segera (≤ 7 hari) / terlambat.
- Komponen yang segera atau terlambat muncul sebagai kartu di atas dasbor.
- Tombol "Sudah diganti hari ini" menyimpan tanggal dan catatan.

## 2. Kepatuhan
- **Halaman "Kepatuhan"** berisi:
  - tanggal uji lab kualitas air terakhir, dengan interval diisi bos sesuai dinas kesehatan
    setempat,
  - masa berlaku Sertifikat Laik Higiene Sanitasi (SLHS),
  - nomor NIB.
- **Daftar periksa:** "Tidak memakai galon bermerek", "Tidak memakai tutup bermerek",
  "Sumber air baku berizin".
- Pengingat H-30 untuk uji lab dan SLHS muncul di dasbor.

## 3. Ringkasan AI harian
- Pakai **Universal Key Emergent** di backend.
- **Server menghitung semua angka lebih dulu**, lalu mengirimnya ke model sebagai JSON:
  - galon terjual per jenis,
  - uang seharusnya vs disetor,
  - tanda Radar per kurir beserta perkiraan Rupiah,
  - komponen perawatan yang segera diganti.
- Instruksi sistem untuk model:
  - tulis maksimal 5 kalimat dalam Bahasa Indonesia sederhana untuk pemilik depot,
  - mulai dari hal yang paling butuh tindakan,
  - **dilarang menyebut angka yang tidak ada di data**,
  - jika tidak ada masalah, katakan terus terang.
- Tampilkan di atas dasbor bos, lengkap dengan waktu dibuat dan tombol "Buat ulang".
  Simpan ringkasan per hari supaya tidak memanggil model setiap kali halaman dibuka.
- Kalau pemanggilan model gagal, tampilkan "Ringkasan belum tersedia". Dasbor lain tetap
  berjalan.

## 4. Pemasangan di HP (PWA)
- Tambahkan manifest dan ikon AQUAIR, supaya layar kurir dan bos bisa dipasang ke layar
  utama Android.
- Tambahkan tombol **"Pasang aplikasi"** di landing dan di layar kurir, dengan petunjuk
  singkat bila browser tidak mendukung pemasangan otomatis.

## Selesai bila
1. Komponen dengan tanggal lewat interval muncul sebagai "terlambat" di dasbor.
2. Ringkasan AI di depot demo menyebut Rudi dan perkiraan selisihnya, dengan angka yang sama
   persis seperti di Radar.
3. Aplikasi bisa dipasang ke layar utama HP Android dari Chrome.
