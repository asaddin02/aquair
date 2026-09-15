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
- **Mode demo:** di landing ada tombol "Coba sebagai Bos" dan "Coba sebagai Kurir", yang
  masuk ke depot contoh tanpa kata sandi (lihat bagian 10).

## 3. Alur rit kurir [T1]

Satu **rit** = satu kali kurir berangkat membawa galon sampai kembali ke depot. Setiap
kurir hanya boleh punya satu rit aktif.

### 3.1 Mulai rit
Kurir atau bos mengisi **jumlah galon isi yang dibawa** (misalnya 40). Server mencatat jam
berangkat.

### 3.2 Catat penjualan di setiap titik

Layar kurir berisi dua tombol besar:

**A. JUAL KE TOKO — scan QR**
1. Kamera terbuka, kurir memindai stiker QR toko.
2. Aplikasi mengambil lokasi (akurasi tinggi, batas tunggu 10 detik).
3. Kurir mengisi **galon isi diserahkan**, **galon kosong diambil**, dan **bayar: tunai / bon**.
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
| Uang seharusnya | Σ (galon × harga yang berlaku), dikurangi penjualan bon |
| **Selisih uang** | disetor − uang seharusnya |

Bos menekan **"Setoran diterima"** setelah menghitung ulang uang dan galon.

## 4. Radar Kecurangan [T1, kecuali R8]

Setiap tanda menyimpan: jenis, penjelasan satu kalimat, **perkiraan selisih Rupiah**, dan
status tindak lanjut (`baru`, `sudah_dicek_aman`, `terbukti`).

| Kode | Aturan (angka default bisa diubah bos) | Perkiraan Rupiah |
|---|---|---|
| **R1** rasio toko tinggi | Porsi galon toko per kurir per hari − garis dasar ≥ 25 poin persen. Garis dasar = median porsi toko pada hari-hari dalam 14 hari terakhir yang ≥ 80% penjualan tokonya terverifikasi. Kalau belum ada hari seperti itu, pakai setelan bos (default 50%). | galon toko di atas garis dasar × selisih harga |
| **R2** toko tanpa bukti | Ada penjualan toko yang tidak `terverifikasi` | galon × selisih harga |
| **R3** stok toko tidak wajar | Perkiraan stok toko **sesudah diantar** melebihi kapasitasnya. Rumus harian: `stok_hari_ini = max(0, stok_kemarin − laku_per_hari) + galon_diantar_hari_ini`, dengan stok awal 0 saat toko didaftarkan. Kapasitas dan laku per hari diisi bos. | (stok_hari_ini − kapasitas) × selisih harga |
| **R4** QR dipindai jauh | QR sah tetapi jarak > radius. Kemungkinan QR difoto. | galon × selisih harga |
| **R5** lompatan lokasi | Dua pencatatan berurutan berjarak > 300 m dengan kecepatan tempuh > 60 km/jam | — |
| **R6** selisih setoran | Uang disetor < uang seharusnya | besar selisih |
| **R7** selisih galon | Galon terjual menurut stok ≠ menurut catatan | selisih galon × harga rumah |
| **R8** konfirmasi ditolak **[T2]** | Pemilik toko menjawab jumlah yang berbeda dari catatan | beda galon × selisih harga |

**Tingkat risiko per kurir per hari:**
- **Tinggi:** ada R1, R3, R4, R6, atau R8, atau total perkiraan selisih ≥ Rp15.000.
- **Sedang:** ada R2, R5, atau R7.
- **Rendah:** tidak ada tanda.

## 5. Dasbor bos [T1]

- **Hari ini:**
  - galon terjual (toko / rumah),
  - uang seharusnya vs disetor,
  - total perkiraan selisih,
  - jumlah tanda baru.
- **Kartu per kurir:**
  - porsi toko,
  - persentase penjualan toko terverifikasi,
  - perkiraan selisih,
  - tingkat risiko, dengan tombol "Lihat rit".
- **Tagihan kembali bulan ini:** total (galon toko tanpa bukti × selisih harga) yang
  ditagih dengan harga rumah. Ini angka dampak utama AQUAIR.
- **Tren 30 hari:** grafik porsi toko per kurir.
- **Detail rit:** daftar penjualan berurutan (jam, pelanggan, jenis, galon, status
  verifikasi, jarak ke titik), perhitungan setoran, dan tanda-tanda Radar.

## 6. Kelola data (bos) [T1]

- **Pelanggan:**
  - nama, jenis (toko/rumah), nomor WA (opsional), titik lokasi,
  - titik lokasi diambil dengan tombol "Pakai lokasi saya sekarang" saat berdiri di
    pelanggan, atau diketik manual,
  - khusus toko: **kapasitas simpan (galon)** dan **perkiraan laku per hari**.
- **Stiker QR:**
  - halaman cetak A4 berisi QR, nama toko, dan tulisan "Tempel di dalam toko".
  - Tombol **"Ganti QR"** membuat token baru, dan token lama langsung tidak berlaku.
- **Persetujuan:** daftar pelanggan baru dari kurir, dan penjualan toko tidak terverifikasi
  yang diajukan untuk harga toko.
- **Kurir:** nama, nomor HP, PIN, aktif/nonaktif.
- **Pengaturan:**
  - harga toko (default Rp3.000) dan harga rumah (default Rp4.000),
  - radius verifikasi (default 75 m),
  - garis dasar porsi toko (default 50%),
  - sakelar "Toko tanpa bukti dihitung harga rumah" (default menyala).

## 7. Tahap 2 — bukti dari pelanggan dan galon pinjaman

- **Konfirmasi pemilik toko (R8):**
  - Setiap Senin sistem menyiapkan tautan unik per toko (token bertanda tangan, berlaku
    7 hari).
  - Halaman tanpa login: "Minggu 8–14 Sep tercatat **12 galon** diantar ke Toko X. Benar?"
    dengan pilihan [Ya, benar] atau [Tidak, yang benar ___ galon].
  - Bos mengirim tautan itu lewat tombol `wa.me` dengan pesan yang sudah terisi.
- **Cek acak harian:** tombol "Cek 3 toko hari ini" memilih acak 3 penjualan toko hari itu
  (utamakan yang bertanda Radar), lalu membuka `wa.me` ke nomor tokonya dengan pertanyaan
  jumlah galon.
- **Galon pinjaman:**
  - Setiap pelanggan punya saldo galon milik depot:
    `+ (galon isi diserahkan − galon kosong diambil)` di setiap penjualan.
  - Laporan "Galon di luar": total galon, per pelanggan, dan pelanggan yang saldonya tidak
    berkurang selama > 14 hari.
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
  - server mengirim angka jadi (hasil hitungan bagian 3–5) sebagai data terstruktur,
  - model hanya menyusun maksimal 5 kalimat dalam Bahasa Indonesia sederhana,
  - **model dilarang menyebut angka yang tidak ada di data**,
  - tampil di atas dasbor bos.
- **Pemasangan di HP:** manifest PWA, ikon AQUAIR, dan tombol "Pasang aplikasi" untuk kurir
  dan bos.

## 9. Data (koleksi MongoDB)

| Koleksi | Isi utama |
|---|---|
| `depots` | nama, harga_toko, harga_rumah, radius_m, garis_dasar_toko, kebijakan_tanpa_bukti, is_demo |
| `users` | depot_id, peran (`bos`/`kurir`), nama, email atau no_hp, hash kata sandi atau PIN, aktif |
| `customers` | depot_id, jenis, nama, no_wa, lat, lng, kapasitas, laku_per_hari, qr_token_hash, status (`aktif`/`menunggu_persetujuan`), saldo_galon **[T2]** |
| `trips` | depot_id, kurir_id, dibawa, isi_pulang, kosong_pulang, uang_disetor, uang_seharusnya, selisih_uang, selisih_galon, status (`aktif`/`selesai`/`diterima`), berangkat_at, selesai_at |
| `sales` | depot_id, trip_id, kurir_id, customer_id, jenis, galon_isi, galon_kosong, bayar, harga_berlaku, status_verifikasi, lat, lng, akurasi_m, jarak_m, qr_dipindai, dicatat_offline, disetujui_bos, created_at |
| `flags` | depot_id, kurir_id, trip_id, sale_id, customer_id, kode, penjelasan, perkiraan_rupiah, tanggal, status |
| `confirmations` **[T2]** | depot_id, customer_id, periode, galon_tercatat, jawaban, galon_menurut_toko, token_hash, dijawab_at |
| `maintenance` / `compliance` **[T3]** | komponen atau dokumen, tanggal_terakhir, interval_hari, berlaku_sampai |
| `audit_log` | depot_id, user_id, aksi, sebelum, sesudah, alasan, created_at |

## 10. Mode demo (wajib, untuk juri) [T1]

- **Depot contoh fiktif "Depot Tirta Sejahtera"** dengan label jelas "Data contoh".
- **Dua kurir:**
  - **Dimas** — pola jujur, porsi toko sekitar 45%, hampir semua terverifikasi.
  - **Rudi** — 20 hari pertama berpola 36 toko : 4 rumah dengan banyak klaim tanpa QR, QR
    dipindai jauh, dan toko melebihi kapasitas. 10 hari terakhir porsi tokonya turun
    mendekati 45% (simulasi setelah AQUAIR dipakai).
- **Pelanggan:** 20 toko dan 60 rumah dengan titik lokasi di sekitar satu kelurahan fiktif.
  Setiap toko punya kapasitas 8–15 galon dan laku 1–4 galon per hari.
- **Riwayat 30 hari** sampai **hari ini**. Tanggalnya dihitung relatif terhadap tanggal
  sekarang, jadi dasbor tidak pernah kosong.
- **Kurir demo:** tombol "Simulasi scan QR toko" (memilih toko dari daftar) dan "Simulasi
  berada di lokasi toko", supaya juri bisa mencoba alur tanpa berada di toko. Keduanya
  hanya muncul di depot demo.
- **Tombol "Atur ulang data demo"** hanya berlaku untuk depot demo.
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
