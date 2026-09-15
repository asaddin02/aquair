# Konteks untuk agen AI (Claude Code, Codex, Emergent)

## Proyek

AQUAIR adalah aplikasi untuk Depot Air Minum Isi Ulang (DAMIU). Fokus utamanya adalah
mencegah kecurangan kurir yang mencatat pembeli rumah (Rp4.000/galon) sebagai toko
(Rp3.000/galon). Masalah pendukung: galon pinjaman yang hilang, perawatan mesin, dan
kepatuhan uji kualitas air. Detailnya ada di `docs/`.

Pemilik proyek: Asadin (GitHub `asaddin02`). Kasus kurir berasal dari depot milik
keluarganya.

## Keputusan yang mengikat

- **Hanya memakai stack yang didukung Emergent:** React di frontend, FastAPI (Python) di
  backend, MongoDB sebagai database. Tidak memakai Docker, VPS, atau server sendiri.
  Deploy lewat Emergent.
- **Lomba Emergent "Building Indonesia":**
  - Submit tutup 20 Sep 2026 pukul 23:59 WIB, tanpa masa tenggang.
  - Upvote tutup 25 Sep. Hanya 200 teratas menurut upvote yang dinilai juri.
  - Satu submission per peserta. Nama dan deskripsi dibekukan sesudah 20 Sep.
  - Rubrik: dampak bisnis 30%, upvote 20%, penyelesaian masalah 20%, penggunaan Emergent
    15%, UI/UX 15%.
- **Pembagian kerja (diputuskan Asadin, 15 Sep 2026):** Claude membangun dan menguji aplikasi
  lengkap di repo ini (`backend/` FastAPI, `frontend/` React + PWA) sampai semua fungsi bisa
  dicoba Asadin di laptop. Emergent lalu menarik repo ini lewat "Pull from GitHub",
  menyesuaikan, menambah **Ringkasan AI** (Universal Key hanya ada di Emergent), dan deploy.
  Setelah kode diserahkan ke Emergent, Claude berhenti menyunting kode; perubahan berikutnya
  lewat prompt di `prompts/`. Jangan menyunting kode yang sama dari dua tempat bersamaan.
- **Sumber kebenaran aturan bisnis** tetap `docs/03-spesifikasi-produk.md`. Prototipe di
  `desain/prototipe/` hanya acuan tampilan.
- **Tidak ada angka karangan.** Angka dampak bisnis di pitch hanya boleh berasal dari uji
  coba nyata, riset bersumber, atau contoh yang jelas diberi label "ilustrasi".
- **Repo ini publik.** Jangan menaruh nama asli orang, nomor telepon, kredensial, kunci
  API, atau informasi pribadi apa pun di repo.

## Menjalankan dan menguji

- Semua di laptop: `bash scripts/jalankan-lokal.sh` → `http://localhost:8710` (MongoDB portabel port 27717,
  backend 8710 menyajikan build frontend). Hentikan dengan `--henti`. Port 3000–3004 dan 8001 di mesin
  ini dipakai layanan lain; jangan disentuh.
- Tes backend: `cd backend && MONGO_URL=mongodb://127.0.0.1:27717 .venv/bin/python -m pytest -q`.
- Build frontend ketat: `cd frontend && CI=true npx react-scripts build` (peringatan dianggap galat).

## Cara bekerja dengan Asadin

- Jawab dalam Bahasa Indonesia sederhana. Asadin baru mengenal git: jelaskan dengan
  analogi dan arahkan ke antarmuka web GitHub, bukan CLI.
- Laporan harus ringkas: hasil lebih dulu, sebut hanya hal yang mengubah keputusannya.
  Jangan menutup laporan dengan daftar peringatan.
- Jangan menyentuh proyek lain di mesin ini (termasuk KasirDW) maupun server milik orang
  lain.
