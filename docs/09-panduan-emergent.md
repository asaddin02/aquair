# Panduan kerja untuk agen Emergent

Baca dokumen ini sekali di awal tugas. Isinya peta proyek, cara menguji, aturan hemat kredit,
aturan tampilan, aturan PWA, dan batas yang tidak boleh dilanggar. Aturan bisnis ada di
`docs/03-spesifikasi-produk.md`; baca hanya bagian yang disebut prompt.

## 1. Peta proyek

| Bagian | Lokasi |
|---|---|
| Titik masuk backend (semua endpoint di bawah `/api`) | `backend/server.py` |
| Mesin harga dan Radar (fungsi murni, tanpa database) | `backend/aquair/aturan.py` |
| Endpoint publik: daftar, masuk, depot demo, konfirmasi toko | `backend/aquair/api_publik.py` |
| Endpoint kurir | `backend/aquair/api_kurir.py` |
| Endpoint bos | `backend/aquair/api_bos.py`, `backend/aquair/api_bos_tambahan.py` (CSV, galon, konfirmasi, perawatan, kepatuhan, Ringkasan AI), `backend/aquair/api_produk.py` (produk & harga, penjualan di depot) |
| Katalog produk (isi ulang galon = produk utama `utama`) | `backend/aquair/produk.py` |
| Hitung ulang Radar dan data dasbor | `backend/aquair/layanan.py` |
| Pembuat depot demo | `backend/aquair/demo.py` |
| Sesi, token, dan database | `backend/aquair/keamanan.py`, `backend/aquair/inti.py` |
| Tes | `backend/tests/test_aturan.py` (contoh hitungan spesifikasi 4.4 dan aturan per produk), `backend/tests/test_api.py`, `backend/tests/test_produk.py` |
| Rute frontend | `frontend/src/App.js` |
| Halaman publik | `frontend/src/halaman/` |
| Ruang bos (menu di array `MENU`) | `frontend/src/bos/` (`BosApp.js`; produk di `Produk.js`, penjualan di depot di `PenjualanDepot.js`) |
| Aplikasi kurir | `frontend/src/kurir/` (`KurirApp.js`) |
| Komponen bersama | `frontend/src/komponen/` |
| Pemanggil API dan format angka | `frontend/src/api.js`, `frontend/src/format.js` |
| PWA | `frontend/public/manifest.json`, `frontend/public/sw.js`, ikon di `frontend/public/` |
| Identitas tampilan | `docs/08-desain-antarmuka.md` |

## 2. Menjalankan dan menguji

- Backend: dari `backend/`, `pip install -r requirements-dev.txt`, lalu `python -m pytest -q`. Tes memakai
  database terpisah `aquair_uji_api`.
- Frontend: dari `frontend/`, `yarn install`, lalu build ketat `CI=true yarn build` (peringatan dianggap galat).
- Variabel lingkungan backend: `MONGO_URL`, `DB_NAME`, `CORS_ORIGINS`, `JWT_SECRET` (rahasia), serta opsional
  `AQUAIR_HEADER_IP` dan `AQUAIR_PROXY_TEPERCAYA` (lihat bagian 6). Frontend: `REACT_APP_BACKEND_URL`.
- Jangan mengisi `AQUAIR_FRONTEND_BUILD`; itu hanya untuk mencoba di laptop.

## 3. Hemat kredit

- Kerjakan hanya yang diminta prompt. Jangan menambah fitur, merapikan, atau memformat ulang berkas lain.
- Baca hanya berkas yang disebut prompt dan dokumen ini. Jangan menelusuri seluruh repo.
- Buat perubahan sekecil mungkin. Jangan menulis ulang berkas utuh bila cukup mengganti beberapa baris.
- Uji dengan `pytest` backend dan build ketat frontend. **Jangan memanggil agen pengujian otomatis
  (testing agent backend/frontend) atau mengambil tangkapan layar berulang kecuali prompt memintanya.**
- Jangan memasang paket baru kecuali prompt menyebutnya.
- Kalau spesifikasi tidak jelas atau tes lama gagal, berhenti dan tanya. Jangan menebak atau mencoba berulang.
- Laporan akhir singkat: daftar berkas yang diubah, hasil tes, dan hal yang perlu dicek pemilik.

## 4. Tampilan (wajib konsisten)

- **Jangan memasang Tailwind, shadcn/ui, MUI, Bootstrap, atau pustaka UI dan ikon lain.** Semua gaya ada di
  `frontend/src/gaya.css`, `tampilan.css`, dan `pengalaman.css`.
- Warna hanya lewat variabel CSS yang ada (`--brand`, `--ink`, `--ink-2`, `--surface`, `--line`, `--ok`, `--warn`,
  `--danger`, `--sky`, beserta `-soft` dan `-text`). Tema gelap otomatis mengikuti variabel itu.
- Pakai komponen yang ada:

| Kebutuhan | Komponen |
|---|---|
| Kerangka halaman bos (judul dan aksi kanan) | `Halaman` di `bos/umumBos.js` |
| Deret angka ringkasan | `Ringkasan` di `komponen/Ruang.js` |
| Panel, catatan, bagian formulir bernomor | `Panel`, `Catatan`, `LangkahForm` di `komponen/Ruang.js` |
| Pencarian, pilihan tab, keadaan kosong | `Cari`, `TabPilihan`, `Kosong` di `komponen/Ruang.js` |
| Ambil data, memuat, galat | `useData`, `Memuat`, `KotakGalat` di `komponen/umum.js` |
| Tambah/kurang angka, sakelar, dialog, notifikasi | `Stepper`, `Toggle`, `Modal`, `useToast` di `komponen/umum.js` |
| Label status | `Chip`, `ChipStatus`, `ChipRisiko` di `komponen/umum.js` |
| Ikon | `Ikon` di `komponen/Ikon.js` (nama: panah, kanan, menu, cari, ponsel, toko, kalender, qr, rumah, cek, silang, awas, kiri, lokasi, radar, dasbor, rit, orang, setuju, uang, galon, wa, alat, perisai, gerigi, sinyal, unduh, bintang, cetak, tambah, kunci, ulang, lab, keluar, kamera) |
| Bilah atas layar kurir | `KTop` di `kurir/KurirApp.js` |
| Rupiah, persen, tanggal WIB | `rp`, `pct`, `tglPanjang`, `hariIniWib` di `format.js` |

- Kelas dasar: `btn`, `btn-primary`, `btn-ghost`, `btn-lg`, `btn-block`, `card`, `chip ok|warn|danger|sky`,
  `banner warn|danger`, `field`, `input`, `table-wrap`, `list-btn`, `seg`, `stack`, `row`, `grid-2`.
- Teks antarmuka Bahasa Indonesia sederhana, Rupiah ditulis `Rp4.000`, ikon selalu disertai tulisan, dan status
  tidak boleh dibedakan hanya dengan warna.
- Layar kurir: tombol utama setinggi ≥ 72 px, teks ≥ 18 px, bisa dipakai satu tangan. Semua halaman harus
  nyaman di lebar 360 px tanpa geser ke samping.
- Jangan mengubah landing, logo, warna, atau tata letak yang ada kecuali prompt memintanya.

## 5. PWA (pemasangan di HP)

- `manifest.json`, `sw.js`, dan ikon sudah memenuhi syarat pemasangan Chrome. Jangan mengganti nama atau
  memindahkannya.
- Service worker hanya didaftarkan pada build produksi di HTTPS (`frontend/src/index.js`). Pemasangan tidak bisa
  dicoba di preview; coba di alamat hasil deploy.
- `sw.js` tidak pernah menyimpan respons `/api/`. Kalau berkas di daftar `CANGKANG` berubah, naikkan `VERSI`
  (misalnya `aquair-v5`).
- Hosting wajib menyajikan `/manifest.json`, `/sw.js`, `/ikon-192.png`, `/ikon-512.png`, `/ikon-maskable-512.png`,
  dan `/apple-touch-icon.png` sebagai berkas (status 200, bukan `index.html`). Semua jalur lain selain `/api`
  mengembalikan `index.html`.

## 6. Batas yang tidak boleh dilanggar

- Setiap query disaring `depot_id` pengguna yang masuk. Endpoint yang menerima ID menjawab 404 bila data milik
  depot lain.
- Endpoint kurir tidak pernah mengembalikan `qr_token`, kecuali `/api/kurir/demo/toko-simulasi` di depot demo.
- Depot demo tidak pernah meminta kamera atau lokasi asli perangkat.
- Jangan mengubah `backend/aquair/aturan.py` kecuali prompt memintanya. Tes contoh hitungan 4.4 harus tetap lulus.
- Batas demo: 10 depot demo baru per IP pengunjung per jam. IP dibaca fungsi `alamat_ip` di `api_publik.py` dan
  diatur lewat `AQUAIR_HEADER_IP` (header dari proxy tepercaya, misalnya `cf-connecting-ip`) atau
  `AQUAIR_PROXY_TEPERCAYA` (jumlah proxy di `X-Forwarded-For`, bawaan 1). Hasilnya terlihat di `/api/demo/ip-saya`.
- Jangan menaruh kredensial, kunci API, berkas `.env`, atau data pribadi di repo. Repo ini publik.

## 7. Serah terima

Setelah satu tahap selesai dan tes lulus: **Save to GitHub** ke repo `aquair` branch `main`, lalu kirim laporan
singkat.
