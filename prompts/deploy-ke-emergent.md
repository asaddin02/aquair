# Prompt Emergent — sekali jalan: tarik, Ringkasan AI, lalu deploy

Satu-satunya prompt untuk Emergent. Aplikasinya sudah lengkap dan lulus tes di repo ini, jadi Emergent
hanya mengerjakan yang memang harus dilakukan di sana: menjalankan, menambah **Ringkasan AI** dengan
Universal Key, dan menyiapkan aplikasi untuk di-deploy sekali.

## Kredit (110)

- Deploy memakan **50 kredit per bulan per aplikasi**, bukan per sekali deploy. Mengganti versi aplikasi
  yang sudah hidup tidak menambah kredit.
- Semua kerja agen memakan kredit: membaca kode, menulis kode, menjalankan tes. Pemakaian AI lewat
  Universal Key juga.
- Kalau kredit habis, Emergent tidak bisa menulis kode, menjalankan tes, maupun deploy.

## Cara pakai

1. Buka repo **asaddin02/aquair** dan pastikan commit terbaru sudah ada di branch `main`.
2. Emergent → tugas baru. Kalau ada pilihan agen E1 dan E1.1, pilih **E1.1** (lebih hemat menurut tips
   Emergent).
3. Tekan **GitHub → Pull from GitHub**, pilih repo **aquair** branch **main**.
4. Tempel **semua teks di bawah garis**, lalu tinggalkan. Agen akan berhenti sendiri dengan laporan
   "siap deploy".
5. Tekan **Deploy** (50 kredit). Tunggu alamat aplikasi keluar.
6. Cek sendiri di alamat itu (gratis, tanpa kredit):
   - [ ] Halaman depan terbuka.
   - [ ] Masuk → **Kurir** → `kurir` / `kurir` → muncul "Halo, Rudi", dan beranda menyebut sisa LPG.
   - [ ] Jual ke toko → pilih toko → **1,2 km dari toko** → Simpan → "Tidak terverifikasi".
   - [ ] Masuk → **Bos** → `admin` / `admin` → dasbor tampil, kartu **Ringkasan AI** menghasilkan kalimat.
   - [ ] Menu **Produk & harga**, **Penjualan di depot**, dan **Untung & pengeluaran** terbuka.
   - [ ] Di **Untung & pengeluaran**: pilih **Bulan ini**, angka untung tampil; catat satu pengeluaran contoh, angkanya ikut berubah.
   - [ ] Di panel **Untung kotor per produk**: LPG 3 kg punya untung kotor, Isi ulang galon hanya beromzet (tanpa modal).
   - [ ] Di Chrome HP: **⋮ → Instal aplikasi**, lalu ikon AQUAIR terbuka tanpa bilah alamat.
7. Kalau semua baik: tekan **Submit Your App**, lalu tekan **Save to GitHub** (repo aquair, branch main).

**Supaya kredit awet:** jangan mengirim pesan tambahan selagi agen bekerja, kecuali agen jelas salah arah:
hentikan, lalu koreksi dalam satu kalimat. Kalau agen menanyakan hal yang jawabannya sudah ada di prompt,
jawab "Ikuti prompt dan docs/09".

---

## Tempel mulai baris berikut

Repo ini berisi aplikasi **AQUAIR** yang sudah lengkap dan lulus tes: backend FastAPI + MongoDB di `backend/`, frontend React + PWA di `frontend/`. **Jangan membangun ulang aplikasi, mengubah struktur, atau mengubah tampilan.** Baca dulu `docs/09-panduan-emergent.md` (hanya dokumen itu), lalu kerjakan lima langkah berikut berurutan dan berhenti setelah langkah 5.

### 1. Jalankan aplikasinya
- Backend dari `backend/`: `pip install -r requirements.txt`, lalu `uvicorn server:app --host 0.0.0.0 --port 8001`. Semua endpoint ada di bawah `/api`.
- Variabel lingkungan backend: `MONGO_URL`, `DB_NAME=aquair`, `CORS_ORIGINS`, dan **`JWT_SECRET`** berisi string acak panjang yang disimpan sebagai rahasia Emergent, bukan di kode atau repo.
- Frontend dari `frontend/`: `yarn install`, lalu `yarn start`. Isi `REACT_APP_BACKEND_URL` dengan alamat backend tanpa `/api`.
- Jangan mengisi `AQUAIR_FRONTEND_BUILD`; variabel itu hanya untuk mencoba di laptop.
- Frontend memakai BrowserRouter: semua jalur selain `/api`, misalnya `/bos/radar` dan `/k/<token>`, harus mengembalikan `index.html`.

### 2. Buktikan tes lulus sebelum mengubah apa pun
- Dari `backend/`: `pip install -r requirements-dev.txt`, lalu `python -m pytest -q`. Hasilnya harus **52 passed**. Tes memakai database terpisah `aquair_uji_api`.
- Dari `frontend/`: `CI=true yarn build` harus berhasil.
- Kalau ada yang gagal di langkah ini, **berhenti** dan laporkan galatnya. Jangan memperbaiki sebelum saya setujui.

### 3. Tambahkan Ringkasan AI dengan Universal Key
- Isi endpoint `POST /api/bos/ringkasan-ai` di `backend/aquair/api_bos_tambahan.py`. Sekarang endpoint itu mengembalikan `{"tersedia": false}`.
- Data untuk model diambil dari fungsi `data_ringkasan` di berkas yang sama. Server sudah menghitung semua angkanya; kirim sebagai JSON.
- Pakai **model paling murah dan cepat** yang tersedia lewat Universal Key. Kunci diambil dari rahasia Emergent, tidak ditulis di kode. Tambahkan library yang dipakai ke `requirements.txt`; kalau versinya bentrok dengan paket yang sudah dikunci, laporkan dan berhenti.
- Instruksi untuk model:
  - maksimal 5 kalimat dalam Bahasa Indonesia sederhana untuk pemilik depot, dimulai dari hal yang paling butuh tindakan,
  - **hanya boleh menyebut angka yang ada di data**, Rupiah ditulis `Rp21.000`,
  - **Tagihan kembali dan Perkiraan bocor adalah dua angka terpisah; jangan dijumlahkan**,
  - `porsi_toko_30` berupa pecahan 0–1; kalau disebut, tulis sebagai persen bulat (0,9 → 90%),
  - sebut nama kurir yang berisiko dan Tagihan kembali 30 hari persis seperti di data,
  - kalau tidak ada masalah, katakan terus terang.
- **Penjaga angka:** sebelum teks dikembalikan, periksa setiap angka Rupiah di dalamnya. Kalau ada yang tidak ada di data, jangan tampilkan teks itu; kembalikan `tersedia: false` dengan pesan "Ringkasan belum tersedia."
- **Hemat pemakaian AI:**
  - Simpan ringkasan terakhir per depot beserta sidik datanya (hash dari JSON data). Kalau datanya sama, kembalikan ringkasan tersimpan tanpa memanggil model.
  - Depot contoh: field `ringkasan_ai_sisa` di dokumen depot (nilai awal 3) berkurang hanya bila model benar-benar dipanggil dan berhasil. Kalau habis: `tersedia: false`, pesan "Batas ringkasan di depot contoh sudah habis."
  - Semua depot contoh bersama-sama dibatasi `AQUAIR_BATAS_AI_DEMO_HARIAN` panggilan model per hari WIB (bawaan 30). Kalau habis: `tersedia: false`, pesan "Batas ringkasan contoh hari ini sudah habis. Coba lagi besok."
  - Kalau pemanggilan model gagal: `tersedia: false`, pesan "Ringkasan belum tersedia." Bagian dasbor lain tetap berjalan.
- Kembalikan `{"tersedia": true, "teks": "...", "dibuat": "HH.MM"}` (jam WIB). Di `KartuRingkasanAI` (`frontend/src/bos/Dasbor.js`), tambahkan tulisan kecil "Dibuat HH.MM" dari `dibuat`. Jangan mengubah bagian lain dasbor.
- Tambahkan tes dengan model tiruan (jangan memanggil model sungguhan di tes): penjaga angka menolak teks berisi Rupiah yang tidak ada di data, ringkasan keempat di depot contoh ditolak, data yang sama tidak memanggil model dua kali, dan batas harian depot contoh berlaku.

### 4. Pastikan batas depot contoh dihitung per pengunjung
Depot contoh dibatasi 10 per alamat IP per jam supaya database tidak dibanjiri. Kalau semua pengunjung terbaca datang dari satu alamat proxy, juri ke-11 dalam satu jam akan ditolak.
- Panggil `/api/demo/ip-saya` di alamat preview dari dalam sandbox, lalu bandingkan `ip_dipakai` dengan IP publik sandbox (misalnya dari `curl https://api.ipify.org`).
- Kalau sama: tidak ada yang perlu diubah.
- Kalau berbeda: **jangan mengubah kode**. Isi variabel lingkungan backend yang dipakai deployment: `AQUAIR_HEADER_IP` (nama header yang berisi IP pengunjung, misalnya `cf-connecting-ip`) atau `AQUAIR_PROXY_TEPERCAYA` (posisi IP pengunjung di `x_forwarded_for`, dihitung dari belakang). Tersedia juga `AQUAIR_BATAS_DEMO` untuk menaikkan batasnya.
- Laporkan hasil perbandingannya.

### 5. Periksa sebelum deploy, lalu berhenti
Periksa di alamat preview dengan `curl` (jangan memakai agen pengujian otomatis dan jangan mengambil tangkapan layar berulang):
- `/api/sehat` menjawab `{"status":"ok"}`.
- `/manifest.json`, `/sw.js`, `/ikon-192.png`, `/ikon-512.png`, `/ikon-maskable-512.png` menjawab 200 dengan tipe berkas yang benar, bukan HTML.
- `/`, `/masuk`, `/bos/radar`, dan `/k/contoh` mengembalikan HTML aplikasi.
- `POST /api/demo/masuk` dengan `{"username":"admin","sandi":"admin"}` menjawab 200 dan berisi `token_bos`.
- Dengan `token_bos` itu, `POST /api/bos/ringkasan-ai` menjawab `tersedia: true` dan teksnya menyebut Rudi beserta angka Tagihan kembali yang sama dengan `GET /api/bos/ringkasan-data`.
- Jalankan ulang `python -m pytest -q` dan `CI=true yarn build`; keduanya harus lulus.

Lalu **berhenti** dan tulis laporan singkat: hasil tes sebelum dan sesudah perubahan, daftar berkas yang diubah, hasil pemeriksaan langkah 4 dan 5, serta hal yang perlu saya cek sendiri. Saya yang menekan Deploy, Submit Your App, dan Save to GitHub.

### Aturan yang tidak boleh dilanggar
- Jangan mengubah `backend/aquair/aturan.py` (mesin Radar dan harga). Tes contoh hitungan 4.4 harus tetap lulus.
- Setiap query wajib disaring `depot_id` pengguna yang masuk. Endpoint kurir tidak boleh mengembalikan `qr_token`, kecuali `/api/kurir/demo/toko-simulasi` di depot contoh.
- Depot contoh tidak boleh meminta kamera atau lokasi asli perangkat.
- Jangan mengubah warna, logo, tata letak, atau teks antarmuka selain yang diminta di langkah 3.
- Jangan memasang pustaka UI baru (Tailwind, shadcn/ui, MUI, dan sejenisnya) atau paket lain yang tidak disebut prompt ini.
- Jangan menaruh kredensial, kunci API, berkas `.env`, atau data pribadi di repo. Repo ini publik.
- Untuk hal kecil yang tidak disebut di sini (nama variabel, letak tulisan kecil), putuskan sendiri mengikuti gaya kode yang ada. Untuk hal besar (tes lama gagal, spesifikasi bentrok), berhenti dan laporkan.
