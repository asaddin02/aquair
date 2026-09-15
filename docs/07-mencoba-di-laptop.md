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

### Cara login

Buka `http://localhost:8710/masuk`, pilih **Bos** atau **Kurir**, lalu gunakan:

| Akses | Username | Kata sandi |
| --- | --- | --- |
| Pemilik depot | `admin` | `admin` |
| Kurir (Rudi) | `kurir` | `kurir` |

Kedua login membuka depot contoh yang sama pada browser yang sama. Browser lain
mendapat depot contoh sendiri. Tombol **Bos / Kurir** di bilah atas bisa digunakan
untuk berpindah peran. Login ini tersedia untuk demo kontes; pemilik yang
mendaftarkan depot sendiri tetap memakai email dan kurirnya memakai nomor HP + PIN.

### Daftar uji

Centang yang sudah berjalan sesuai harapan.

**Depot contoh**
- [ ] Halaman depan → **Coba sebagai Kurir** → langsung masuk ke rit Rudi.
- [ ] Jual ke rumah → hasilnya harga rumah Rp4.000.
- [ ] Jual ke toko → pilih toko → "Di lokasi toko" → **Terverifikasi — harga toko**.
- [ ] Jual ke toko → "1,2 km dari toko" → **Tidak terverifikasi — dihitung harga rumah** → Minta bos setujui.
- [ ] Toko tanpa QR → dihitung harga rumah.
- [ ] Ajukan koreksi pada satu penjualan.
- [ ] Selesai rit & setor → isi uang kurang Rp3.000 → Kirim.
- [ ] Bilah **MODE DEMO** di atas → **Lihat sebagai: Bos** → dasbor menampilkan Tagihan kembali dan Perkiraan bocor.
- [ ] Radar Kecurangan → tanda R6 kurang setor muncul untuk Rudi hari ini.
- [ ] Persetujuan → setujui harga toko (wajib isi alasan) → tanda R2/R4 penjualan itu hilang.
- [ ] Rit & setoran → Rudi → peta titik penjualan dan tombol Setoran diterima.
- [ ] Konfirmasi toko → Kirim lewat WhatsApp → Buka halaman toko → jawab "Tidak" → tanda R8 muncul di Radar.
- [ ] Stiker QR, Bon, Galon di luar, Perawatan mesin, Kepatuhan, Unduh data, Pengaturan.

**Produk lain dan penjualan di depot (depot contoh)**
- [ ] Beranda kurir menampilkan "LPG 3 kg: sisa 3 tabung" dan "Air galon bermerek: sisa 2 galon".
- [ ] Jual ke rumah → **Tambah produk lain** → LPG 3 kg → Simpan → struk berisi 2 produk dan totalnya.
- [ ] Jual ke toko → "1,2 km dari toko" → tambah LPG → LPG juga dihitung harga rumah Rp22.000.
- [ ] Selesai rit & setor → isi LPG dibawa pulang lebih sedikit dan galon kosong kurang 1 → peringatan
      selisih muncul → Kirim → Radar Rudi hari ini berisi R7 LPG dan R9 galon kosong.
- [ ] Bos → **Produk & harga** → Tambah produk (misalnya Galon baru Rp35.000) → kartunya muncul.
- [ ] Bos → **Penjualan di depot** → Isi wadah kecil → jumlah 3 → Catat → total bertambah Rp6.000 →
      Batal dengan alasan → total kembali.
- [ ] Pengaturan → **Nilai galon kosong**, dan Unduh data → **Penjualan di depot**.

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
- **Pasang aplikasi di HP** membutuhkan HTTPS. Alamat Wi-Fi `http://192.168.x.x:8710`
  belum mendukung pemasangan PWA. Tombol **Pasang aplikasi** di landing, bagian aplikasi
  mobile, beranda kurir, dan Pengaturan menjelaskan langkah sesuai browser. Pada alamat
  lokal HTTP, tombol menjelaskan perlunya HTTPS; jika Chrome menawarkan pintasan,
  pintasan itu membuka halaman di browser. Setelah deploy di Emergent, gunakan alamat
  HTTPS, buka Chrome biasa, lalu **⋮ → Tambahkan ke layar utama → Instal** jika tersedia.
  Di laptop, `localhost` dapat dipakai untuk menguji pemasangan.
- **Ringkasan AI** menampilkan "Ringkasan belum tersedia". Fitur ini ditambahkan Emergent.
- Kalau HP tidak bisa membuka alamat laptop, kemungkinan firewall laptop memblokir port 8710.

## Sesudah deploy di Emergent

Ulangi daftar **Depot contoh** di atas memakai alamat hasil deploy, lalu coba hal yang hanya
berjalan di alamat HTTPS. Pakai HP Android dengan Chrome.

- [ ] **Pasang aplikasi:** Chrome → **⋮** → **Instal aplikasi** atau **Tambahkan ke layar utama** →
      ikon AQUAIR muncul dan terbuka tanpa bilah alamat.
- [ ] **Ringkasan AI** di dasbor depot contoh menyebut Rudi dan Tagihan kembali 30 hari yang sama
      dengan kartu di dasbor.
- [ ] Buka demo dari Wi-Fi, lalu dari data seluler. Keduanya berhasil masuk.

**Depot sungguhan (wajib lulus sebelum uji coba 18 Sep):**
- [ ] Daftarkan depot uji, lalu tambah 1 kurir, 1 toko, dan 1 rumah.
- [ ] Berdiri di titik toko, buka data toko di menu Pelanggan, lalu tekan **Pakai lokasi saya sekarang**.
- [ ] Menu Stiker QR → **Cetak A4** → simpan sebagai PDF → QR, nama toko, dan "Tempel di dalam toko"
      tampil rapi.
- [ ] Di HP kurir: Masuk → **Kurir** → nomor HP + PIN → Mulai rit 10 galon. Di Rit & setoran, rit
      berlabel "Muatan belum dicek"; tekan **Muatan cocok**.
- [ ] Di HP kurir, izinkan kamera dan lokasi, lalu scan stiker QR sambil berdiri di titik toko →
      **Terverifikasi — harga toko**.
- [ ] Menu Stiker QR → **Ganti QR** → scan stiker lama → ditolak.
- [ ] Nyalakan mode pesawat → catat penjualan → **Simpan di HP, kirim nanti** → matikan mode pesawat →
      penjualan terkirim satu kali.
- [ ] Selesai rit dengan uang kurang Rp1.000 → tanda R6 muncul di Radar.
- [ ] Unduh data → Penjualan → buka di Google Sheets → kolom rapi dan tidak ada data depot contoh.

## Kalau ada yang tidak sesuai

**Sebelum kode diserahkan ke Emergent:** tulis ke Claude: layar mana, apa yang ditekan, apa yang
muncul, dan apa yang seharusnya. Claude memperbaiki, menjalankan ulang tes, lalu kamu coba lagi.
Setelah semuanya sesuai, kode diunggah ke GitHub dan ditarik Emergent dengan prompt bernomor di
[prompts/](../prompts/), mulai dari [prompt 1](../prompts/01-deploy-dan-ringkasan-ai.md).

**Sesudah kode diserahkan ke Emergent:** perbaikan dikerjakan Emergent. Kirim satu masalah per pesan
supaya bagian lain tidak ikut berubah:

> Ada yang belum sesuai.
> - Langkah: [apa yang kamu tekan]
> - Yang terjadi: [apa yang muncul]
> - Yang seharusnya: [hasil yang benar], sesuai `docs/03-spesifikasi-produk.md` bagian [nomor].
>
> Perbaiki tanpa mengubah perilaku lain yang sudah benar, jalankan ulang semua tes backend, lalu
> tunjukkan cara mengujinya ulang.
