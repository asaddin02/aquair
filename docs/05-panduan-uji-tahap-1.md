# Panduan uji Tahap 1 (Rabu 16 Sep)

Tujuannya memastikan hasil Emergent layak di-deploy dan di-submit hari Kamis. Kerjakan
berurutan dan centang yang lulus. Kalau ada langkah yang gagal, pakai templat prompt
perbaikan di bagian F.

**Sebelum mulai:**
- Buka preview di tab browser tersendiri. Kalau kamera atau lokasi tidak jalan di panel
  preview Emergent, coba di tab tersendiri atau di HP.
- Siapkan dua jendela: Chrome biasa dan Chrome Incognito.

## A. Jalur juri — wajib lulus semua

| # | Langkah | Hasil yang benar |
|---|---|---|
| 1 | Buka landing | Ada hero, tiga cara kerja, tombol "Coba sebagai Bos", "Coba sebagai Kurir", dan "Daftarkan depot saya". Tidak ada testimoni atau angka karangan. |
| 2 | Tekan "Coba sebagai Kurir" | Muncul "Menyiapkan depot contoh…", lalu langsung masuk ke rit aktif Rudi. Label "Data contoh" terlihat. |
| 3 | Jual ke rumah → pilih satu rumah → 2 galon, tunai → Simpan | Tertulis harga rumah Rp4.000, total Rp8.000 |
| 4 | Jual ke toko → Simulasi scan → pilih toko → "Di lokasi toko" → 3 galon → Simpan | "Terverifikasi — harga toko Rp3.000" |
| 5 | Ulangi langkah 4 dengan "1,2 km dari toko" | "Tidak terverifikasi — dihitung harga rumah Rp4.000" |
| 6 | Jual ke toko → "Toko tanpa QR" → Simpan | Dihitung harga rumah |
| 7 | Perhatikan browser selama langkah 2–6 | Tidak ada permintaan izin kamera atau lokasi |
| 8 | "Lihat sebagai: Bos" → buka rit Rudi hari ini | Empat penjualan tadi ada di daftar. Radar hari ini menampilkan tanda R2 dan R4. |
| 9 | Lihat dasbor | Kartu **Tagihan kembali** dan **Perkiraan bocor** (30 hari) tampil terpisah dan bukan Rp0. Kartu Rudi menunjukkan banyak hari berisiko tinggi. |
| 10 | Lihat grafik porsi toko | Garis Rudi tinggi (±90%) lalu turun ke ±45% di 10 hari terakhir, dengan keterangan "simulasi data contoh" |
| 11 | Buka Radar 30 hari → pilih satu hari lama Rudi | Ada penjelasan satu kalimat per tanda, Rupiah, dan tombol "Sudah dicek — aman" / "Terbukti" |
| 12 | Cek kewajaran angka di Radar | Tagihan kembali Rudi per hari **tidak pernah lebih dari Rp40.000** (40 galon × Rp1.000). Kalau lebih, ada galon yang dihitung dua kali. |
| 13 | Tandai satu tanda "Sudah dicek — aman", lalu buat satu penjualan baru sebagai Kurir | Status "Sudah dicek — aman" tetap ada setelah Radar dihitung ulang |

## B. Pengunjung demo tidak saling mengganggu

| # | Langkah | Hasil yang benar |
|---|---|---|
| 14 | Di jendela Incognito, tekan "Coba sebagai Bos" | Penjualan dari langkah 3–6 **tidak ada** di sana |
| 15 | Di Incognito, tekan "Atur ulang data demo" | Data di jendela Chrome biasa tidak berubah |

## C. Depot sungguhan — dibutuhkan untuk uji coba 18 Sep

| # | Langkah | Hasil yang benar |
|---|---|---|
| 16 | "Daftarkan depot saya" dengan email uji | Masuk ke dasbor depot kosong, tanpa label "Data contoh" |
| 17 | Tambah 1 kurir, 1 toko (tekan "Pakai lokasi saya sekarang"), dan 1 rumah | Tersimpan |
| 18 | Buka halaman cetak stiker QR → simpan sebagai PDF | QR, nama toko, dan tulisan "Tempel di dalam toko" tampil rapi di A4 |
| 19 | Di HP, masuk sebagai kurir (nomor HP + PIN) → Mulai rit 10 galon | Di dasbor bos, rit berlabel "Muatan belum dicek". Tekan "Muatan cocok" dan labelnya hilang. |
| 20 | Di HP, scan stiker QR (layar laptop atau hasil cetak) sambil berada di titik toko langkah 17 | "Terverifikasi — harga toko" |
| 21 | Masukkan PIN salah 5 kali | Akun terkunci |
| 22 | Cari tombol ubah atau hapus penjualan di HP kurir | Tidak ada. Yang ada hanya "Ajukan koreksi". |
| 23 | Nyalakan mode pesawat → coba simpan penjualan | "Belum tersimpan — tidak ada sinyal" |
| 24 | Selesai rit dengan uang disetor kurang Rp1.000 | Tanda R6 muncul di Radar |
| 25 | Tekan "Ganti QR" di toko tadi → scan stiker lama | Ditolak |
| 26 | Unduh data → Penjualan → 30 hari → buka berkasnya di Google Sheets | Kolom terpisah rapi, waktu dan uang terbaca sebagai angka, penjualan langkah 20 ada, dan tidak ada data depot demo |

## D. Minta Emergent membuktikan keamanan dan hitungan

Kamu tidak perlu terminal untuk bagian ini. Tempel prompt berikut ke Emergent:

> Jalankan tes otomatis backend dan tunjukkan hasil lulus/gagal untuk setiap poin:
> 1. Contoh hitungan spesifikasi bagian 4.4, kasus A dan kasus B.
> 2. Kurir dan bos depot A meminta rit, penjualan, pelanggan, dan tanda milik depot B lewat
>    ID. Semuanya harus dijawab 404.
> 3. Semua endpoint yang bisa dipanggil kurir di depot sungguhan tidak pernah mengembalikan
>    `qr_token`.
> 4. Endpoint masuk demo menolak depot yang bukan `is_demo`.
> 5. Penjualan dengan `disimulasikan: true` ditolak di depot sungguhan.
> 6. Lima kali salah PIN mengunci akun selama 15 menit.
> 7. Status `sudah_dicek_aman` tidak hilang saat Radar dihitung ulang.
> 8. CSV unduhan bos hanya berisi data depotnya sendiri, dan nama pelanggan yang diawali
>    `=` ditulis dengan awalan `'` di CSV.
>
> Kalau ada yang gagal, perbaiki lalu jalankan ulang semua tesnya.

## E. Siap deploy bila

- **A, B, dan D lulus semua.**
- Dari C, langkah 18, 19, 20, 25, dan 26 wajib lulus sebelum uji coba 18 Sep. Sisanya boleh
  diperbaiki sesudah submit.

Sesudah deploy, ulangi bagian A di alamat hasil deploy, lalu tekan **Submit Your App**.

## F. Templat prompt perbaikan

Satu masalah per pesan supaya Emergent tidak mengubah bagian lain:

> Ada yang belum sesuai spesifikasi.
> - Langkah: [apa yang kamu tekan]
> - Yang terjadi: [apa yang muncul]
> - Yang seharusnya: [hasil yang benar dari tabel di atas], sesuai spesifikasi bagian [nomor].
>
> Perbaiki tanpa mengubah perilaku lain yang sudah benar, lalu tunjukkan cara mengujinya
> ulang.

Contoh bagian spesifikasi untuk masalah yang sering muncul:

| Masalah | Bagian |
|---|---|
| Tagihan kembali dan perkiraan bocor dijumlahkan, atau Rupiah terlalu besar | 4.1 dan 4.4 |
| Semua pengunjung demo berbagi data | 10.1 |
| Dasbor kosong atau Rp0 di depot demo | 5 (30 hari bergulir) dan 10.2 |
| Demo meminta izin kamera atau lokasi | 10.3 |
| Kurir bisa melihat token QR | 6 (Stiker QR) |
