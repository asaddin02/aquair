# Spesifikasi produk AQUAIR

Dokumen ini dilampirkan ke Emergent bersama prompt tiap tahap. Bagian yang ditandai
**[T1]**, **[T2]**, dan **[T3]** menunjukkan tahap pembangunannya.

## 1. Batasan teknis

| Bagian | Pilihan |
|---|---|
| Frontend | React, mobile-first. Layar kurir dipakai di HP murah di bawah terik matahari. |
| Backend | FastAPI (Python) |
| Database | MongoDB |
| Deploy | Emergent. Tidak memakai Docker, VPS, atau server lain. |
| Lokasi | `navigator.geolocation` di browser (Emergent sudah HTTPS) |
| Scan QR | Library JavaScript `html5-qrcode` |
| Buat QR | Library `qrcode` (Python atau JavaScript) |
| Peta | Leaflet + tile OpenStreetMap, tanpa API key **[T2]** |
| AI | Universal Key Emergent **[T3]** |
| WhatsApp | Tautan `wa.me` yang dikirim dari HP bos. Tanpa API berbayar. |

Aturan umum:
- Uang disimpan sebagai integer Rupiah dan ditampilkan `Rp4.000`.
- Waktu memakai zona Asia/Jakarta, dan **cap waktu selalu dari server**, bukan dari HP.
  "Hari" berarti tanggal kalender WIB dari cap waktu server.
- Seluruh teks antarmuka dalam Bahasa Indonesia sederhana.

## 2. Peran

| Peran | Masuk dengan | Bisa apa |
|---|---|---|
| **Bos** (pemilik depot) | Email + kata sandi | Semua: dasbor, Radar Kecurangan, pelanggan, kurir, harga, setoran, persetujuan |
| **Kurir** | Nomor HP + PIN 6 digit | Mulai rit, catat penjualan, selesai rit. Hanya melihat rit miliknya sendiri. |
| **Pemilik toko** | Tanpa akun, lewat tautan unik | Mengonfirmasi jumlah galon yang diterima **[T2]** |

Aturan akses:
- **Banyak depot dalam satu aplikasi.** Setiap data punya `depot_id`, dan **setiap query di
  backend wajib disaring `depot_id` milik pengguna yang masuk**. Pendaftaran baru membuat
  satu depot beserta akun bosnya.
- **Setiap endpoint yang menerima ID** (rit, penjualan, pelanggan, tanda) wajib memeriksa
  bahwa data itu milik depot pengguna. Kalau bukan, jawab 404.
- **Batas coba masuk:** 5 kali salah PIN atau kata sandi untuk akun yang sama membuat akun
  itu dikunci 15 menit.
- **Mode demo:** di landing ada tombol "Coba sebagai Bos" dan "Coba sebagai Kurir". Setiap
  pengunjung masuk ke depot contoh **miliknya sendiri** tanpa kata sandi (lihat bagian 10).

## 3. Alur rit kurir [T1]

Satu **rit** = satu kali kurir berangkat membawa galon sampai kembali ke depot. Setiap
kurir hanya boleh punya satu rit aktif.

### 3.1 Mulai rit
- Kurir mengisi **jumlah galon isi yang dibawa** (misalnya 40). Server mencatat jam
  berangkat.
- **Bos mengecek muatan** lalu menekan "Muatan cocok", atau membetulkan angkanya.
  Perubahannya tercatat di `audit_log`.
- Rit tetap bisa berjalan sebelum dicek, tetapi tampil di dasbor dengan label **"Muatan
  belum dicek"**.
- Alasannya: kalau hanya kurir yang menulis jumlah muatan, ia bisa menulis 40 padahal
  membawa 45, lalu menjual 5 galon tanpa catatan tanpa terdeteksi di hitungan selisih galon.

### 3.2 Catat penjualan di setiap titik

Layar kurir berisi dua tombol besar:

**A. JUAL KE TOKO — scan QR**
1. Kamera terbuka, kurir memindai stiker QR toko.
2. Aplikasi mengambil lokasi (akurasi tinggi, batas tunggu 10 detik). Ada tombol **"Ambil
   ulang lokasi"** bila akurasinya masih buruk.
3. Kurir mengisi **galon isi diserahkan**, **galon kosong diambil**, dan **bayar: tunai /
   bon**. Pilihan bon hanya muncul untuk pelanggan yang diizinkan bos.
4. Kurir menekan Simpan. Server menentukan status verifikasi:

| Status | Syarat | Harga yang berlaku |
|---|---|---|
| `terverifikasi` | QR sah **dan** jarak ke titik toko ≤ radius (default 75 m) **dan** akurasi lokasi ≤ 100 m | Harga toko |
| `lokasi_jauh` | QR sah tetapi jarak > radius | Harga rumah |
| `lokasi_lemah` | Lokasi tidak didapat atau akurasi > 100 m | Harga rumah |
| `tanpa_qr` | Kurir memilih "Toko tanpa QR" dari daftar (misalnya stiker rusak) | Harga rumah |

Penjualan yang tidak `terverifikasi` bisa **disetujui bos** (dengan alasan), dan sesudah itu
berlaku harga toko.

**B. JUAL KE RUMAH**
1. Kurir memilih pelanggan rumah (diurutkan dari yang terdekat), atau "Pembeli baru" dengan
   nama dan nomor HP opsional.
2. Lokasi diambil seadanya, tanpa syarat.
3. Kurir mengisi galon isi, galon kosong, dan cara bayar, lalu menyimpan dengan harga rumah.
   Pembeli baru selalu tunai.

**Aturan integritas:**
- Kurir **tidak bisa mengubah atau menghapus** penjualan yang sudah tersimpan. Yang bisa
  dilakukan hanya "Ajukan koreksi" dengan alasan, lalu bos menyetujui atau menolak.
  Semuanya tercatat di `audit_log`.
- **Pelanggan baru dari kurir selalu berjenis rumah.** Hanya bos yang bisa mengubahnya
  menjadi toko.
- **Tanpa sinyal [T1]:** tampilkan pesan jelas "Belum tersimpan — tidak ada sinyal" dengan
  tombol coba lagi. Data yang gagal tersimpan tidak boleh tampak seolah berhasil.
- **Antrean offline [T2]:** penjualan disimpan di HP beserta lokasi dan waktu HP, lalu
  dikirim saat sinyal kembali dan diberi tanda `dicatat_offline`.

### 3.3 Selesai rit dan setor

Kurir mengisi **galon isi dibawa pulang**, **galon kosong dibawa pulang**, dan **uang tunai
disetor**. Server lalu menghitung:

| Hitungan | Rumus |
|---|---|
| Galon terjual menurut stok | dibawa − isi dibawa pulang |
| Galon terjual menurut catatan | jumlah galon isi dari semua penjualan rit ini |
| **Selisih galon** | stok − catatan (seharusnya 0) |
| Uang seharusnya | Σ (galon × harga yang berlaku) dari penjualan **tunai** |
| **Selisih uang** | disetor − uang seharusnya |

Bos menekan **"Setoran diterima"** setelah menghitung ulang uang dan galon.

**Bon:** setiap penjualan bon masuk daftar **"Bon belum lunas"** milik bos, dan bos menekan
"Lunas" saat uangnya diterima. Alasannya: kalau bon bebas dipilih dan tidak ditagih, kurir
bisa menulis penjualan tunai sebagai bon lalu mengantongi uangnya.

## 4. Radar Kecurangan [T1, kecuali R8]

Radar menunjukkan kejanggalan. Radar tidak menghukum; bos yang memutuskan.

Setiap tanda menyimpan: kode, penjelasan satu kalimat, perkiraan Rupiah, angka tujuannya
(lihat 4.1), dan status tindak lanjut (`baru`, `sudah_dicek_aman`, `terbukti`).

Tanda untuk satu hari dihitung ulang setiap ada penjualan baru, rit selesai, persetujuan
bos, atau setelan berubah. **Status tindak lanjut yang sudah diisi bos tidak boleh hilang
saat dihitung ulang.**

### 4.1 Dua angka Rupiah — tampilkan terpisah, jangan dijumlahkan

| Angka | Arti untuk bos | Sumber |
|---|---|---|
| **Tagihan kembali** | Uang yang diamankan aturan "toko tanpa bukti dihitung harga rumah". Tanpa AQUAIR, uang ini hilang tanpa terlihat. | R2 (termasuk penjualan yang juga bertanda R4) |
| **Perkiraan bocor** | Uang yang mungkin masih hilang walau aturan harga sudah berjalan | R1, R3, R6, R7, R8 |

- **Satu galon hanya dihitung sekali.** Penjualan yang bertanda R2 dan R4 sekaligus hanya
  dihitung satu kali.
- Kalau bos mematikan sakelar "Toko tanpa bukti dihitung harga rumah", penjualan itu tetap
  dihargai harga toko, jadi Rupiah R2/R4-nya masuk **Perkiraan bocor**.
- Penjualan yang disetujui bos untuk harga toko bernilai Rp0, dan tandanya otomatis
  berstatus `sudah_dicek_aman`.
- **Selisih harga** = harga rumah − harga toko (default Rp1.000).

### 4.2 Aturan

| Kode | Aturan (angka default bisa diubah bos) | Perkiraan Rupiah | Masuk ke |
|---|---|---|---|
| **R1** rasio toko tinggi | **Porsi toko** = galon yang dicatat sebagai toko (semua status) ÷ semua galon terjual kurir itu hari itu. Hanya dihitung bila kurir menjual ≥ 10 galon. Tanda muncul bila porsi − garis dasar ≥ 25 poin persen. **Garis dasar** = median porsi toko dari hari-kurir milik **semua kurir di depot** dalam 14 hari sebelumnya yang ≥ 80% galon tokonya terverifikasi. Kalau belum ada, pakai setelan bos (default 50%). | max(0, galon toko terverifikasi − garis dasar × semua galon) × selisih harga. Sering Rp0; tandanya tetap berguna sebagai sinyal. | Perkiraan bocor |
| **R2** toko tanpa bukti | Penjualan toko yang tidak `terverifikasi` dan belum disetujui bos | galon × selisih harga | Tagihan kembali |
| **R3** stok toko tidak wajar | Per toko per hari: `stok_hitung = max(0, stok_kemarin − laku_per_hari) + galon_diantar_hari_ini`. **Galon diantar hanya dari penjualan yang dihargai harga toko** (terverifikasi atau disetujui bos), supaya klaim tanpa bukti dari satu kurir tidak membuat kurir lain ikut ditandai. Tanda muncul bila `stok_hitung` > kapasitas. Stok yang dibawa ke esok hari = `min(stok_hitung, kapasitas)`, supaya kelebihan yang sama tidak ditandai lagi. Stok awal 0 saat toko didaftarkan. Kapasitas dan laku per hari diisi bos. | (stok_hitung − kapasitas) × selisih harga | Perkiraan bocor |
| **R4** QR dipindai jauh | Status `lokasi_jauh`. Kemungkinan QR difoto. | Sudah dihitung di R2, tidak ditambah lagi | Tagihan kembali |
| **R5** lompatan lokasi | Dua pencatatan berurutan dalam satu rit berjarak > 300 m dengan kecepatan tempuh > 60 km/jam | — | — |
| **R6** kurang setor | Uang disetor < uang seharusnya | Besar kekurangan | Perkiraan bocor |
| **R7** selisih galon | Galon terjual menurut stok ≠ menurut catatan | Bila stok > catatan: selisih galon × harga rumah. Bila catatan > stok: Rp0 (tanda tetap muncul). | Perkiraan bocor |
| **R8** konfirmasi berbeda **[T2]** | Pemilik toko menjawab jumlah yang berbeda dari catatan | Bila toko menjawab lebih sedikit: beda galon yang dihargai harga toko × selisih harga, dikurangi Rupiah R3 toko itu pada minggu yang sama (minimal Rp0). Bila lebih banyak: Rp0. | Perkiraan bocor |

### 4.3 Tingkat risiko per kurir per hari

Tanda berstatus `sudah_dicek_aman` tidak ikut dihitung.

- **Tinggi:** ada R1, R3, R4, R6, atau R8, atau perkiraan bocor hari itu ≥ Rp15.000.
- **Sedang:** ada R2, R5, atau R7.
- **Rendah:** tidak ada tanda.

### 4.4 Contoh hitungan — jadikan tes otomatis

Setelan: harga toko Rp3.000, harga rumah Rp4.000, sakelar harga rumah menyala, garis dasar
depot 45%.

Rit Rudi: membawa 40 galon (muatan sudah dicek), pulang 0 galon isi, semua tunai.
- 4 galon ke rumah.
- 36 galon ke toko: 15 galon `terverifikasi`, 18 galon `tanpa_qr`, 3 galon `lokasi_jauh`.
- Salah satu penjualan terverifikasi: 6 galon ke Toko Sumber Rejeki (kapasitas 10, laku 2
  per hari, stok kemarin 9). Tidak ada antaran lain ke toko itu hari ini, dan toko lain
  tidak melebihi kapasitas.

| Hitungan | Hasil |
|---|---|
| Uang seharusnya | 15 × 3.000 + 21 × 4.000 + 4 × 4.000 = **Rp145.000** |
| R1 | Porsi toko 36/40 = 90%. 90 − 45 = 45 poin → tanda. Rupiah: max(0, 15 − 0,45 × 40) = max(0, 15 − 18) → **Rp0** |
| R2 | 21 galon × Rp1.000 = **Rp21.000** → Tagihan kembali |
| R4 | 3 galon, sudah termasuk di R2 → tidak ditambah |
| R3 | max(0, 9 − 2) + 6 = 13 > 10 → 3 galon × Rp1.000 = **Rp3.000**. Stok esok hari mulai dari 10. |
| R7 | Stok 40 − 0 = 40, catatan 40 → tidak ada tanda |
| **Kasus A:** disetor Rp145.000 | Tidak ada R6. Tagihan kembali **Rp21.000**, perkiraan bocor **Rp3.000**, risiko **tinggi** (R1, R3, R4). |
| **Kasus B:** disetor Rp124.000 (sesuai catatan kurir: 36 × 3.000 + 4 × 4.000) | R6 Rp21.000. Tagihan kembali **Rp21.000**, perkiraan bocor **Rp24.000**, risiko **tinggi**. |

## 5. Dasbor bos [T1]

Semua ringkasan memakai **30 hari terakhir yang bergulir**, bukan "bulan ini", supaya
angkanya tidak kosong di awal bulan.

- **Angka utama (30 hari):** kartu **Tagihan kembali** dan kartu **Perkiraan bocor**,
  terpisah, masing-masing dengan penjelasan satu kalimat. Tagihan kembali adalah angka
  dampak utama AQUAIR.
- **Hari ini:**
  - galon terjual (toko / rumah),
  - uang seharusnya vs disetor,
  - tagihan kembali dan perkiraan bocor hari ini,
  - jumlah tanda baru,
  - rit dengan muatan belum dicek.
- **Kartu per kurir:**
  - porsi toko dan persentase galon toko terverifikasi (hari ini dan 30 hari),
  - tagihan kembali dan perkiraan bocor 30 hari,
  - jumlah hari berisiko tinggi dalam 30 hari,
  - tingkat risiko hari ini, dengan tombol "Lihat rit".
- **Radar Kecurangan:** tanda dikelompokkan per kurir per hari, dengan filter Hari ini /
  7 hari / 30 hari (default 30 hari), terbaru di atas.
- **Tren 30 hari:** grafik garis porsi toko per kurir, beserta garis dasar.
- **Detail rit:** daftar penjualan berurutan (jam, pelanggan, jenis, galon, status
  verifikasi, jarak ke titik), perhitungan setoran, dan tanda-tanda Radar.

Contoh satu kelompok di Radar:

> **Rudi — Selasa, 25 Agu** · risiko **tinggi**
> - 36 dari 40 galon dicatat sebagai toko (90%). Garis dasar depot: 45%.
> - 21 galon toko tanpa bukti → dihitung harga rumah. Tagihan kembali Rp21.000.
> - Toko Sumber Rejeki menerima 6 galon, padahal perkiraan stoknya masih 7 dari kapasitas
>   10. Perkiraan bocor Rp3.000.
> - QR Toko Maju dipindai 1,2 km dari lokasi toko.
>
> [Sudah dicek — aman] [Terbukti]

## 6. Kelola data (bos) [T1]

- **Pelanggan:**
  - nama, jenis (toko/rumah), nomor WA (opsional), titik lokasi,
  - titik lokasi diambil dengan tombol "Pakai lokasi saya sekarang" saat berdiri di
    pelanggan, atau diketik manual,
  - khusus toko: **kapasitas simpan (galon)** dan **perkiraan laku per hari**,
  - sakelar **"Boleh bon"** (default mati).
- **Stiker QR:**
  - halaman cetak A4 berisi QR, nama toko, dan tulisan "Tempel di dalam toko".
  - Isi QR adalah token acak panjang yang disimpan di `customers.qr_token`, supaya stiker
    bisa dicetak ulang.
  - **Token hanya dikirim ke layar bos.** Endpoint kurir tidak pernah mengembalikan token
    (satu-satunya pengecualian: depot demo, bagian 10). Kalau token sampai ke HP kurir,
    kurir bisa "memindai" toko tanpa datang ke sana.
  - Tombol **"Ganti QR"** membuat token baru, dan token lama langsung tidak berlaku.
- **Persetujuan:** pelanggan baru dari kurir, penjualan toko tidak terverifikasi yang
  diajukan untuk harga toko, dan pengajuan koreksi.
- **Bon belum lunas:** daftar per pelanggan, dengan tombol "Lunas".
- **Kurir:** nama, nomor HP, PIN, aktif/nonaktif.
- **Pengaturan:**
  - harga toko (default Rp3.000) dan harga rumah (default Rp4.000),
  - radius verifikasi (default 75 m),
  - garis dasar porsi toko (default 50%),
  - sakelar "Toko tanpa bukti dihitung harga rumah" (default menyala),
  - perubahan harga, radius, dan sakelar berlaku untuk **penjualan berikutnya**. Penjualan
    yang sudah tersimpan tetap memakai `harga_berlaku`-nya. Setiap perubahan dicatat di
    `audit_log`.
- **Unduh data (CSV):**
  - Hanya bos. Pilih jenis data dan rentang tanggal (default 30 hari terakhir), lalu unduh
    satu berkas CSV.
  - Jenis data: **penjualan** (satu baris per penjualan), **rit & setoran** (satu baris per
    rit), **tanda Radar** (satu baris per tanda), dan **log audit**.
  - Format supaya langsung rapi di Excel dan Google Sheets berbahasa Indonesia: UTF-8 dengan
    BOM, pemisah titik koma (`;`), waktu `YYYY-MM-DD HH:MM` WIB, dan uang sebagai bilangan
    bulat tanpa "Rp" dan tanpa titik ribuan.
  - Nama berkas: `aquair-<jenis>-<tanggal-awal>_<tanggal-akhir>.csv`.
  - Isinya hanya data depot bos yang masuk (disaring `depot_id`).
  - Sel teks (nama, alasan, penjelasan) yang diawali `=`, `+`, `-`, atau `@` diberi awalan
    `'`, supaya nama yang diketik kurir tidak dijalankan sebagai rumus di Excel.
  - Setiap unduhan dicatat di `audit_log`.
  - Alasannya: catatan uji coba di depot sungguhan adalah bukti dampak bisnis, jadi bos
    perlu salinan di luar aplikasi.

## 7. Tahap 2 — bukti dari pelanggan dan galon pinjaman

- **Konfirmasi pemilik toko (R8):**
  - Setiap Senin sistem menyiapkan tautan unik per toko (token acak yang di-hash di
    database, berlaku 7 hari).
  - Halaman tanpa login: "Minggu 8–14 Sep tercatat **12 galon** diantar ke Toko X. Benar?"
    dengan pilihan [Ya, benar] atau [Tidak, yang benar ___ galon].
  - Bos mengirim tautan itu lewat tombol `wa.me` dengan pesan yang sudah terisi.
- **Cek acak harian:** tombol "Cek 3 toko hari ini" memilih acak 3 penjualan toko hari itu
  (utamakan yang bertanda Radar), lalu membuka `wa.me` ke nomor tokonya dengan pertanyaan
  jumlah galon.
- **Di depot demo, tombol WhatsApp hanya menampilkan pratinjau pesan** dan tidak membuka
  `wa.me`, karena nomor contoh bisa saja milik orang sungguhan.
- **Galon pinjaman:**
  - Setiap pelanggan punya saldo galon milik depot:
    `+ (galon isi diserahkan − galon kosong diambil)` di setiap penjualan.
  - Laporan "Galon di luar": total galon, per pelanggan, dan pelanggan dengan saldo > 0
    yang **tidak mengembalikan satu pun galon kosong selama > 14 hari**. Ukurannya bukan
    "saldo tidak berkurang", karena pelanggan yang rutin menukar 2 galon isi dengan 2 galon
    kosong saldonya memang tetap.
- **Peta rit:** Leaflet menampilkan titik penjualan per rit dengan warna status verifikasi,
  plus titik toko.
- **Antrean offline** (lihat 3.2).

## 8. Tahap 3 — perawatan, kepatuhan, AI, dan pemasangan

- **Perawatan mesin:**
  - daftar komponen dengan tanggal ganti terakhir dan interval default: sedimen 90 hari,
    karbon 180 hari, mangan 300 hari, lampu UV 365 hari, membran RO 540 hari,
  - pengingat H-7 di dasbor, dan tombol "Sudah diganti hari ini".
- **Kepatuhan:**
  - tanggal uji lab kualitas air terakhir dan berikutnya (interval diisi bos sesuai dinas
    kesehatan setempat),
  - masa berlaku SLHS, NIB,
  - daftar periksa "Tidak memakai galon dan tutup bermerek" (aturan Kemendag 2026).
- **Ringkasan AI harian** memakai Universal Key Emergent:
  - server mengirim angka jadi (hasil hitungan bagian 3–5, hari ini dan 30 hari) sebagai
    data terstruktur,
  - model hanya menyusun maksimal 5 kalimat dalam Bahasa Indonesia sederhana,
  - **model dilarang menyebut angka yang tidak ada di data**,
  - tampil di atas dasbor bos,
  - di depot demo, ringkasan dibuat hanya saat tombol ditekan, maksimal 3 kali per depot
    demo, supaya kredit tidak habis oleh pengunjung.
- **Pemasangan di HP:** manifest PWA, ikon AQUAIR, dan tombol "Pasang aplikasi" untuk kurir
  dan bos.

## 9. Data (koleksi MongoDB)

| Koleksi | Isi utama |
|---|---|
| `depots` | nama, harga_toko, harga_rumah, radius_m, garis_dasar_toko, kebijakan_tanpa_bukti, is_demo |
| `users` | depot_id, peran (`bos`/`kurir`), nama, email atau no_hp, hash kata sandi atau PIN, aktif, gagal_masuk, dikunci_sampai |
| `customers` | depot_id, jenis, nama, no_wa, lat, lng, kapasitas, laku_per_hari, boleh_bon, qr_token, status (`aktif`/`menunggu_persetujuan`), saldo_galon **[T2]** |
| `trips` | depot_id, kurir_id, dibawa, muatan_dicek, muatan_dicek_oleh, isi_pulang, kosong_pulang, uang_disetor, uang_seharusnya, selisih_uang, selisih_galon, status (`aktif`/`selesai`/`diterima`), berangkat_at, selesai_at |
| `sales` | depot_id, trip_id, kurir_id, customer_id, jenis, galon_isi, galon_kosong, bayar, lunas, harga_berlaku, status_verifikasi, lat, lng, akurasi_m, jarak_m, qr_dipindai, disimulasikan, dicatat_offline, disetujui_bos, created_at |
| `flags` | depot_id, kurir_id, trip_id, sale_id, customer_id, kode, penjelasan, perkiraan_rupiah, masuk_ke (`tagihan_kembali`/`perkiraan_bocor`/kosong), tanggal, status |
| `confirmations` **[T2]** | depot_id, customer_id, periode, galon_tercatat, jawaban, galon_menurut_toko, token_hash, dijawab_at |
| `maintenance` / `compliance` **[T3]** | komponen atau dokumen, tanggal_terakhir, interval_hari, berlaku_sampai |
| `audit_log` | depot_id, user_id, aksi, sebelum, sesudah, alasan, created_at |

**Depot demo:** setiap dokumen milik depot demo punya field `kedaluwarsa_at`, dan setiap
koleksi memakai TTL index pada field itu. Dengan begitu depot demo beserta seluruh isinya
terhapus otomatis.

## 10. Mode demo (wajib, untuk juri) [T1]

### 10.1 Satu depot demo per pengunjung

Juri dan pemberi vote akan mencoba bersamaan. Kalau depot demonya dipakai bersama, satu
orang bisa mengubah harga atau menekan "Atur ulang" saat orang lain sedang mencoba. Karena
itu:
- Tombol "Coba sebagai Bos" dan "Coba sebagai Kurir" **membuat depot demo baru**, atau
  memakai lagi depot demo milik browser itu (ID-nya disimpan di browser). Bos dan Kurir di
  browser yang sama melihat depot yang sama.
- Bilah atas depot demo berisi label **"Data contoh"** dan sakelar **"Lihat sebagai: Bos |
  Kurir"**.
- Depot demo terhapus otomatis **24 jam** sesudah dibuat.
- Maksimal 10 depot demo baru per alamat IP per jam.
- Selama data disiapkan, tampilkan "Menyiapkan depot contoh…". Simpan data sekaligus
  (`insert_many`) supaya cepat.
- Endpoint masuk demo hanya bisa membuat sesi untuk depot `is_demo`, tidak pernah untuk
  depot sungguhan.

### 10.2 Isi depot demo "Depot Tirta Sejahtera"

- **Pelanggan:** 20 toko (kapasitas 8–15 galon, laku 1–4 galon per hari) dan 60 rumah,
  dengan titik lokasi dalam radius 1,5 km dari satu titik pusat kelurahan fiktif. Tiga
  rumah boleh bon. Nomor WA contoh dikosongkan.
- **Rute:** Dimas dan Rudi masing-masing melayani 10 toko yang berbeda.
- **Riwayat 30 hari yang berakhir hari ini**, dihitung saat depot demo dibuat. Jadi
  dasbor tidak pernah kosong atau basi.
- **Tanda Radar dihasilkan oleh mesin Radar yang sama** dari penjualan contoh, bukan
  ditulis langsung. Dengan begitu angka demo selalu sesuai aturan bagian 4.

| Kurir | Hari 1–20 | Hari 21–29 | Hari ini (hari 30) |
|---|---|---|---|
| **Dimas** (jujur) | ±40 galon/hari, porsi toko ±45%, ≥ 95% galon toko terverifikasi, setor pas. Satu hari ada R7 selisih 1 galon berstatus "Sudah dicek — aman" (catatan: galon pecah). | Sama | Rit selesai, menunggu "Setoran diterima" |
| **Rudi** | 40 galon, pola 36 toko : 4 rumah. Galon toko: ±15 terverifikasi, sisanya `tanpa_qr`; setiap 3 hari ada 3 galon `lokasi_jauh`. Sebagian galon terverifikasi ditulis berlebih ke 2–3 toko langganannya sampai melebihi kapasitas (R3). Setor sesuai hitungan sistem, kecuali 4 hari setor sesuai catatannya sendiri (R6). | Porsi toko ±45%, hampir semua terverifikasi, setor pas (simulasi sesudah AQUAIR dipakai) | Rit aktif: muatan 40 (sudah dicek), 12 galon sudah tercatat dengan pola jujur, sisanya untuk dicoba pengunjung |

### 10.3 Layar kurir di depot demo

- **"Coba sebagai Kurir" langsung membuka rit aktif Rudi hari ini.**
- "Jual ke toko" membuka **"Simulasi scan QR toko"**: kurir memilih toko dari daftar, dan
  server menerima token toko itu seperti hasil scan sungguhan. Hanya di depot demo endpoint
  kurir boleh mengirim token QR.
- Setelah memilih toko, kurir memilih posisi: **"Di lokasi toko"** (±10 m, akurasi 15 m)
  atau **"1,2 km dari toko"** (untuk melihat status `lokasi_jauh`).
- Tombol "Toko tanpa QR" tetap tersedia.
- **Depot demo tidak pernah meminta kamera atau lokasi asli perangkat.** Semua lokasi
  disimulasikan; penjualan rumah memakai titik rumah itu ±10 m. Ini mencegah tanda
  lompatan lokasi palsu dan tidak menyimpan lokasi asli pengunjung.
- Penjualan simulasi diberi `disimulasikan: true`. Di depot sungguhan, server menolak
  penjualan simulasi.

### 10.4 Lain-lain

- Tombol **"Atur ulang data demo"** membuat ulang depot demo milik pengunjung itu saja.
- Grafik tren di depot demo diberi keterangan "simulasi data contoh".

## 11. Tampilan

- **Identitas sendiri, jangan meniru merek air kemasan.** Warna utama teal `#0F766E`,
  pendamping biru langit `#0284C7`, peringatan kuning `#D97706`, bahaya merah `#DC2626`,
  latar `#F8FAFC`. Font judul Plus Jakarta Sans, isi Inter.
- **Layar kurir:**
  - dua tombol utama setinggi ≥ 72 px,
  - teks ≥ 18 px, kontras tinggi untuk dibaca di luar ruangan,
  - bisa dipakai satu tangan,
  - ikon selalu disertai tulisan.
- **Layar bos:**
  - angka Rupiah paling menonjol,
  - tanda Radar memakai warna dan label teks (bukan warna saja),
  - nyaman di HP 360 px dan di laptop.
- Memenuhi WCAG 2.2 AA.

## 12. Di luar cakupan

Aplikasi kasir umum, pembayaran online, pemasaran, pelacakan lokasi kurir sepanjang hari,
dan perangkat tambahan (RFID, timbangan).
