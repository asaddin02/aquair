/* AQUAIR prototipe — data contoh fiktif + mesin hitung sederhana (spesifikasi bagian 3–4). */
'use strict';

const HARGA = { toko: 3000, rumah: 4000 };
let SELISIH = HARGA.rumah - HARGA.toko;
const RADIUS = 75;
/* Setelan yang berlaku. Perubahan dari layar Pengaturan baru masuk ke sini saat bos menekan Simpan. */
const PENGATURAN = { hargaToko: 3000, hargaRumah: 4000, radius: RADIUS, garisDasar: 50, tanpaBuktiHargaRumah: true };

const rp = (n) => 'Rp' + Math.round(n).toLocaleString('id-ID');
const pct = (n) => Math.round(n * 100) + '%';
const HARI_INI = new Date();
HARI_INI.setHours(12, 0, 0, 0);
const tanggalKe = (i) => { const d = new Date(HARI_INI); d.setDate(d.getDate() - (29 - i)); return d; };
const fmtHari = (d) => d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short' });
const fmtTgl = (d) => d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
const fmtJam = (m) => String(Math.floor(m / 60)).padStart(2, '0') + '.' + String(m % 60).padStart(2, '0');
const tambahHari = (n) => { const d = new Date(HARI_INI); d.setDate(d.getDate() + n); return d; };

function acak(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const R = acak(20260915);
const antara = (a, b) => a + Math.floor(R() * (b - a + 1));

/* ---------- Pelanggan ---------- */
const NAMA_TOKO = ['Toko Sumber Rejeki', 'Toko Maju Jaya', 'Warung Barokah', 'Toko Sinar Harapan', 'Toko Makmur',
  'Warung Pojok', 'Toko Berkah Abadi', 'Toko Tiga Saudara', 'Warung Sederhana', 'Toko Lancar',
  'Toko Rukun', 'Warung Mekar', 'Toko Mekar Sari', 'Toko Harapan Baru', 'Warung Sejahtera',
  'Toko Mulia', 'Toko Sentosa', 'Warung Kita', 'Toko Amanah', 'Toko Subur'];
const NAMA_RUMAH = ['Bu Sari', 'Pak Anton', 'Bu Rina', 'Pak Budi', 'Bu Wati', 'Pak Joko', 'Bu Lina', 'Pak Hendra',
  'Bu Yuni', 'Pak Agus', 'Bu Dewi', 'Pak Slamet', 'Bu Nur', 'Pak Bambang', 'Bu Tuti', 'Pak Eko', 'Bu Ratna',
  'Pak Hadi', 'Bu Sri', 'Pak Imam', 'Bu Fitri', 'Pak Rahmat', 'Bu Indah', 'Pak Yanto', 'Bu Lestari', 'Pak Darto',
  'Bu Ani', 'Pak Wahyu', 'Bu Endang', 'Pak Gunawan'];

const PELANGGAN = [];
NAMA_TOKO.forEach((nama, i) => PELANGGAN.push({
  id: 't' + i, jenis: 'toko', nama, rute: i < 10 ? 'rudi' : 'dimas',
  x: antara(-1400, 1400), y: antara(-1400, 1400),
  kapasitas: antara(8, 15), laku: antara(1, 4), bolehBon: false,
  noWa: '', saldo: antara(2, 7), tidakKembali: 0, qr: 'AQ-' + (100000 + antara(0, 899999)).toString(36).toUpperCase(),
}));
for (let i = 0; i < 60; i++) {
  PELANGGAN.push({
    id: 'r' + i, jenis: 'rumah', nama: `${NAMA_RUMAH[i % 30]} (No. ${antara(2, 88)})`,
    x: antara(-1500, 1500), y: antara(-1500, 1500), bolehBon: [0, 5, 9].includes(i),
    noWa: '', saldo: antara(0, 3), tidakKembali: 0,
  });
}
PELANGGAN[0].stokKemarin = 9; PELANGGAN[0].kapasitas = 10; PELANGGAN[0].laku = 2;
[22, 31, 47, 12].forEach((k, j) => { PELANGGAN[k].saldo = 3 + j; PELANGGAN[k].tidakKembali = 16 + j * 5; });
const cariPelanggan = (id) => PELANGGAN.find((p) => p.id === id);
const tokoRute = (kurir) => PELANGGAN.filter((p) => p.jenis === 'toko' && p.rute === kurir);

const KURIR = [
  { id: 'dimas', nama: 'Dimas', hp: '0812-xxxx-0101', aktif: true, warna: 'var(--s-dimas)' },
  { id: 'rudi', nama: 'Rudi', hp: '0813-xxxx-0202', aktif: true, warna: 'var(--s-rudi)' },
  { id: 'sigit', nama: 'Sigit', hp: '0857-xxxx-0303', aktif: false, warna: 'var(--ink-3)' },
];

/* ---------- Riwayat 29 hari (hari 1–29); hari 30 = hari ini, dihitung dari penjualan ---------- */
function flag(kode, teks, rupiah, masuk) { return { kode, teks, rupiah, masuk }; }

function hariRudi(i) {
  const total = 40;
  if (i < 20) {
    const toko = 36 + antara(-1, 1), verif = 15 + antara(-1, 1), jauh = i % 3 === 0 ? 3 : 0;
    const tanpa = toko - verif, rumah = total - toko;
    const seharusnya = verif * HARGA.toko + tanpa * HARGA.rumah + rumah * HARGA.rumah;
    const menurutCatatan = toko * HARGA.toko + rumah * HARGA.rumah;
    const kurangSetor = [3, 8, 13, 17].includes(i);
    const fl = [
      flag('R1', `${toko} dari ${total} galon dicatat sebagai toko (${pct(toko / total)}). Garis dasar depot: 45%.`, 0, 'bocor'),
      flag('R2', `${tanpa} galon toko tanpa bukti → dihitung harga rumah.`, tanpa * SELISIH, 'tagihan'),
    ];
    if (jauh) fl.push(flag('R4', `QR ${NAMA_TOKO[1]} dipindai 1,2 km dari lokasi toko (${jauh} galon, sudah dihitung di R2).`, null, 'tagihan'));
    if (R() < 0.6) {
      const t = PELANGGAN[antara(0, 2)], lebih = antara(2, 4);
      fl.push(flag('R3', `${t.nama} menerima ${lebih + antara(2, 3)} galon, padahal perkiraan stoknya hampir penuh (kapasitas ${t.kapasitas}).`, lebih * SELISIH, 'bocor'));
    }
    if (kurangSetor) fl.push(flag('R6', `Setoran ${rp(menurutCatatan)}, seharusnya ${rp(seharusnya)}.`, seharusnya - menurutCatatan, 'bocor'));
    return { total, toko, verif, rumah, seharusnya, disetor: kurangSetor ? menurutCatatan : seharusnya, flags: fl };
  }
  const t2 = 40 + antara(-2, 1), toko = Math.round(t2 * 0.45) + antara(-1, 1);
  const verif = [22, 26].includes(i) ? toko - 1 : toko;
  const fl = verif < toko ? [flag('R2', `1 galon toko tanpa bukti (stiker ${NAMA_TOKO[4]} basah) → dihitung harga rumah.`, SELISIH, 'tagihan')] : [];
  const seharusnya = verif * HARGA.toko + (t2 - verif) * HARGA.rumah;
  return { total: t2, toko, verif, rumah: t2 - toko, seharusnya, disetor: seharusnya, flags: fl };
}

function hariDimas(i) {
  const total = 40 + antara(-1, 1), toko = Math.round(total * 0.45) + antara(-1, 1);
  const verif = [6, 15, 24].includes(i) ? toko - 1 : toko;
  const fl = [];
  if (verif < toko) fl.push(flag('R2', `1 galon toko tanpa bukti (HP kehilangan lokasi) → dihitung harga rumah.`, SELISIH, 'tagihan'));
  if (i === 11) fl.push(flag('R7', 'Stok berkurang 40 galon, catatan 39 galon. Catatan bos: 1 galon pecah di jalan.', HARGA.rumah, 'bocor'));
  const seharusnya = verif * HARGA.toko + (total - verif) * HARGA.rumah;
  return { total, toko, verif, rumah: total - toko, seharusnya, disetor: seharusnya, flags: fl };
}

const RIWAYAT = { dimas: [], rudi: [] };
for (let i = 0; i < 29; i++) { RIWAYAT.rudi.push(hariRudi(i)); RIWAYAT.dimas.push(hariDimas(i)); }

const GARIS_DASAR = (() => {
  const v = [];
  ['dimas', 'rudi'].forEach((k) => RIWAYAT[k].slice(15).forEach((h) => { if (h.verif / h.toko >= 0.8) v.push(h.toko / h.total); }));
  v.sort((a, b) => a - b);
  return v.length ? v[Math.floor(v.length / 2)] : 0.5;
})();

/* ---------- Hari ini ---------- */
function penjualan(kurir, menit, pelangganId, galon, kosong, opsi = {}) {
  const p = cariPelanggan(pelangganId);
  const jenis = opsi.jenis || p.jenis;
  const status = jenis === 'rumah' ? 'rumah' : (opsi.status || 'terverifikasi');
  const tanpaBukti = jenis === 'toko' && status !== 'terverifikasi';
  const harga = jenis === 'rumah' || (tanpaBukti && PENGATURAN.tanpaBuktiHargaRumah) ? HARGA.rumah : HARGA.toko;
  return {
    id: kurir + '-' + menit + '-' + pelangganId, kurir, menit, pelangganId, nama: p.nama, jenis, galon, kosong,
    bayar: opsi.bayar || 'tunai', status, jarak: status === 'tanpa_qr' ? null : (opsi.jarak ?? antara(5, 30)),
    harga, hargaTokoTanpaBukti: tanpaBukti && harga === HARGA.toko, disimulasikan: true,
  };
}

const RIT = {
  rudi: {
    kurir: 'rudi', dibawa: 40, muatanDicek: true, dicekJam: '07.05', berangkat: 432, status: 'aktif',
    isiPulang: null, kosongPulang: null, disetor: null,
    sales: [
      penjualan('rudi', 451, 't3', 3, 3), penjualan('rudi', 472, 'r0', 2, 2),
      penjualan('rudi', 494, 't4', 2, 2), penjualan('rudi', 520, 'r1', 1, 1),
      penjualan('rudi', 545, 't2', 2, 1), penjualan('rudi', 566, 'r2', 2, 2),
    ],
  },
  dimas: { kurir: 'dimas', dibawa: 40, muatanDicek: true, dicekJam: '06.30', berangkat: 400, status: 'selesai', isiPulang: 0, kosongPulang: 37, sales: [] },
};
(() => {
  let m = 410; const toko = tokoRute('dimas'); let t = 0, r = 0;
  for (let n = 0; n < 6; n++) { RIT.dimas.sales.push(penjualan('dimas', m += 13, toko[n].id, 3, 3)); t++; }
  for (let n = 0; n < 11; n++) { RIT.dimas.sales.push(penjualan('dimas', m += 11, 'r' + (20 + n * 3), 2, n === 4 ? 1 : 2)); r++; }
  RIT.dimas.sales.sort((a, b) => a.menit - b.menit);
  RIT.dimas.disetor = hitungSetoran(RIT.dimas).seharusnya;
})();

function hitungSetoran(rit) {
  const s = rit.sales;
  const catatan = s.reduce((a, x) => a + x.galon, 0);
  const seharusnya = s.filter((x) => x.bayar === 'tunai').reduce((a, x) => a + x.galon * x.harga, 0);
  const bon = s.filter((x) => x.bayar === 'bon').reduce((a, x) => a + x.galon * x.harga, 0);
  const stok = rit.isiPulang == null ? null : rit.dibawa - rit.isiPulang;
  return {
    catatan, seharusnya, bon, stok, diMotor: rit.dibawa - catatan,
    selisihGalon: stok == null ? null : stok - catatan,
    selisihUang: rit.disetor == null ? null : rit.disetor - seharusnya,
  };
}

/* Tanda dari luar penjualan hari ini (R8 dari halaman konfirmasi pemilik toko) */
const TANDA_TAMBAHAN = { dimas: [], rudi: [] };
function hargaTokoBerlaku(x) { return x.status === 'terverifikasi' || x.status === 'disetujui'; }

/* Radar untuk hari ini, dari penjualan nyata di prototipe */
function radarHariIni(kurir) {
  const rit = RIT[kurir], s = rit.sales, fl = [];
  const total = s.reduce((a, x) => a + x.galon, 0);
  const tokoSales = s.filter((x) => x.jenis === 'toko');
  const toko = tokoSales.reduce((a, x) => a + x.galon, 0);
  const verif = tokoSales.filter(hargaTokoBerlaku).reduce((a, x) => a + x.galon, 0);
  if (total >= 10 && (toko / total - GARIS_DASAR) >= 0.25) {
    fl.push(flag('R1', `${toko} dari ${total} galon dicatat sebagai toko (${pct(toko / total)}). Garis dasar depot: ${pct(GARIS_DASAR)}.`,
      Math.max(0, verif - Math.round(GARIS_DASAR * total)) * SELISIH, 'bocor'));
  }
  const tanpaBukti = tokoSales.filter((x) => !hargaTokoBerlaku(x)), galonDari = (l) => l.reduce((a, x) => a + x.galon, 0);
  const diamankan = galonDari(tanpaBukti.filter((x) => !x.hargaTokoTanpaBukti)), lolos = galonDari(tanpaBukti.filter((x) => x.hargaTokoTanpaBukti));
  if (diamankan) fl.push(flag('R2', `${diamankan} galon toko tanpa bukti → dihitung harga rumah.`, diamankan * SELISIH, 'tagihan'));
  if (lolos) fl.push(flag('R2', `${lolos} galon toko tanpa bukti tetap dibayar harga toko karena sakelar "harga rumah" dimatikan.`, lolos * SELISIH, 'bocor'));
  tokoSales.filter((x) => x.status === 'lokasi_jauh').forEach((x) =>
    fl.push(flag('R4', `QR ${x.nama} dipindai ${(x.jarak / 1000).toLocaleString('id-ID')} km dari lokasi toko (${x.galon} galon, sudah dihitung di R2).`, null, 'tagihan')));
  const perToko = {};
  tokoSales.filter(hargaTokoBerlaku).forEach((x) => { perToko[x.pelangganId] = (perToko[x.pelangganId] || 0) + x.galon; });
  Object.entries(perToko).forEach(([id, g]) => {
    const p = cariPelanggan(id), kemarin = p.stokKemarin ?? Math.min(p.kapasitas, 3);
    const sebelum = Math.max(0, kemarin - p.laku), hitung = sebelum + g;
    if (hitung > p.kapasitas) fl.push(flag('R3', `${p.nama} menerima ${g} galon, padahal perkiraan stoknya masih ${sebelum} dari kapasitas ${p.kapasitas}.`, (hitung - p.kapasitas) * SELISIH, 'bocor'));
  });
  const st = hitungSetoran(rit);
  if (rit.status !== 'aktif') {
    if (st.selisihUang < 0) fl.push(flag('R6', `Setoran ${rp(rit.disetor)}, seharusnya ${rp(st.seharusnya)}.`, -st.selisihUang, 'bocor'));
    if (st.selisihGalon !== 0) fl.push(flag('R7', `Stok berkurang ${st.stok} galon, catatan ${st.catatan} galon.`, st.selisihGalon > 0 ? st.selisihGalon * HARGA.rumah : 0, 'bocor'));
  }
  fl.push(...TANDA_TAMBAHAN[kurir]);
  return { total, toko, verif, rumah: total - toko, seharusnya: st.seharusnya, disetor: rit.disetor, flags: fl };
}

function risiko(flags) {
  if (!flags.length) return 'rendah';
  const kode = flags.map((f) => f.kode);
  const bocor = flags.filter((f) => f.masuk === 'bocor').reduce((a, f) => a + (f.rupiah || 0), 0);
  if (['R1', 'R3', 'R4', 'R6', 'R8'].some((k) => kode.includes(k)) || bocor >= 15000) return 'tinggi';
  return 'sedang';
}

/* ---------- Data pendukung (Tahap 1–3) ---------- */
const PERSETUJUAN = [
  { id: 'p1', jenis: 'pelanggan', judul: 'Pelanggan baru dari Rudi', isi: 'Pak Joko (No. 41) · rumah · dicatat kemarin 10.12', status: 'menunggu' },
  { id: 'p2', jenis: 'harga', judul: 'Minta harga toko — Dimas', isi: `${NAMA_TOKO[12]} · 3 galon · status lokasi_lemah (akurasi 140 m). Alasan kurir: "Di dalam toko, sinyal GPS lemah."`, status: 'menunggu' },
  { id: 'p3', jenis: 'koreksi', judul: 'Koreksi dari Dimas', isi: 'Bu Nur (No. 30) · galon kosong tertulis 1, seharusnya 2. Alasan: "Salah pencet."', status: 'menunggu' },
];
const BON = [
  { pelanggan: 'r0', tanggal: tambahHari(-6), galon: 2 }, { pelanggan: 'r0', tanggal: tambahHari(-2), galon: 2 },
  { pelanggan: 'r5', tanggal: tambahHari(-4), galon: 3 }, { pelanggan: 'r9', tanggal: tambahHari(-1), galon: 1 },
];
const KONFIRMASI = tokoRute('rudi').concat(tokoRute('dimas')).slice(0, 12).map((t, i) => ({
  pelanggan: t.id, tercatat: antara(8, 16),
  status: i < 2 ? 'benar' : i === 2 ? 'berbeda' : i < 6 ? 'menunggu' : 'belum',
}));
KONFIRMASI[2].tercatat = 12; KONFIRMASI[2].menurutToko = 8;
RIWAYAT.rudi[27].flags.push(flag('R8', `${cariPelanggan(KONFIRMASI[2].pelanggan).nama} menjawab 8 galon untuk minggu lalu, catatan 12 galon.`, 4 * SELISIH, 'bocor'));
const PERAWATAN = [
  { nama: 'Filter sedimen', interval: 90, terakhir: -97 },
  { nama: 'Filter karbon', interval: 180, terakhir: -176 },
  { nama: 'Filter mangan', interval: 300, terakhir: -121 },
  { nama: 'Lampu UV', interval: 365, terakhir: -203 },
  { nama: 'Membran RO', interval: 540, terakhir: -310 },
];
const KEPATUHAN = {
  ujiLab: { terakhir: -160, interval: 180 }, slhs: { berlakuSampai: 20 }, nib: '9120xxxxxxxxx (contoh)',
  periksa: [
    { teks: 'Tidak memakai galon bermerek', ok: true },
    { teks: 'Tidak memakai tutup bermerek', ok: false },
    { teks: 'Sumber air baku berizin', ok: true },
  ],
};
