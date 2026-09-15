# Strategi lomba Emergent "Building Indonesia"

## Aturan yang menentukan strategi

- **Submit tutup Minggu, 20 Sep 2026 pukul 23:59 WIB**, tanpa masa tenggang.
- **Upvote tutup Jumat, 25 Sep 2026 pukul 23:59 WIB.**
- **Hanya 200 submission dengan upvote terbanyak yang dinilai juri.** Upvote adalah
  gerbang, bukan sekadar 20% nilai.
- Satu submission per peserta. Deploy dan submit adalah dua langkah terpisah.
- Nama dan deskripsi bisa diubah sampai 20 Sep, lalu dibekukan. Perbaikan aplikasi
  sesudahnya tetap otomatis ikut tampil.
- Menghapus submission menghapus semua upvote.
- **Vote berimbalan, akun palsu, dan tukar-vote = diskualifikasi.**
- Pengumuman Top 100 dan Top 10: 1 Okt. Final virtual: 8 Okt.

Sumber: [emergent.sh/ai-contests/building-indonesia](https://emergent.sh/ai-contests/building-indonesia)

## Rubrik → bagaimana AQUAIR menjawabnya

| Kriteria | Bobot | Jawaban AQUAIR |
|---|---|---|
| Dampak bisnis & potensi skala | 30% | Uang yang bocor setiap hari dan terukur dalam Rupiah ("tagihan kembali"). Pasarnya 78.378 depot terdaftar, dan air isi ulang adalah sumber air minum utama bagi 34,49% rumah tangga. Pola harga ganda toko/rumah juga ada di distribusi LPG, es batu, dan roti, jadi solusinya bisa diperluas. |
| Upvote | 20% | Submit Rabu 16 Sep supaya punya 9 hari untuk kampanye (lihat bawah). |
| Penyelesaian masalah | 20% | Satu masalah yang tajam dan nyata dari depot keluarga, dengan mekanisme yang menghapus insentif curang, bukan sekadar mencatat. |
| Penggunaan Emergent | 15% | Kode ditarik ke Emergent lewat integrasi GitHub, dilengkapi Ringkasan AI dengan Universal Key, lalu di-deploy dan dirawat di Emergent (web + backend + MongoDB). |
| UI/UX | 15% | Layar kurir dua tombol besar. Dasbor bos menaruh angka Rupiah paling depan. Mode demo bisa dicoba juri dalam 1 menit. |

## Jadwal

| Tanggal | Target | Pelaksana |
|---|---|---|
| Sel 15 Sep | Riset, spesifikasi, dan aplikasi lengkap yang lulus tes di laptop (selesai). Top-up dan Join the Contest. **Keluarga mulai mengumpulkan catatan kurir 7 hari terakhir** ([06](06-uji-coba-depot-keluarga.md)). | Asadin + AI + keluarga |
| Rab 16 Sep | Aplikasi lengkap (termasuk multi-produk) diunggah ke GitHub. Emergent menjalankan [prompt deploy](../prompts/deploy-ke-emergent.md): tes, Ringkasan AI, lalu **deploy sekali** dan **submit**. Mulai kampanye upvote. | Asadin + Emergent |
| **Kam 17 Sep** | Daftarkan depot keluarga, isi produk dan harga aslinya, cetak stiker QR, lalu coba kamera dan GPS di HP kurir. | Asadin |
| Jum 18 – Sab 19 Sep | **Uji coba di depot keluarga** 2–3 hari. Perbaikan kecil lewat Emergent bila perlu. | Keluarga + Emergent |
| **Min 20 Sep** | **Kunci nama dan deskripsi dengan angka nyata dari uji coba** sebelum 23:59. | Asadin |
| s.d. Jum 25 Sep | Kampanye upvote dan perbaikan kecil. | Asadin |

## Teks submission (draf — perbarui dengan angka uji coba)

**Nama:** AQUAIR — Anti-Curang Antar Galon untuk Depot Air Minum

**Deskripsi:**

> Di depot air minum keluarga kami, kurir membawa 40 galon setiap hari. Harga ke toko
> Rp3.000, ke rumah Rp4.000. Catatan kurir hampir selalu "36 toko, 4 rumah", padahal toko
> di rutenya masih punya stok yang belum laku. Selisih Rp1.000 per galon masuk ke kantong
> kurir, dan tidak pernah ketahuan karena uang setoran selalu cocok dengan catatan.
>
> AQUAIR membuat harga toko wajib punya bukti: kurir memindai stiker QR di dalam toko,
> lokasinya dicocokkan dengan titik toko, stok toko diperiksa kewajarannya, dan pemilik toko
> bisa mengonfirmasi sendiri. Klaim toko tanpa bukti otomatis dihitung harga rumah, jadi
> insentif untuk curang hilang tanpa perlu menuduh siapa pun. Bos melihat Radar Kecurangan
> lengkap dengan perkiraan kerugian dalam Rupiah, dan kurir yang jujur punya bukti yang
> melindunginya.
>
> [Isi setelah uji coba: hasil 3 hari di depot keluarga — rasio toko:rumah sebelum dan
> sesudah, dan selisih setoran per hari.]
>
> Ada 78.378 depot air minum terdaftar di Indonesia, dan air isi ulang adalah sumber air
> minum utama bagi 34,49% rumah tangga. Coba mode demo tanpa daftar: masuk sebagai Bos
> (`admin` / `admin`) atau Kurir (`kurir` / `kurir`).

## Naskah demo 90 detik (untuk juri dan video kampanye)

1. **0–15 s — masalah:** "Kurir bawa 40 galon. Toko Rp3.000, rumah Rp4.000. Catatannya
   selalu 36 toko." Tampilkan catatan lama.
2. **15–40 s — kurir:** masuk sebagai Kurir. Jual ke rumah (dua ketukan). Jual ke toko:
   simulasi scan QR di lokasi toko → status terverifikasi. Ulangi dengan "1,2 km dari toko"
   → aplikasi menyatakan dihitung harga rumah.
3. **40–70 s — bos:** tekan "Lihat sebagai: Bos". Penjualan tadi sudah ada di rit Rudi.
   Buka Radar 30 hari: hari-hari lama Rudi dengan 90% toko, 21 galon toko tanpa bukti, toko
   melebihi kapasitas, lengkap dengan Rupiah-nya.
4. **70–90 s — dampak:** kartu "Tagihan kembali 30 hari" dan grafik porsi toko Rudi yang
   turun (diberi label simulasi). Tutup dengan angka uji coba keluarga.

## Kampanye upvote (tanpa imbalan)

Setiap pemberi vote perlu akun Emergent gratis. Satu akun hanya bisa memberi satu vote per
aplikasi.

- **Lingkaran terdekat lebih dulu (16 Sep):** keluarga, teman, grup WhatsApp alumni dan
  kampus. Kirim tautan showcase beserta video 90 detik dan langkah membuat akun.
- **Komunitas yang relevan:** grup dan forum pengusaha depot air minum, UMKM, dan
  distribusi. Ceritakan kasusnya — ini masalah yang dikenali banyak pemilik usaha.
- **Konten:** satu video pendek "kurir curang 36 toko" untuk TikTok/Instagram/Reels,
  diakhiri ajakan mencoba demo dan memberi vote.
- **Jangan pernah** menawarkan imbalan, bertukar vote, atau membuat akun ganda.
