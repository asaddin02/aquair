# Mencoba AQUAIR di laptop

Aplikasi lengkap (landing, aplikasi bos, aplikasi kurir) berjalan di laptop dengan data tersimpan
di database lokal. Lakukan ini sebelum kode diserahkan ke Emergent.

## Menyalakan dan mematikan

Buka Terminal di folder `AQUAIR`, lalu jalankan:

```bash
bash scripts/jalankan-lokal.sh
```

Setelah muncul tulisan **AQUAIR siap**, buka alamat yang tertera:
- **Di laptop:** `http://localhost:8710`
- **Di HP:** alamat `http://192.168.x.x:8710` yang tertera. HP harus tersambung ke Wi-Fi yang sama dengan laptop.

Untuk mematikan: `bash scripts/jalankan-lokal.sh --henti`.

Data tetap tersimpan walau aplikasi dimatikan. Depot contoh terhapus sendiri 24 jam setelah dibuat.

## Yang bisa dicoba

Centang yang sudah berjalan sesuai harapan.

**Depot contoh (sama dengan yang dicoba juri)**
- [ ] Halaman depan → **Coba sebagai Kurir** → langsung masuk ke rit Rudi.
- [ ] Jual ke rumah → hasilnya harga rumah Rp4.000.
- [ ] Jual ke toko → pilih toko → "Di lokasi toko" → **Terverifikasi — harga toko**.
- [ ] Jual ke toko → "1,2 km dari toko" → **Tidak terverifikasi — dihitung harga rumah** → Minta bos setujui.
- [ ] Toko tanpa QR → dihitung harga rumah.
- [ ] Ajukan koreksi pada satu penjualan.
- [ ] Selesai rit & setor → isi uang kurang Rp3.000 → Kirim.
- [ ] Bilah kuning atas → **Lihat sebagai: Bos** → dasbor menampilkan Tagihan kembali dan Perkiraan bocor.
- [ ] Radar Kecurangan → tanda R6 kurang setor muncul untuk Rudi hari ini.
- [ ] Persetujuan → setujui harga toko (wajib isi alasan) → tanda R2/R4 penjualan itu hilang.
- [ ] Rit & setoran → Rudi → peta titik penjualan dan tombol Setoran diterima.
- [ ] Konfirmasi toko → Kirim lewat WhatsApp → Buka halaman toko → jawab "Tidak" → tanda R8 muncul di Radar.
- [ ] Stiker QR, Bon, Galon di luar, Perawatan mesin, Kepatuhan, Unduh data, Pengaturan.

**Depot sungguhan (persiapan uji coba di depot keluarga)**
- [ ] **Daftarkan depot** dengan email kamu.
- [ ] Menu Kurir → Tambah kurir → catat PIN yang muncul (hanya tampil sekali).
- [ ] Menu Pelanggan → tambah satu toko dan satu rumah.
- [ ] Buka jendela Incognito → Masuk → tab Kurir → nomor HP + PIN → Mulai rit.
- [ ] Kembali ke bos → Rit & setoran → **Muatan cocok**.
- [ ] Masukkan PIN salah 5 kali → akun terkunci 15 menit.
- [ ] Unduh data → Penjualan → buka di Google Sheets → kolom rapi.

## Batasan saat dicoba di laptop

- **Kamera (scan QR asli) dan GPS asli belum bisa dicoba di HP.** Browser HP hanya mengizinkan keduanya
  lewat alamat HTTPS, dan alamat lokal ini masih HTTP. Keduanya berjalan setelah aplikasi di-deploy
  di Emergent. Depot contoh tidak butuh kamera maupun GPS, jadi bisa dicoba penuh.
- **Pasang ke layar utama HP** juga butuh HTTPS. Di laptop, Chrome sudah bisa memasangnya dari alamat
  `localhost`.
- **Ringkasan AI** menampilkan "Ringkasan belum tersedia". Fitur ini ditambahkan Emergent.
- Kalau HP tidak bisa membuka alamat laptop, kemungkinan firewall laptop memblokir port 8710.

## Kalau ada yang tidak sesuai

Tulis ke Claude: layar mana, apa yang ditekan, apa yang muncul, dan apa yang seharusnya. Claude
memperbaiki, menjalankan ulang tes, lalu kamu coba lagi. Setelah semuanya sesuai, kode diunggah ke
GitHub dan diserahkan ke Emergent dengan [prompts/impor-dan-deploy.md](../prompts/impor-dan-deploy.md).
