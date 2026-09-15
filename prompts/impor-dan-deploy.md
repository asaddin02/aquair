# Impor ke Emergent, tambah Ringkasan AI, lalu deploy

Aplikasinya sudah jadi dan sudah diuji di repo ini. Emergent tidak membangun dari nol.

**Cara pakai:**
1. Di Emergent, buat tugas baru, tekan tombol **GitHub → Pull from GitHub**, pilih repo **aquair** branch **main**.
2. Setelah kode masuk, tempel semua teks di bawah garis.
3. Sesudah deploy berhasil, tekan **Submit Your App** (deploy dan submit adalah dua langkah terpisah).

---

Repo ini berisi aplikasi **AQUAIR** yang sudah lengkap dan lulus tes: backend FastAPI + MongoDB di `backend/`, frontend React (Create React App) + PWA di `frontend/`. Aturan bisnisnya ada di `docs/03-spesifikasi-produk.md`. **Jangan menulis ulang aplikasi atau mengubah strukturnya.** Tugasmu: menjalankan di Emergent, menambah Ringkasan AI, lalu deploy.

## 1. Jalankan
- **Backend** dari folder `backend/`: `pip install -r requirements.txt`, lalu `uvicorn server:app --host 0.0.0.0 --port 8001`. Semua endpoint berada di bawah `/api`.
- Variabel lingkungan backend: `MONGO_URL`, `DB_NAME` (misalnya `aquair`), `CORS_ORIGINS`, dan **`JWT_SECRET`** berisi string acak panjang yang disimpan sebagai rahasia Emergent, bukan di kode atau repo.
- **Frontend** dari folder `frontend/`: `yarn install`, lalu `yarn start`. Isi `REACT_APP_BACKEND_URL` dengan alamat backend tanpa `/api`.
- Jangan mengisi `AQUAIR_FRONTEND_BUILD`. Variabel itu hanya untuk mencoba di laptop.
- Frontend memakai BrowserRouter. Semua jalur selain `/api` (misalnya `/bos/radar` dan `/k/<token>`) harus mengembalikan `index.html`.

## 2. Buktikan tes lulus sebelum mengubah apa pun
Dari folder `backend/`: `pip install -r requirements-dev.txt`, lalu `python -m pytest -q` dengan `MONGO_URL` mengarah ke MongoDB Emergent. Tes memakai database terpisah `aquair_uji_api`. Hasilnya harus **26 passed**. Tunjukkan hasilnya kepada saya. Kalau ada yang gagal, laporkan dulu sebelum memperbaiki.

## 3. Tambahkan Ringkasan AI dengan Universal Key
- Isi endpoint `POST /api/bos/ringkasan-ai` di `backend/aquair/api_bos_tambahan.py`. Sekarang endpoint itu mengembalikan `{"tersedia": false}`.
- Data untuk model diambil dari fungsi `data_ringkasan` (endpoint `GET /api/bos/ringkasan-data`). Kirim sebagai JSON ke model lewat Universal Key Emergent.
- Instruksi untuk model:
  - maksimal 5 kalimat dalam Bahasa Indonesia sederhana,
  - **hanya boleh menyebut angka yang ada di data**,
  - sebut nama kurir yang berisiko dan Tagihan kembali 30 hari persis seperti di data,
  - kalau tidak ada masalah, katakan terus terang.
- Kembalikan `{"tersedia": true, "teks": "...", "dibuat": "HH.MM"}`. Kartu `KartuRingkasanAI` di `frontend/src/bos/Dasbor.js` sudah menampilkan `teks`.
- **Depot demo:** batas 3 ringkasan per depot demo, memakai field `ringkasan_ai_sisa` di dokumen depot (nilai awal 3). Kalau habis, kembalikan `tersedia: false` dengan pesan "Batas ringkasan di depot contoh sudah habis."
- Kalau pemanggilan model gagal, kembalikan `tersedia: false` dengan pesan "Ringkasan belum tersedia." Bagian dasbor lain tetap berjalan.
- Tambahkan tes: setiap angka Rupiah di teks ringkasan harus ada di data yang dikirim.

## 4. Deploy dan periksa
Deploy, lalu buka alamat hasil deploy dan pastikan:
1. Halaman depan terbuka, dan **Coba sebagai Kurir** langsung membuka rit aktif Rudi.
2. Jual ke toko lewat simulasi scan dengan pilihan "1,2 km dari toko" menghasilkan "Tidak terverifikasi — dihitung harga rumah".
3. Dua browser berbeda (biasa dan Incognito) mendapat depot demo yang berbeda.
4. `/manifest.json` dan `/sw.js` bisa dibuka, dan Chrome Android menawarkan "Tambahkan ke layar utama".
5. Ringkasan AI di depot demo menyebut Rudi dan Tagihan kembali 30 hari yang sama persis dengan dasbor.

## 5. Aturan yang tidak boleh dilanggar
- Jangan mengubah `backend/aquair/aturan.py` (mesin Radar dan harga). Kalau terpaksa, tes contoh hitungan 4.4 harus tetap lulus.
- Setiap query wajib disaring `depot_id` pengguna yang masuk. Endpoint kurir tidak boleh mengembalikan `qr_token`, kecuali `/api/kurir/demo/toko-simulasi` di depot demo.
- Depot demo tidak boleh meminta kamera atau lokasi asli perangkat.
- Jangan menaruh kredensial, kunci API, atau data pribadi di repo. Repo ini publik.
- Setelah selesai, tekan **Save to GitHub** ke repo dan branch yang sama.
