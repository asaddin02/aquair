# Prompt 2 — tarik fitur multi-produk dan tambalan celah, lalu deploy ulang

Pakai **setelah Claude mengabarkan** fitur ini sudah digabung ke branch `main`, bersama hasil Ringkasan AI
dari prompt 1. Emergent tidak menulis fitur di tahap ini. Kodenya sudah dibangun dan diuji Claude:

- katalog **Produk & harga** (LPG, galon bermerek, galon baru, isi wadah kecil, dan lainnya),
- beberapa produk dalam satu kunjungan, muatan dan setoran per produk,
- **Penjualan di depot**,
- tanda **R9 galon kosong kurang**, R7 per produk, dan rit kemarin wajib ditutup.

## Kredit

Kerja agen di tahap ini kecil: menarik kode, menjalankan tes, dan build. **Deploy ulang gratis** selama
mengganti deployment yang sudah ada. Jangan membuat aplikasi deploy baru, karena itu kena 50 kredit lagi.

## Cara pakai

1. Buka repo **asaddin02/aquair**, pastikan commit terbaru di `main` adalah gabungan fitur multi-produk.
2. Di tugas Emergent yang lama, pakai **GitHub → Pull from GitHub** kalau tersedia. Kalau tidak, buat
   tugas baru, pilih agen **E1.1**, lalu **Pull from GitHub** repo **aquair** branch **main**. Di tugas baru,
   pastikan rahasia dan variabel lingkungan dari prompt 1 ikut diisi lagi (`JWT_SECRET`, kunci Universal
   Key, dan `AQUAIR_HEADER_IP` atau `AQUAIR_PROXY_TEPERCAYA` bila dulu diatur).
3. **Sebelum deploy ulang**, di alamat aplikasi yang sudah jalan, daftarkan depot uji dengan email uji.
   Ini untuk membuktikan data tidak hilang saat deploy ulang.
4. Tempel **pesan di bawah garis**. Tunggu laporan tes lulus dan build berhasil.
5. Tekan **Deploy**, lalu pilih **mengganti deployment yang sudah ada**.
6. Cek sendiri (gratis):
   - [ ] Masuk dengan email depot uji dari langkah 3 masih berhasil. **Kalau gagal, jangan daftarkan depot
         keluarga dulu; kabari Claude.**
   - [ ] Masuk → **Kurir** → `kurir` / `kurir` → beranda menampilkan "LPG 3 kg: sisa 3 tabung".
   - [ ] Jual ke rumah → **Tambah produk lain** → LPG 3 kg → Simpan → struk berisi 2 produk.
   - [ ] Selesai rit & setor → ada isian LPG dan galon bermerek dibawa pulang.
   - [ ] Masuk sebagai **Bos** → menu **Produk & harga** dan **Penjualan di depot** terbuka.
   - [ ] Kartu Ringkasan AI di dasbor masih bekerja.
   - [ ] Di Chrome HP, aplikasi yang sudah terpasang terbuka dengan versi baru. Kalau masih versi lama,
         tutup lalu buka sekali lagi.
7. Setelah semua baik, baru daftarkan depot keluarga dan cetak stiker QR.

---

Repo ini berisi pembaruan **AQUAIR** yang sudah lulus tes: katalog produk, penjualan beberapa produk, muatan dan setoran per produk, penjualan di depot, tanda R9, dan aturan rit kemarin wajib ditutup. **Jangan membangun ulang, mengubah kode, atau mengubah tampilan di pesan ini.** Baca dulu `docs/09-panduan-emergent.md`, lalu kerjakan hanya ini:

1. Tarik kode terbaru dan jalankan aplikasi seperti sebelumnya. Variabel lingkungan tetap sama: `MONGO_URL`, `DB_NAME=aquair`, `CORS_ORIGINS`, `JWT_SECRET`, kunci Universal Key, dan bila ada `AQUAIR_HEADER_IP` atau `AQUAIR_PROXY_TEPERCAYA`. Jangan mengosongkan database.
2. Jalankan tes backend dari folder `backend/`: `pip install -r requirements-dev.txt`, lalu `python -m pytest -q`. **Semua tes harus lulus** (45 tes dari Claude ditambah tes Ringkasan AI dari prompt 1).
3. Jalankan build ketat frontend: `CI=true yarn build`. Harus berhasil.
4. Laporkan hasil poin 2 dan 3 dalam tiga baris, lalu berhenti. Kalau ada yang gagal, laporkan galatnya dan jangan memperbaiki sebelum saya setujui. Saya yang menekan Deploy dan Save to GitHub.
