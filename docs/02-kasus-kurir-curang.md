# Bedah kasus: kurir mencatat pembeli rumah sebagai toko

## Kasusnya

Kasus nyata dari depot air minum milik keluarga pemilik proyek (nama disamarkan).

- Setiap hari kurir membawa **40 galon** untuk dijual langsung di rute antar.
- Ada dua harga:
  - **toko** (galon dijual lagi oleh toko): **Rp3.000/galon**
  - **rumah tangga**: **Rp4.000/galon**
- Catatan kurir hampir selalu berpola **36 toko dan 4 rumah**.
- Pola itu tidak masuk akal: toko-toko di rute tersebut **masih punya stok isi ulang yang
  belum laku**, jadi mustahil mereka membeli sebanyak itu setiap hari.
- Motifnya selisih harga. Galon yang dibayar Rp4.000 oleh rumah tangga ditulis sebagai
  penjualan toko Rp3.000, lalu kurir mengantongi Rp1.000 per galon.

Dalam klasifikasi kecurangan karyawan, pola ini termasuk **understated sales**: transaksinya
tetap tercatat, tetapi dengan nilai lebih rendah daripada uang yang sebenarnya diterima.

## Berapa kerugiannya

**Rumus:** kerugian = jumlah galon rumah yang dicatat sebagai toko × Rp1.000

Setoran berdasarkan catatan kurir (36 toko, 4 rumah): 36 × 3.000 + 4 × 4.000 = **Rp124.000**.

Tabel berikut **ilustrasi**, bukan data. Komposisi sebenarnya belum diketahui, dan justru
itu yang akan diukur AQUAIR.

| Kalau yang sebenarnya | Setoran seharusnya | Hilang per hari | Hilang per 30 hari |
|---|---|---|---|
| 20 toko, 20 rumah | Rp140.000 | Rp16.000 | Rp480.000 |
| 10 toko, 30 rumah | Rp150.000 | Rp26.000 | Rp780.000 |
| 0 toko, 40 rumah | Rp160.000 | Rp36.000 | Rp1.080.000 |

Sebagai pembanding, gaji pokok kurir depot di panduan praktisi hanya Rp800–900 ribu per
bulan (lihat riset). Selisih yang dikantongi bisa hampir menyamai gaji itu sendiri.

## Kenapa kecurangan ini tidak pernah ketahuan

1. **Yang menulis catatan adalah orang yang diuntungkan catatan itu.** Kurir sendiri yang
   menentukan jenis pembeli dan harganya.
2. **Uang setoran selalu cocok dengan catatan.** Pengecekan kas tidak menemukan apa-apa,
   karena catatannya memang dibuat supaya cocok.
3. **Hitung galon di depot tidak membantu.** Galon kosong yang kembali tidak bisa
   membedakan apakah galon itu dari toko atau dari rumah.
4. **Saksinya tidak pernah ditanya.** Pembeli, satu-satunya pihak yang tahu kebenarannya,
   tidak pernah melihat catatan kurir.
5. **Bos tidak ikut ke lapangan**, dan tidak punya waktu mengecek 40 transaksi setiap hari.

## Prinsip desain AQUAIR

1. **Bukti hanya diwajibkan untuk harga yang lebih murah.** Kurir tidak punya alasan
   menulis "rumah" untuk penjualan toko, karena itu merugikan dirinya sendiri. Jadi
   penjualan rumah dicatat tanpa hambatan, sedangkan penjualan toko wajib punya bukti.
   Beban tambahan hanya jatuh pada klaim yang berpotensi curang.
2. **Klaim toko tanpa bukti dihitung harga rumah.** Insentif untuk curang hilang dengan
   sendirinya, tanpa perlu menuduh siapa pun. Bos bisa menyetujui pengecualian (misalnya
   stiker QR toko rusak).
3. **Pembeli dijadikan saksi.** Pemilik toko bisa mengonfirmasi jumlah galon yang ia
   terima lewat tautan sederhana.
4. **Kewajaran fisik dipakai sebagai pemeriksa.** Toko punya kapasitas simpan dan laju
   jual harian, jadi stoknya tidak mungkin terus bertambah.
5. **Aplikasi menunjukkan, bos yang memutuskan.** AQUAIR memberi tanda kejanggalan beserta
   perkiraan kerugian, tanpa sanksi otomatis. Bukti yang sama juga **melindungi kurir yang
   jujur** dari tuduhan.
6. **Catatan yang sudah tersimpan tidak bisa diubah kurir.** Koreksi hanya lewat
   persetujuan bos, disertai alasan, dan tercatat di riwayat.

## Lapisan pencegahan

| # | Lapisan | Cara kerja | Yang ditutup | Celah yang tersisa |
|---|---|---|---|---|
| 1 | **Daftar pelanggan dikunci bos** | Jenis (toko/rumah) dan harga ditentukan bos. Pelanggan baru yang ditambah kurir otomatis berstatus rumah sampai disetujui bos. | Toko karangan, harga diubah kurir | Toko asli dicatat berlebih |
| 2 | **Scan stiker QR toko** | Setiap toko mendapat stiker QR unik yang ditempel di dalam toko. Penjualan harga toko hanya bisa dicatat dengan memindai stiker itu. | Klaim toko tanpa hadir di toko | QR difoto lalu dipindai di tempat lain |
| 3 | **Lokasi saat mencatat** | Saat mencatat, aplikasi mengambil lokasi HP dan waktu server, lalu mengukur jaraknya ke titik toko (default radius 75 m). | Foto QR yang dipindai jauh dari toko | Aplikasi pemalsu GPS (ditutup lapisan 4, 5, 8) |
| 4 | **Kewajaran stok toko** | Setiap toko punya kapasitas simpan dan perkiraan laku per hari. Sistem memperkirakan stok berjalan dan menandai antaran ke toko yang seharusnya masih penuh. | Toko asli dicatat berlebih — persis kasus "toko masih punya stok" | Perkiraan awal bisa meleset (bos bisa menyetel) |
| 5 | **Konfirmasi pemilik toko** | Tautan konfirmasi mingguan lewat WhatsApp ("minggu ini tercatat 12 galon, benar?"), ditambah cek acak harian 3 toko yang bisa dikirim bos dengan satu ketukan. | Semua jenis catatan palsu | Kurir berkolusi dengan toko (jarang, karena toko tidak diuntungkan) |
| 6 | **Rasio toko:rumah** | Porsi toko per kurir per hari dibandingkan dengan garis dasar dari hari-hari yang terverifikasi. | Pola umum yang janggal, misalnya 90% toko | Butuh beberapa hari data terverifikasi |
| 7 | **Setoran dihitung sistem** | Uang yang harus disetor = penjualan terverifikasi × harga yang berlaku. Galon isi yang dibawa pulang dan galon kosong dihitung saat kurir kembali. | Galon terjual yang tidak dicatat, selisih uang | — |
| 8 | **Lompatan lokasi mustahil** | Jarak dan waktu antar-pencatatan berurutan diperiksa. Perpindahan yang terlalu cepat untuk motor ditandai. | GPS palsu, pencatatan borongan di satu tempat | — |

## Contoh yang dilihat bos di Radar Kecurangan

> **Rudi — Selasa, 15 Sep** · risiko **tinggi**
> - 36 dari 40 galon dicatat sebagai toko (90%). Rata-rata hari terverifikasi: 45%.
> - 21 penjualan toko tanpa scan QR → dihitung harga rumah.
> - Toko Sumber Rejeki menerima 6 galon, padahal perkiraan stoknya masih 9 dari kapasitas 10.
> - QR Toko Maju dipindai 1,2 km dari lokasi toko.
>
> **Perkiraan selisih hari ini: Rp21.000.** [Kirim cek ke 3 toko] [Tandai sudah dicek]

## Yang sengaja tidak dilakukan

- **Tidak melacak lokasi kurir sepanjang hari.** Lokasi hanya diambil saat kurir mencatat
  penjualan. Lebih hemat baterai, tidak terasa memata-matai, dan kurir diberi tahu sejak
  awal kapan lokasinya dipakai.
- **Tidak memakai perangkat tambahan** (RFID, timbangan, GPS tracker). Mahal untuk usaha
  kecil, jadi cukup HP kurir dan stiker kertas.
- **Tidak ada sanksi otomatis.** Keputusan tetap di tangan bos.

## Cara membuktikannya di depot keluarga

1. **Sebelum:** kumpulkan catatan kurir 7 hari terakhir (rasio toko:rumah dan total setoran).
2. **Pasang:** daftarkan toko-toko di rute beserta titik lokasinya, lalu tempel stiker QR.
3. **Pakai 3 hari:** kurir mencatat lewat AQUAIR.
4. **Bandingkan:** rasio toko:rumah dan setoran per hari, sebelum dan sesudah.
5. **Laporkan hanya angka nyata** di deskripsi lomba. Angka dari tabel ilustrasi di atas
   tidak boleh dipakai sebagai hasil.
