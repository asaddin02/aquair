# Prompt 1 — deploy versi sekarang, lalu Ringkasan AI

Tahap ini menaruh aplikasi yang sudah lulus tes di internet secepatnya, lalu menambah satu-satunya fitur
yang hanya bisa dibuat di Emergent: Ringkasan AI. Fitur multi-produk dan tambalan celah sedang dibangun
Claude di laptop, dan akan ditarik lewat prompt 2.

## Kredit (110)

- Deploy memakan **50 kredit per bulan**. Deploy ulang sesudah ada perubahan **gratis**.
- Semua kerja agen memakan kredit: membaca kode, menulis kode, menjalankan tes. Pemakaian AI lewat
  Universal Key juga.
- Kalau kredit habis, Emergent tidak bisa menulis kode, menjalankan tes, maupun deploy. Karena itu deploy
  dikerjakan paling awal.

## Cara pakai

1. Pastikan versi terbaru sudah ada di GitHub (buka repo **asaddin02/aquair**, lihat commit terakhir).
2. Emergent → tugas baru. Kalau ada pilihan agen E1 dan E1.1, pilih **E1.1** (lebih hemat menurut tips
   Emergent).
3. Tekan **GitHub → Pull from GitHub**, pilih repo **aquair** branch **main**.
4. Tempel **Pesan A**. Tunggu laporan tes lulus dan build berhasil.
5. Tekan **Deploy** (50 kredit). Tunggu sampai alamat aplikasi keluar.
6. Cek sendiri (gratis, tanpa kredit):
   - [ ] Alamat aplikasi membuka halaman depan.
   - [ ] Masuk → **Kurir** → `kurir` / `kurir` → muncul "Halo, Rudi".
   - [ ] Jual ke toko → pilih toko → **1,2 km dari toko** → Simpan → "Tidak terverifikasi".
   - [ ] `<alamat>/manifest.json` menampilkan teks JSON, bukan halaman aplikasi.
   - [ ] Di Chrome HP: **⋮ → Instal aplikasi** (atau Tambahkan ke layar utama) tersedia, dan ikon AQUAIR
         terbuka tanpa bilah alamat.
   - [ ] Buka `<alamat>/api/demo/ip-saya` di HP memakai **data seluler**, lalu di laptop memakai **Wi-Fi**.
         Salin kedua hasilnya.
7. Kalau semua baik, tekan **Submit Your App**.
8. Di tugas yang sama, tempel **Pesan B** beserta dua hasil `ip-saya`.
9. Setelah laporan selesai: tekan **Deploy** lagi (gratis), cek kartu Ringkasan AI di dasbor depot contoh,
   lalu tekan **Save to GitHub** (repo aquair, branch main). Kabari Claude.

**Supaya kredit awet:** satu pesan per langkah. Jangan mengirim pesan selagi agen bekerja, kecuali agen salah
arah: hentikan, lalu koreksi dalam satu kalimat. Kalau agen menanyakan hal yang jawabannya ada di prompt,
jawab "Ikuti prompt dan docs/09". Jangan meminta perubahan tampilan atau fitur lain di tugas ini.

---

## Pesan A — siapkan dan uji (tempel mulai baris berikut)

Repo ini berisi aplikasi **AQUAIR** yang sudah lengkap dan lulus tes: backend FastAPI + MongoDB di `backend/`, frontend React + PWA di `frontend/`. **Jangan membangun ulang atau mengubah kode di pesan ini.** Baca dulu `docs/09-panduan-emergent.md`, lalu kerjakan hanya ini:

1. Siapkan dan jalankan aplikasi sesuai cara Emergent: backend dari `backend/` (`pip install -r requirements.txt`, `uvicorn server:app --host 0.0.0.0 --port 8001`), frontend dari `frontend/` (`yarn install`, `yarn start`). Isi `MONGO_URL`, `DB_NAME=aquair`, `CORS_ORIGINS`, `JWT_SECRET` (string acak panjang, simpan sebagai rahasia Emergent), dan `REACT_APP_BACKEND_URL` (alamat backend tanpa `/api`). Semua jalur selain `/api`, misalnya `/bos/radar` dan `/k/<token>`, harus mengembalikan `index.html`.
2. Jalankan tes backend: `pip install -r requirements-dev.txt`, lalu `python -m pytest -q`. Hasil harus **34 passed**.
3. Jalankan build ketat frontend: `CI=true yarn build`. Harus berhasil.
4. Laporkan hasil poin 2 dan 3 dalam tiga baris, lalu berhenti. Kalau ada yang gagal, laporkan galatnya dan jangan memperbaiki sebelum saya setujui.

---

## Pesan B — Ringkasan AI dan batas demo (tempel mulai baris berikut)

Aplikasi sudah ter-deploy. Kerjakan dua hal ini saja, mengikuti `docs/09-panduan-emergent.md`.

### 1. Ringkasan AI dengan Universal Key
- Isi endpoint `POST /api/bos/ringkasan-ai` di `backend/aquair/api_bos_tambahan.py`. Sekarang endpoint itu mengembalikan `{"tersedia": false}`.
- Data untuk model diambil dari fungsi `data_ringkasan` di berkas yang sama. Server sudah menghitung semua angkanya. Kirim sebagai JSON.
- Pakai **model paling murah dan cepat** yang tersedia lewat Universal Key. Kunci diambil dari rahasia Emergent, tidak ditulis di kode. Tambahkan library yang dipakai ke `requirements.txt`; kalau versinya bentrok dengan paket yang sudah dikunci, laporkan dulu.
- Instruksi untuk model:
  - maksimal 5 kalimat dalam Bahasa Indonesia sederhana untuk pemilik depot, dimulai dari hal yang paling butuh tindakan,
  - **hanya boleh menyebut angka yang ada di data**, dengan format Rupiah `Rp21.000`,
  - **Tagihan kembali dan Perkiraan bocor adalah dua angka terpisah; jangan dijumlahkan**,
  - `porsi_toko_30` berupa pecahan 0–1; kalau disebut, tulis sebagai persen bulat (0,9 → 90%),
  - sebut nama kurir yang berisiko dan Tagihan kembali 30 hari persis seperti di data,
  - kalau tidak ada masalah, katakan terus terang.
- **Penjaga angka:** sebelum dikembalikan, periksa setiap angka Rupiah di teks. Kalau ada yang tidak ada di data, jangan tampilkan teks itu; kembalikan `tersedia: false` dengan pesan "Ringkasan belum tersedia."
- **Hemat pemakaian AI:**
  - Simpan ringkasan terakhir per depot beserta sidik datanya (hash dari JSON data). Kalau data sama, kembalikan ringkasan tersimpan tanpa memanggil model.
  - Depot demo: field `ringkasan_ai_sisa` di dokumen depot (nilai awal 3) berkurang hanya bila model benar-benar dipanggil dan berhasil. Kalau habis, kembalikan `tersedia: false` dengan pesan "Batas ringkasan di depot contoh sudah habis."
  - Semua depot demo bersama-sama dibatasi `AQUAIR_BATAS_AI_DEMO_HARIAN` panggilan model per hari WIB (bawaan 30). Kalau habis, kembalikan `tersedia: false` dengan pesan "Batas ringkasan contoh hari ini sudah habis. Coba lagi besok."
  - Kalau pemanggilan model gagal, kembalikan `tersedia: false` dengan pesan "Ringkasan belum tersedia." Bagian dasbor lain tetap berjalan.
- Kembalikan `{"tersedia": true, "teks": "...", "dibuat": "HH.MM"}` (jam WIB). Di `KartuRingkasanAI` (`frontend/src/bos/Dasbor.js`), tambahkan tulisan kecil "Dibuat HH.MM" di bawah teks. Jangan mengubah bagian lain dasbor.
- Tambahkan tes dengan model tiruan (tanpa memanggil model sungguhan): penjaga angka menolak teks berisi Rupiah yang tidak ada di data, ringkasan keempat di depot demo ditolak, data yang sama tidak memanggil model dua kali, dan batas harian demo berlaku.

### 2. Batas demo per pengunjung
Hasil `/api/demo/ip-saya`:
- HP (data seluler): `[tempel hasil]`
- Laptop (Wi-Fi): `[tempel hasil]`

Kalau `ip_dipakai` pada keduanya **sama**, semua pengunjung berbagi satu batas demo. **Jangan mengubah kode.** Atur variabel lingkungan backend yang dipakai deployment:
- `AQUAIR_HEADER_IP` = nama header yang nilainya berbeda di kedua hasil dan berisi IP publik perangkat (misalnya `cf-connecting-ip`), atau
- `AQUAIR_PROXY_TEPERCAYA` = posisi IP perangkat di `x_forwarded_for`, dihitung dari belakang (1 = nilai terakhir).

Kalau `ip_dipakai` sudah berbeda, lewati bagian ini.

### 3. Selesai bila
- Tes backend lulus (34 tes lama dan tes baru) dan build ketat frontend berhasil.
- Laporkan daftar berkas yang diubah dan hasil tes, lalu berhenti. Saya yang menekan Deploy dan Save to GitHub.
