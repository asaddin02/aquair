# Tahap 2 — bukti dari pelanggan, galon pinjaman, peta, dan antrean offline

Tempel sesudah Tahap 1 berjalan dan sudah dicoba. Lampirkan ulang
`docs/03-spesifikasi-produk.md` bila Emergent memintanya.

---

Lanjutkan AQUAIR. Kerjakan bagian spesifikasi bertanda **[T2]** tanpa mengubah perilaku
Tahap 1 yang sudah berjalan.

## 1. Konfirmasi pemilik toko (aturan R8)
- **Tautan unik per toko** untuk satu periode (Senin–Minggu):
  - token acak yang di-hash di database dan berlaku 7 hari,
  - bisa dibuka tanpa login.
- **Halaman konfirmasi** menampilkan nama toko, periode, dan jumlah galon tercatat:
  - "Minggu 8–14 Sep tercatat **12 galon** diantar ke Toko X. Benar?"
  - Pilihan [Ya, benar] atau [Tidak, yang benar ___ galon].
  - Jawaban hanya bisa dikirim sekali.
- **Di dasbor bos:** daftar toko periode ini dengan status belum dikirim / menunggu /
  benar / berbeda.
  - Tombol "Kirim lewat WhatsApp" membuka `https://wa.me/<nomor>?text=<pesan>` berisi
    tautan konfirmasi, jadi pesan dikirim dari HP bos sendiri.
- **Jawaban berbeda** membuat tanda **R8** di Radar Kecurangan. Perkiraan Rupiah-nya
  mengikuti spesifikasi bagian 4.2 dan masuk ke **Perkiraan bocor**. Rupiah hanya dihitung
  bila toko menjawab lebih sedikit dari catatan, dikurangi Rupiah R3 toko itu pada minggu
  yang sama supaya galon yang sama tidak dihitung dua kali.

## 2. Cek acak harian
Tombol **"Cek 3 toko hari ini"** di Radar:
- memilih acak 3 penjualan toko hari itu, dengan mengutamakan yang sudah bertanda,
- membuka `wa.me` ke nomor toko dengan pesan: "Halo, dari Depot [nama]. Hari ini kurir kami
  mencatat [n] galon ke toko Bapak/Ibu. Boleh dibantu cek, benar berapa galon?"
- mencatat waktu cek di `audit_log`.

## 3. Galon pinjaman
- Setiap penjualan memperbarui saldo galon milik depot di pelanggan:
  `saldo += galon_isi − galon_kosong`.
- Halaman **"Galon di luar"** berisi:
  - total galon di pelanggan,
  - daftar per pelanggan (terbesar dulu),
  - pelanggan dengan saldo > 0 yang tidak mengembalikan satu pun galon kosong selama
    > 14 hari (pelanggan yang rutin tukar galon tidak ikut masuk).
- Bos bisa mengoreksi saldo dengan alasan, dan koreksinya tercatat di `audit_log`.

## 4. Peta rit
- Di detail rit, tampilkan peta Leaflet + OpenStreetMap:
  - titik setiap penjualan berurutan, bernomor, dan diberi warna sesuai status verifikasi,
  - titik lokasi toko,
  - garis penghubung antar-titik.
- Titik yang memicu R4 atau R5 diberi ikon peringatan.

## 5. Antrean offline untuk kurir
- Kalau penyimpanan gagal karena tidak ada sinyal, penjualan disimpan di `localStorage`
  beserta lokasi dan waktu HP, lalu tampil di layar sebagai **"Menunggu sinyal (n)"**.
- Saat sinyal kembali, antrean dikirim otomatis. Server menandainya `dicatat_offline` dan
  memakai waktu HP untuk urutan, tetapi tetap mencatat waktu server saat diterima.
- Kirim ulang tidak boleh membuat penjualan ganda: gunakan ID unik yang dibuat di HP.

## 6. Depot demo
- **Tombol WhatsApp di depot demo hanya menampilkan pratinjau pesan** dan tidak membuka
  `wa.me`, karena nomor contoh bisa saja milik orang sungguhan.
- Tambahkan ke pembuat depot demo:
  - saldo galon dari riwayat penjualan contoh, dengan 4 pelanggan yang tidak mengembalikan
    galon kosong selama > 14 hari,
  - konfirmasi minggu lalu untuk 3 toko: 2 menjawab benar, 1 toko langganan Rudi menjawab
    lebih sedikit (memunculkan R8).
- Peta rit di depot demo memakai lokasi simulasi yang sudah ada.

## Selesai bila
1. Tautan konfirmasi bisa dibuka tanpa login, dan jawaban "berbeda" memunculkan R8 di Radar.
2. Di depot sungguhan, tombol WhatsApp membuka pesan yang sudah terisi. Di depot demo, hanya
   pratinjau pesan yang tampil.
3. Saldo galon berubah benar setelah penjualan, dan daftar "tidak kembali > 14 hari" muncul
   di data demo.
4. Peta rit menampilkan titik dan warna status.
5. Penjualan yang dicatat dengan mode pesawat terkirim sekali saja setelah sinyal kembali.
