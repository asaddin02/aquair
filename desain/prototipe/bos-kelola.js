/* AQUAIR prototipe — aplikasi bos: kelola data, Tahap 2, Tahap 3 (spesifikasi bagian 6–8). */
'use strict';

Object.assign(IKON, {
  cetak: '<path d="M7 9V3h10v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M7 14h10v7H7z"/>',
  tambah: '<path d="M12 5v14M5 12h14"/>',
  kunci: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  ulang: '<path d="M4 12a8 8 0 0 1 14-5.3L20 9"/><path d="M20 4v5h-5"/><path d="M20 12a8 8 0 0 1-14 5.3L4 15"/><path d="M4 20v-5h5"/>',
  lab: '<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3"/><path d="M7.5 15h9"/>',
});

/* Token QR: acak dan panjang, disimpan utuh supaya stiker bisa dicetak ulang. Hanya tampil di layar bos. */
const acakQR = acak(7331);
const buatToken = () => Array.from({ length: 24 }, () => '0123456789abcdefghijkmnpqrstuvwxyz'[Math.floor(acakQR() * 34)]).join('');
PELANGGAN.filter((p) => p.jenis === 'toko').forEach((p) => { p.qr = buatToken(); });

const fmtTglTahun = (d) => d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
const jarakTeks = (m) => m >= 1000 ? (m / 1000).toLocaleString('id-ID', { maximumFractionDigits: 1 }) + ' km' : m + ' m';
const pinAcak = () => Array.from({ length: 6 }, () => Math.floor(Math.random() * 10)).join('');
const galatDi = (el, teks) => { const g = el.closest('.modal, .approval, .auth, .card')?.querySelector('.galat'); if (g) g.textContent = teks; };

/* Log audit: setiap keputusan bos tercatat beserta sebelum, sesudah, dan alasannya. */
const pad2 = (n) => String(n).padStart(2, '0');
const isoTgl = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const waktuDari = (d, menit) => `${isoTgl(d)} ${pad2(Math.floor(menit / 60))}:${pad2(menit % 60)}`;
const jamSekarang = () => { const d = new Date(); return `${pad2(d.getHours())}.${pad2(d.getMinutes())}`; };
const LOG_AUDIT = [
  { waktu: waktuDari(tanggalKe(5), 1215), pengguna: 'Bos', aksi: 'Tanda Radar Rudi 5 hari pertama', sebelum: 'baru', sesudah: 'terbukti', alasan: 'Dicek ke toko langganan: stok masih penuh' },
  { waktu: waktuDari(tanggalKe(11), 1170), pengguna: 'Bos', aksi: `Tanda Radar Dimas ${fmtTgl(tanggalKe(11))}`, sebelum: 'baru', sesudah: 'sudah_dicek_aman', alasan: '1 galon pecah di jalan' },
  { waktu: waktuDari(HARI_INI, 390), pengguna: 'Bos', aksi: 'Muatan cocok — rit Dimas', sebelum: '40 galon', sesudah: '40 galon', alasan: '' },
  { waktu: waktuDari(HARI_INI, 425), pengguna: 'Bos', aksi: 'Muatan cocok — rit Rudi', sebelum: '40 galon', sesudah: '40 galon', alasan: '' },
];
function catatAudit(aksi, sebelum, sesudah, alasan) {
  const d = new Date();
  LOG_AUDIT.push({ waktu: waktuDari(HARI_INI, d.getHours() * 60 + d.getMinutes()), pengguna: 'Bos', aksi, sebelum: String(sebelum ?? ''), sesudah: String(sesudah ?? ''), alasan: alasan || '' });
}

function periodeLalu() {
  const senin = new Date(HARI_INI); senin.setDate(senin.getDate() - ((senin.getDay() + 6) % 7) - 7);
  const minggu = new Date(senin); minggu.setDate(minggu.getDate() + 6);
  const berlaku = new Date(minggu); berlaku.setDate(berlaku.getDate() + 8);
  const teks = senin.getMonth() === minggu.getMonth() ? `${senin.getDate()}–${fmtTgl(minggu)}` : `${fmtTgl(senin)} – ${fmtTgl(minggu)}`;
  return { teks, berlaku };
}

/* ---------- Pelanggan ---------- */
BOS.pelanggan = { judul: 'Pelanggan', isi: () => {
  const f = S.pelangganFilter, jumlah = (j) => PELANGGAN.filter((p) => p.jenis === j).length;
  const semua = PELANGGAN.filter((p) => f === 'semua' || p.jenis === f);
  const tampil = S.pelangganLebih ? semua : semua.slice(0, 24);
  const menunggu = PERSETUJUAN.filter((p) => p.jenis === 'pelanggan' && p.status === 'menunggu').length;
  const seg = [['semua', `Semua ${PELANGGAN.length}`], ['toko', `Toko ${jumlah('toko')}`], ['rumah', `Rumah ${jumlah('rumah')}`]]
    .map(([v, l]) => `<button aria-pressed="${f === v}" data-a="filterPelanggan" data-v="${v}">${l}</button>`).join('');
  const baris = tampil.map((p) => `<tr>
    <td><b>${esc(p.nama)}</b>${p.jenis === 'toko' ? `<div class="small muted">Rute ${NAMA_KURIR[p.rute]}</div>` : ''}</td>
    <td>${p.jenis === 'toko' ? `<span class="chip brand">${ikon('qr', 14)}Toko</span>` : `<span class="chip sky">${ikon('rumah', 14)}Rumah</span>`}</td>
    <td class="r num">${p.jenis === 'toko' ? p.kapasitas + ' galon' : '—'}</td>
    <td class="r num">${p.jenis === 'toko' ? p.laku + ' galon' : '—'}</td>
    <td class="num">${jarakTeks(Math.round(Math.hypot(p.x, p.y)))}</td>
    <td><button class="toggle" role="switch" aria-checked="${p.bolehBon}" aria-label="Boleh bon: ${esc(p.nama)}" data-a="bolehBon" data-v="${p.id}"></button></td>
    <td class="r"><button class="btn btn-ghost" data-a="formPelanggan" data-v="${p.id}">Ubah</button></td></tr>`).join('');
  return `${menunggu ? `<div class="banner sky">${ikon('orang', 22)}<span class="grow">${menunggu} pelanggan baru dari kurir menunggu persetujuan. Pelanggan dari kurir selalu berjenis rumah.</span><button class="btn" data-go="b:persetujuan">Periksa</button></div>` : ''}
    <div class="row between"><span class="seg" role="group" aria-label="Jenis pelanggan">${seg}</span>
      <button class="btn btn-primary" data-a="formPelanggan">${ikon('tambah', 18)}Tambah pelanggan</button></div>
    <div class="table-wrap"><table><thead><tr><th>Nama</th><th>Jenis</th><th class="r">Kapasitas simpan</th><th class="r">Laku per hari</th><th>Jarak dari depot</th><th>Boleh bon</th><th></th></tr></thead><tbody>${baris}</tbody></table></div>
    ${semua.length > tampil.length ? `<button class="btn btn-block" data-a="pelangganLebih">Tampilkan ${semua.length - tampil.length} pelanggan lagi</button>` : ''}
    <p class="small muted">Kapasitas dan laku per hari dipakai aturan R3 (stok toko tidak wajar). Bon mati secara bawaan, supaya penjualan tunai tidak bisa ditulis sebagai bon.</p>`;
} };

AKSI.filterPelanggan = (v) => { S.pelangganFilter = v; S.pelangganLebih = false; render(); };
AKSI.pelangganLebih = () => { S.pelangganLebih = true; render(); };
AKSI.bolehBon = (id) => { const p = cariPelanggan(id); p.bolehBon = !p.bolehBon; catatAudit(`Boleh bon — ${p.nama}`, p.bolehBon ? 'mati' : 'menyala', p.bolehBon ? 'menyala' : 'mati', ''); toast(`${p.nama}: bon ${p.bolehBon ? 'diizinkan' : 'tidak diizinkan'}`); };
AKSI.formPelanggan = (id) => {
  const p = id ? cariPelanggan(id) : null, toko = !p || p.jenis === 'toko';
  S.modal = `<h3>${p ? 'Ubah pelanggan' : 'Tambah pelanggan'}</h3>
    <div class="stack" style="margin-top:14px">
      <label class="field" for="pl-nama"><span>Nama</span><input id="pl-nama" class="input" value="${esc(p?.nama || '')}" placeholder="Contoh: Toko Sinar Pagi"></label>
      <label class="field" for="pl-jenis"><span>Jenis</span><select id="pl-jenis" class="input"><option value="toko" ${toko ? 'selected' : ''}>Toko (${rp(HARGA.toko)}/galon)</option><option value="rumah" ${toko ? '' : 'selected'}>Rumah (${rp(HARGA.rumah)}/galon)</option></select></label>
      <label class="field" for="pl-wa"><span>Nomor WhatsApp <span class="hint">opsional</span></span><input id="pl-wa" class="input" inputmode="tel" placeholder="08…"></label>
      <div class="field"><span>Titik lokasi</span><button class="btn" data-a="lokasiSaya">${ikon('lokasi', 18)}Pakai lokasi saya sekarang</button>
        <label class="sr" for="pl-titik">Ketik titik lokasi</label><input id="pl-titik" class="input" placeholder="atau ketik: lintang, bujur"><span class="hint">Tekan tombol saat berdiri di dalam toko atau rumah pelanggan.</span></div>
      <div class="form-grid" style="grid-template-columns:1fr 1fr">
        <label class="field" for="pl-kap"><span>Kapasitas simpan <span class="hint">toko</span></span><div class="input-unit"><input id="pl-kap" inputmode="numeric" value="${p?.kapasitas ?? 10}"><span>galon</span></div></label>
        <label class="field" for="pl-laku"><span>Laku per hari <span class="hint">toko</span></span><div class="input-unit"><input id="pl-laku" inputmode="numeric" value="${p?.laku ?? 2}"><span>galon</span></div></label>
      </div>
      <label class="row" for="pl-bon" style="--gap:8px"><input id="pl-bon" type="checkbox" ${p?.bolehBon ? 'checked' : ''}> Boleh bon</label>
      <p class="galat" role="alert"></p>
      <div class="row" style="justify-content:flex-end"><button class="btn" data-a="tutupModal">Batal</button><button class="btn btn-primary" data-a="simpanPelanggan" data-v="${p?.id || ''}">Simpan</button></div>
    </div>`;
  render();
};
AKSI.lokasiSaya = () => { const el = document.getElementById('pl-titik'); if (el) el.value = 'Depot demo: lokasi disimulasikan'; };
AKSI.simpanPelanggan = (id, el) => {
  const nilai = (k) => document.getElementById(k).value.trim();
  if (!nilai('pl-nama')) { galatDi(el, 'Isi nama pelanggan dulu.'); return; }
  const data = { nama: nilai('pl-nama'), jenis: nilai('pl-jenis'), kapasitas: Number(nilai('pl-kap')) || 10, laku: Number(nilai('pl-laku')) || 2, bolehBon: document.getElementById('pl-bon').checked };
  if (id) Object.assign(cariPelanggan(id), data);
  else PELANGGAN.unshift({ id: 'n' + Date.now(), x: 0, y: 0, rute: 'rudi', saldo: 0, tidakKembali: 0, noWa: '', qr: buatToken(), ...data });
  S.modal = null; toast(id ? 'Perubahan disimpan dan tercatat di log audit' : 'Pelanggan ditambahkan');
};

/* ---------- Stiker QR ---------- */
BOS.qr = { judul: 'Stiker QR', isi: () => {
  const toko = PELANGGAN.filter((p) => p.jenis === 'toko');
  return `<div class="banner sky no-print">${ikon('kunci', 22)}<span>Isi QR adalah token acak yang panjang. Token hanya tampil di layar bos; HP kurir di depot sungguhan tidak pernah menerimanya. Kalau stiker difoto atau dicopot, tekan <b>Ganti QR</b>: token lama langsung tidak berlaku.</span></div>
    <div class="row between no-print"><span class="small muted">${toko.length} stiker · kertas A4, 3 kolom × 4 baris</span>
      <button class="btn btn-primary" data-a="cetakQR">${ikon('cetak', 18)}Cetak A4</button></div>
    <div class="qr-sheet">${toko.map((p) => `<div class="sticker">
      <span class="brand-mark">AQUAIR · TIRTA SEJAHTERA</span>
      <canvas data-qr="${p.qr}" width="280" height="280" role="img" aria-label="Kode QR ${esc(p.nama)}"></canvas>
      <b>${esc(p.nama)}</b><span style="font-size:13px">Tempel di dalam toko</span>
      <span class="token">token …${p.qr.slice(-6)}</span>
      <button class="btn no-print" data-a="gantiQR" data-v="${p.id}">${ikon('ulang', 16)}Ganti QR</button></div>`).join('')}</div>`;
} };

AKSI.cetakQR = () => toast('Di aplikasi, tombol ini membuka dialog cetak A4');
AKSI.gantiQR = (id) => { const p = cariPelanggan(id); const lama = p.qr.slice(-6); p.qr = buatToken(); catatAudit(`Ganti QR — ${p.nama}`, `token …${lama}`, `token …${p.qr.slice(-6)}`, ''); toast(`QR baru untuk ${p.nama}. Stiker lama tidak berlaku.`); };

const setelahRenderBos = AKSI._setelahRender;
AKSI._setelahRender = () => {
  setelahRenderBos?.();
  document.querySelectorAll('canvas[data-qr]').forEach((c) => {
    if (window.QRious) { new QRious({ element: c, value: 'aquair:' + c.dataset.qr, size: 280, level: 'M', padding: 12, foreground: '#0F2524', background: '#ffffff' }); return; }
    const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, 280, 280); g.fillStyle = '#5F7775'; g.font = '600 18px sans-serif'; g.textAlign = 'center'; g.fillText('QR tidak termuat', 140, 145);
  });
};

/* ---------- Persetujuan ---------- */
const JENIS_SETUJU = { pelanggan: ['Pelanggan baru', 'sky'], harga: ['Minta harga toko', 'warn'], koreksi: ['Koreksi penjualan', 'brand'] };
BOS.persetujuan = { judul: 'Persetujuan', isi: () => {
  const menunggu = PERSETUJUAN.filter((p) => p.status === 'menunggu'), sudah = PERSETUJUAN.filter((p) => p.status !== 'menunggu');
  const kartu = (p) => {
    const [label, kelas] = JENIS_SETUJU[p.jenis], pakaiAlasan = p.jenis !== 'pelanggan';
    const setuju = p.jenis === 'pelanggan'
      ? `<button class="btn btn-primary" data-a="putuskan" data-v="${p.id}:rumah">Setujui sebagai rumah</button><button class="btn" data-a="putuskan" data-v="${p.id}:toko">Jadikan toko</button>`
      : `<button class="btn btn-primary" data-a="putuskan" data-v="${p.id}:setuju">${p.jenis === 'harga' ? 'Setujui harga toko' : 'Setujui koreksi'}</button>`;
    return `<article class="card approval"><span class="chip ${kelas}" style="justify-self:start">${label}</span>
      <div><b>${esc(p.judul)}</b><p class="small" style="color:var(--ink-2);margin-top:2px">${esc(p.isi)}</p></div>
      <div class="aksi">${pakaiAlasan ? `<label class="sr" for="alasan-${p.id}">Alasan keputusan</label><input id="alasan-${p.id}" class="input" placeholder="Alasan (wajib, masuk log audit)">` : ''}${setuju}
        <button class="btn btn-danger" data-a="putuskan" data-v="${p.id}:tolak">Tolak</button></div>
      <p class="galat" role="alert"></p></article>`;
  };
  const hasil = { rumah: ['ok', 'Disetujui sebagai rumah'], toko: ['ok', 'Dijadikan toko'], setuju: ['ok', 'Disetujui'], tolak: ['danger', 'Ditolak'] };
  return `<p class="muted small" style="max-width:70ch">Semua keputusan tercatat di log audit beserta alasannya. Penjualan yang disetujui untuk harga toko bernilai Rp0 di Radar, dan tandanya otomatis ditandai aman.</p>
    ${menunggu.length ? `<div class="stack">${menunggu.map(kartu).join('')}</div>` : `<div class="card">${ikon('cek', 18)} Tidak ada yang menunggu keputusan.</div>`}
    ${sudah.length ? `<section class="card"><h3 style="font-size:16px">Sudah diputuskan</h3><ul class="list">${sudah.map((p) => `<li><span class="grow"><b>${esc(p.judul)}</b><br><span class="small muted">${esc(p.isi)}${p.alasan ? ` · Alasan: ${esc(p.alasan)}` : ''}</span></span><span class="chip ${hasil[p.status][0]}">${hasil[p.status][1]}</span></li>`).join('')}</ul></section>` : ''}`;
} };

AKSI.putuskan = (v, el) => {
  const [id, keputusan] = v.split(':'), p = PERSETUJUAN.find((x) => x.id === id);
  const alasan = document.getElementById('alasan-' + id)?.value.trim();
  if (p.jenis !== 'pelanggan' && !alasan) { galatDi(el, 'Tulis alasan dulu. Alasan disimpan di log audit.'); return; }
  p.status = keputusan; p.alasan = alasan;
  if (p.jenis === 'pelanggan' && p.pelangganId) cariPelanggan(p.pelangganId).jenis = keputusan === 'toko' ? 'toko' : 'rumah';
  const x = p.saleId ? RIT.rudi.sales.find((s) => s.id === p.saleId) : null;
  if (x && p.jenis === 'harga' && keputusan === 'setuju') { x.status = 'disetujui'; x.harga = HARGA.toko; x.hargaTokoTanpaBukti = false; }
  if (x && p.jenis === 'koreksi' && keputusan === 'setuju') {
    const pl = cariPelanggan(x.pelangganId); pl.saldo = Math.max(0, pl.saldo + (p.galonBaru - x.galon)); x.galon = p.galonBaru;
  }
  catatAudit(p.judul, 'menunggu', keputusan, alasan);
  toast(keputusan === 'tolak' ? 'Ditolak dan tercatat di log audit' : 'Disetujui dan tercatat di log audit');
};

/* ---------- Bon belum lunas ---------- */
BOS.bon = { judul: 'Bon belum lunas', isi: () => {
  const dariRit = ['rudi', 'dimas'].flatMap((k) => RIT[k].sales).filter((x) => x.bayar === 'bon' && !x.lunas)
    .map((x) => ({ pelanggan: x.pelangganId, tanggal: HARI_INI, galon: x.galon, harga: x.harga }));
  const semua = BON.filter((b) => !b.lunas).map((b) => ({ ...b, harga: HARGA.rumah })).concat(dariRit);
  const grup = {};
  semua.forEach((b) => { (grup[b.pelanggan] ||= []).push(b); });
  const total = semua.reduce((a, b) => a + b.galon * b.harga, 0);
  const kartu = Object.entries(grup).map(([id, isi]) => {
    const p = cariPelanggan(id), jml = isi.reduce((a, b) => a + b.galon * b.harga, 0);
    return `<article class="card stack" style="--gap:10px"><div class="row between"><b style="font-size:16px">${esc(p.nama)}</b><span class="num" style="font:800 22px/1 var(--f-head)">${rp(jml)}</span></div>
      <ul class="list small">${isi.map((b) => `<li><span class="grow">${fmtHari(b.tanggal)}</span><span class="num">${b.galon} galon × ${rp(b.harga)}</span></li>`).join('')}</ul>
      <button class="btn btn-primary" style="justify-self:start" data-a="lunas" data-v="${id}">${ikon('cek', 18)}Lunas</button></article>`;
  }).join('');
  return `<div class="grid-2"><div class="hero-tile"><div class="eyebrow">Belum dibayar</div><div class="angka">${rp(total)}</div>
      <p>dari ${Object.keys(grup).length} pelanggan. Tekan Lunas saat uangnya sudah diterima.</p></div>
    <div class="card flat small" style="align-self:start"><b>Kenapa bon dicatat terpisah?</b><p style="margin-top:4px;color:var(--ink-2)">Kalau bon bebas dipilih dan tidak pernah ditagih, kurir bisa menulis penjualan tunai sebagai bon lalu mengantongi uangnya. Karena itu bon hanya bisa dipilih untuk pelanggan yang diizinkan, dan setiap bon menunggu di sini sampai lunas.</p></div></div>
    ${kartu ? `<div class="grid-2">${kartu}</div>` : `<div class="card">${ikon('cek', 18)} Semua bon sudah lunas.</div>`}`;
} };
AKSI.lunas = (id) => {
  catatAudit(`Bon lunas — ${cariPelanggan(id).nama}`, 'belum lunas', 'lunas', '');
  BON.filter((b) => b.pelanggan === id).forEach((b) => { b.lunas = true; });
  ['rudi', 'dimas'].flatMap((k) => RIT[k].sales).filter((x) => x.pelangganId === id && x.bayar === 'bon').forEach((x) => { x.lunas = true; });
  toast(`Bon ${cariPelanggan(id).nama} lunas`);
};

/* ---------- Kurir ---------- */
BOS.kurir = { judul: 'Kurir', isi: () => `
  <div class="row between"><p class="small muted" style="max-width:60ch">Kurir masuk dengan nomor HP dan PIN 6 digit, dan hanya melihat rit miliknya sendiri. 5 kali salah PIN mengunci akun 15 menit.</p>
    <button class="btn btn-primary" data-a="tambahKurir">${ikon('tambah', 18)}Tambah kurir</button></div>
  <div class="table-wrap"><table><thead><tr><th>Kurir</th><th>Nomor HP</th><th>Hari ini</th><th>Status</th><th></th></tr></thead><tbody>
  ${KURIR.map((k) => {
    const rit = RIT[k.id];
    const hari = !rit ? '<span class="muted">Tidak ada rit</span>' : rit.status === 'aktif' ? '<span class="chip sky">Di jalan</span>' : `<span class="chip ok">${ikon('cek', 14)}Rit selesai</span>`;
    return `<tr><td><div class="row" style="--gap:10px"><span class="avatar" style="background:${k.warna}">${esc(k.nama[0])}</span><b>${esc(k.nama)}</b></div></td>
      <td class="num">${esc(k.hp)}</td><td>${hari}</td>
      <td><div class="row" style="--gap:8px;flex-wrap:nowrap"><button class="toggle" role="switch" aria-checked="${k.aktif}" aria-label="Kurir ${esc(k.nama)} aktif" data-a="kurirAktif" data-v="${k.id}"></button><span class="small">${k.aktif ? 'Aktif' : 'Nonaktif'}</span></div></td>
      <td class="r"><button class="btn" data-a="aturPin" data-v="${k.id}">${ikon('kunci', 16)}Atur ulang PIN</button></td></tr>`;
  }).join('')}</tbody></table></div>` };

function modalPin(k) {
  const pin = pinAcak();
  S.modal = `<h3>PIN baru untuk ${esc(k.nama)}</h3>
    <div class="pin" style="margin:16px 0" aria-label="PIN ${pin.split('').join(' ')}">${pin.split('').map((d) => `<span>${d}</span>`).join('')}</div>
    <p class="small" style="color:var(--ink-2)">Berikan langsung ke kurir. PIN hanya ditampilkan sekali dan disimpan dalam bentuk acak (hash), jadi bos pun tidak bisa melihatnya lagi.</p>
    <div class="row" style="margin-top:14px;justify-content:flex-end"><button class="btn btn-primary" data-a="tutupModal">Sudah dicatat</button></div>`;
  render();
}
AKSI.aturPin = (id) => { const k = KURIR.find((x) => x.id === id); catatAudit(`Atur ulang PIN — ${k.nama}`, 'PIN lama', 'PIN baru', ''); modalPin(k); };
AKSI.kurirAktif = (id) => { const k = KURIR.find((x) => x.id === id); k.aktif = !k.aktif; catatAudit(`Status kurir — ${k.nama}`, k.aktif ? 'nonaktif' : 'aktif', k.aktif ? 'aktif' : 'nonaktif', ''); toast(`${k.nama} ${k.aktif ? 'diaktifkan' : 'dinonaktifkan — tidak bisa masuk lagi'}`); };
AKSI.tambahKurir = () => {
  S.modal = `<h3>Tambah kurir</h3><div class="stack" style="margin-top:14px">
    <label class="field" for="kr-nama"><span>Nama</span><input id="kr-nama" class="input" placeholder="Nama panggilan"></label>
    <label class="field" for="kr-hp"><span>Nomor HP</span><input id="kr-hp" class="input" inputmode="tel" placeholder="08…"></label>
    <p class="small muted">PIN 6 digit dibuat otomatis setelah disimpan.</p><p class="galat" role="alert"></p>
    <div class="row" style="justify-content:flex-end"><button class="btn" data-a="tutupModal">Batal</button><button class="btn btn-primary" data-a="simpanKurir">Simpan dan buat PIN</button></div></div>`;
  render();
};
AKSI.simpanKurir = (_, el) => {
  const nama = document.getElementById('kr-nama').value.trim(), hp = document.getElementById('kr-hp').value.replace(/\D/g, '');
  if (!nama) { galatDi(el, 'Isi nama kurir dulu.'); return; }
  if (hp.length < 10) { galatDi(el, 'Nomor HP minimal 10 angka, contoh 0812…'); return; }
  const k = { id: 'k' + Date.now(), nama, hp: `${hp.slice(0, 4)}-xxxx-${hp.slice(-4)}`, aktif: true, warna: 'var(--ink-3)' };
  KURIR.push(k); modalPin(k);
};

/* ---------- Pengaturan ---------- */
BOS.pengaturan = { judul: 'Pengaturan', isi: () => {
  const P = (S.aturDraf ||= { ...PENGATURAN }), salah = P.hargaRumah <= P.hargaToko;
  const berubah = Object.keys(P).some((k) => P[k] !== PENGATURAN[k]);
  const angka = (id, label, ket, nilai, depan, belakang) => `<div class="setting"><label for="${id}"><b>${label}</b></label><p>${ket}</p>
    <div class="ctrl input-unit">${depan ? `<span>${depan}</span>` : ''}<input id="${id}" class="num" inputmode="numeric" value="${nilai}" data-ubah="atur">${belakang ? `<span>${belakang}</span>` : ''}</div></div>`;
  return `<section class="card"><div class="sec-head"><h3>Harga per galon</h3></div>
      ${angka('set-toko', 'Harga toko', 'Hanya berlaku untuk penjualan toko yang terverifikasi atau disetujui bos.', P.hargaToko, 'Rp')}
      ${angka('set-rumah', 'Harga rumah', 'Berlaku untuk rumah dan untuk klaim toko tanpa bukti.', P.hargaRumah, 'Rp')}
      <div class="setting"><b>Selisih harga</b><p>Dipakai untuk menghitung Tagihan kembali dan Perkiraan bocor.</p><span class="ctrl num" style="font:800 22px/1 var(--f-head)">${salah ? '—' : rp(P.hargaRumah - P.hargaToko)}</span></div>
      ${salah ? `<div class="banner danger" role="alert">${ikon('awas', 22)}<span>Harga rumah harus lebih tinggi dari harga toko. Kalau tidak, aturan harga tidak punya arti.</span></div>` : ''}</section>
    <section class="card"><div class="sec-head"><h3>Verifikasi dan Radar</h3></div>
      ${angka('set-radius', 'Radius verifikasi', 'Jarak maksimal HP kurir dari titik toko saat scan QR.', P.radius, '', 'm')}
      ${angka('set-dasar', 'Garis dasar porsi toko', 'Dipakai R1 sampai depot punya 14 hari data terverifikasi sendiri.', P.garisDasar, '', '%')}
      <div class="setting"><b>Toko tanpa bukti dihitung harga rumah</b><p>${P.tanpaBuktiHargaRumah ? 'Menyala: klaim toko tanpa QR atau dari lokasi jauh dibayar harga rumah. Rupiahnya masuk Tagihan kembali.' : 'Mati: klaim tanpa bukti tetap dibayar harga toko, dan Rupiahnya pindah ke Perkiraan bocor.'}</p>
        <span class="ctrl"><button class="toggle" role="switch" aria-checked="${P.tanpaBuktiHargaRumah}" aria-label="Toko tanpa bukti dihitung harga rumah" data-a="aturKebijakan"></button></span></div></section>
    <div class="row"><button class="btn btn-primary" data-a="simpanAtur" ${salah || !berubah ? 'disabled' : ''}>Simpan pengaturan</button>${berubah ? '<span class="chip warn">Belum disimpan</span>' : ''}
      <span class="small muted" style="flex-basis:100%">Berlaku untuk penjualan berikutnya; penjualan yang sudah tersimpan tetap memakai harganya. Di prototipe, Radar hari ini dihitung ulang, tetapi riwayat 29 hari contoh tidak.</span></div>
    <section class="card flat stack" style="--gap:8px"><div class="row between"><h3 style="font-size:16px">Depot demo</h3><span class="chip warn">Data contoh</span></div>
      <p class="small" style="color:var(--ink-2)">Depot contoh ini milik browser kamu sendiri dan terhapus otomatis 24 jam setelah dibuat.</p>
      <button class="btn" style="justify-self:start" data-a="aturUlang">${ikon('ulang', 18)}Atur ulang data demo</button></section>`;
} };
AKSI.atur = (v, el) => {
  const kunci = { 'set-toko': 'hargaToko', 'set-rumah': 'hargaRumah', 'set-radius': 'radius', 'set-dasar': 'garisDasar' }[el.id];
  S.aturDraf[kunci] = Number(String(v).replace(/\D/g, '')) || 0; render();
};
AKSI.aturKebijakan = () => { S.aturDraf.tanpaBuktiHargaRumah = !S.aturDraf.tanpaBuktiHargaRumah; render(); };
AKSI.simpanAtur = () => {
  const lama = PENGATURAN, baru = S.aturDraf, ringkas = (P) => `toko ${rp(P.hargaToko)}, rumah ${rp(P.hargaRumah)}, radius ${P.radius} m, garis dasar ${P.garisDasar}%, harga rumah untuk tanpa bukti ${P.tanpaBuktiHargaRumah ? 'menyala' : 'mati'}`;
  catatAudit('Ubah pengaturan', ringkas(lama), ringkas(baru), '');
  Object.assign(PENGATURAN, baru); S.aturDraf = null;
  HARGA.toko = PENGATURAN.hargaToko; HARGA.rumah = PENGATURAN.hargaRumah; SELISIH = HARGA.rumah - HARGA.toko;
  toast('Disimpan. Berlaku untuk penjualan berikutnya.');
};

/* ---------- Tahap 2: Galon di luar ---------- */
BOS.galon = { judul: 'Galon di luar', isi: () => {
  const ada = PELANGGAN.filter((p) => p.saldo > 0).sort((a, b) => b.saldo - a.saldo);
  const macet = PELANGGAN.filter((p) => p.saldo > 0 && p.tidakKembali > 14).sort((a, b) => b.tidakKembali - a.tidakKembali);
  const jumlah = (l) => l.reduce((a, p) => a + p.saldo, 0), tampil = S.galonLebih ? ada : ada.slice(0, 12);
  const baris = (p, lama) => `<tr><td><b>${esc(p.nama)}</b></td><td>${p.jenis === 'toko' ? '<span class="chip brand">Toko</span>' : '<span class="chip sky">Rumah</span>'}</td>
    <td class="r num"><b>${p.saldo}</b> galon</td>${lama ? `<td class="r"><span class="chip warn">${ikon('awas', 14)}${p.tidakKembali} hari lalu</span></td>` : ''}
    <td class="r"><button class="btn btn-ghost" data-a="koreksiSaldo" data-v="${p.id}">Koreksi saldo</button></td></tr>`;
  return `<div class="grid-2">
      <div class="hero-tile"><div class="eyebrow">Galon depot di pelanggan</div><div class="angka">${jumlah(ada)} galon</div>
        <p>di ${ada.length} pelanggan. Saldo bertambah sebanyak galon isi diserahkan dikurangi galon kosong diambil di setiap penjualan.</p></div>
      <div class="hero-tile"><div class="eyebrow">Tidak ada galon kosong kembali &gt; 14 hari</div><div class="angka" style="color:var(--warn-text)">${jumlah(macet)} galon</div>
        <p>di ${macet.length} pelanggan. Minta kurir menanyakannya di rit berikutnya sebelum galonnya hilang.</p></div></div>
    <section class="stack"><div class="sec-head"><h3>Perlu ditanyakan</h3></div>
      <div class="table-wrap"><table><thead><tr><th>Pelanggan</th><th>Jenis</th><th class="r">Saldo</th><th class="r">Kosong terakhir kembali</th><th></th></tr></thead><tbody>${macet.map((p) => baris(p, true)).join('')}</tbody></table></div></section>
    <section class="stack"><div class="sec-head"><h3>Semua pelanggan</h3><span class="small muted">saldo terbesar dulu</span></div>
      <div class="table-wrap"><table><thead><tr><th>Pelanggan</th><th>Jenis</th><th class="r">Saldo</th><th></th></tr></thead><tbody>${tampil.map((p) => baris(p, false)).join('')}</tbody></table></div>
      ${ada.length > tampil.length ? `<button class="btn btn-block" data-a="galonLebih">Tampilkan ${ada.length - tampil.length} pelanggan lagi</button>` : ''}</section>`;
} };
AKSI.galonLebih = () => { S.galonLebih = true; render(); };
AKSI.koreksiSaldo = (id) => {
  const p = cariPelanggan(id);
  S.modal = `<h3>Koreksi saldo galon</h3><p class="small muted" style="margin-top:4px">${esc(p.nama)} · saldo sekarang ${p.saldo} galon</p>
    <div class="stack" style="margin-top:14px">
      <label class="field" for="saldo-baru"><span>Saldo yang benar</span><div class="input-unit"><input id="saldo-baru" inputmode="numeric" value="${p.saldo}"><span>galon</span></div></label>
      <label class="field" for="saldo-alasan"><span>Alasan</span><input id="saldo-alasan" class="input" placeholder="Contoh: 2 galon dikembalikan langsung ke depot"></label>
      <p class="galat" role="alert"></p>
      <div class="row" style="justify-content:flex-end"><button class="btn" data-a="tutupModal">Batal</button><button class="btn btn-primary" data-a="simpanSaldo" data-v="${id}">Simpan koreksi</button></div></div>`;
  render();
};
AKSI.simpanSaldo = (id, el) => {
  const baru = Number(document.getElementById('saldo-baru').value.replace(/\D/g, '')), alasan = document.getElementById('saldo-alasan').value.trim();
  if (!alasan) { galatDi(el, 'Tulis alasan dulu. Koreksi saldo tercatat di log audit.'); return; }
  const p = cariPelanggan(id); catatAudit(`Koreksi saldo galon — ${p.nama}`, `${p.saldo} galon`, `${baru} galon`, alasan); p.saldo = baru; if (baru === 0) p.tidakKembali = 0;
  S.modal = null; toast(`Saldo ${p.nama} menjadi ${baru} galon`);
};

/* ---------- Tahap 2: Konfirmasi toko ---------- */
const LABEL_KONF = { belum: ['Belum dikirim', 'line'], menunggu: ['Menunggu jawaban', 'sky'], benar: ['Benar', 'ok'], berbeda: ['Berbeda', 'danger'] };
BOS.konfirmasi = { judul: 'Konfirmasi toko', isi: () => {
  const per = periodeLalu(), hit = (s) => KONFIRMASI.filter((k) => k.status === s).length;
  const baris = KONFIRMASI.map((k, n) => {
    const t = cariPelanggan(k.pelanggan), [label, kelas] = LABEL_KONF[k.status];
    const beda = k.status === 'berbeda' ? `${k.menurutToko} galon <span class="danger-t">(${k.menurutToko - k.tercatat > 0 ? '+' : '−'}${Math.abs(k.menurutToko - k.tercatat)})</span>` : k.status === 'benar' ? `${k.tercatat} galon` : '—';
    const aksi = k.status === 'berbeda' ? '<button class="btn btn-ghost" data-go="b:radar">Lihat R8 di Radar</button>'
      : k.status === 'benar' ? '' : `<button class="btn" data-a="kirimKonfirmasi" data-v="${n}">${ikon('wa', 16)}${k.status === 'belum' ? 'Kirim lewat WhatsApp' : 'Kirim ulang'}</button>`;
    return `<tr><td><b>${esc(t.nama)}</b><div class="small muted">Rute ${NAMA_KURIR[t.rute]}</div></td><td class="r num">${k.tercatat} galon</td>
      <td><span class="chip ${kelas}">${label}</span></td><td class="r num">${beda}</td><td class="r">${aksi}</td></tr>`;
  }).join('');
  return `<div class="row between"><div><h3 style="font-size:17px">Minggu ${per.teks}</h3><p class="small muted">Tautan per toko berlaku sampai ${fmtHari(per.berlaku)}. Pemilik toko menjawab tanpa akun.</p></div>
      <button class="btn btn-ghost" data-go="konfirmasi">Lihat halaman yang dibuka toko</button></div>
    <div class="grid-4">${['belum', 'menunggu', 'benar', 'berbeda'].map((s) => `<div class="card mini"><span class="ket">${LABEL_KONF[s][0]}</span><span class="angka" ${s === 'berbeda' && hit(s) ? 'style="color:var(--danger-text)"' : ''}>${hit(s)} toko</span></div>`).join('')}</div>
    <div class="table-wrap"><table><thead><tr><th>Toko</th><th class="r">Tercatat</th><th>Status</th><th class="r">Menurut toko</th><th></th></tr></thead><tbody>${baris}</tbody></table></div>
    <p class="small muted">Jawaban lebih sedikit dari catatan memunculkan R8 di Radar. Di depot demo, tombol WhatsApp hanya menampilkan pratinjau pesan.</p>`;
} };
AKSI.kirimKonfirmasi = (n) => {
  const k = KONFIRMASI[n], t = cariPelanggan(k.pelanggan), per = periodeLalu();
  S.konfKirim = Number(n);
  S.modal = `<h3>Pratinjau pesan WhatsApp</h3><p class="small muted" style="margin:4px 0 12px">Depot demo tidak membuka WhatsApp, karena nomor contoh bisa saja milik orang sungguhan. Di depot sungguhan, pesan ini terbuka di HP bos lewat wa.me.</p>
    <div class="wa-bubble">Halo ${esc(t.nama)}, dari Depot Tirta Sejahtera. Minggu ${per.teks} kami mencatat ${k.tercatat} galon diantar ke toko Bapak/Ibu. Mohon dibantu cek lewat tautan ini, cukup satu ketukan:
https://aquair.contoh/k/${buatToken().slice(0, 10)}</div>
    <div class="row" style="margin-top:14px;justify-content:flex-end"><button class="btn" data-a="tutupModal">Tutup</button><button class="btn btn-primary" data-a="tandaiTerkirim">Tandai terkirim</button></div>`;
  render();
};
AKSI.tandaiTerkirim = () => { KONFIRMASI[S.konfKirim].status = 'menunggu'; S.modal = null; toast('Ditandai terkirim — menunggu jawaban toko'); };

/* ---------- Tahap 3: Perawatan mesin ---------- */
BOS.perawatan = { judul: 'Perawatan mesin', isi: () => {
  const kartu = PERAWATAN.map((p, n) => ({ p, n, sisa: p.interval + p.terakhir })).sort((a, b) => a.sisa - b.sisa).map(({ p, n, sisa }) => {
    const pakai = Math.min(1, -p.terakhir / p.interval);
    const [kelas, teks] = sisa < 0 ? ['danger', `Terlambat ${-sisa} hari`] : sisa <= 7 ? ['warn', `${sisa} hari lagi`] : ['ok', `${sisa} hari lagi`];
    return `<article class="card stack" style="--gap:10px">
      <div class="row between"><b style="font-size:16px">${p.nama}</b><span class="chip ${kelas}">${ikon(kelas === 'ok' ? 'cek' : 'awas', 14)}${teks}</span></div>
      <div class="meter" role="img" aria-label="${pct(pakai)} masa pakai terlewati"><i class="${kelas}" style="width:${pct(pakai)}"></i></div>
      <div class="row between small muted"><span>Diganti ${fmtTglTahun(tambahHari(p.terakhir))} · tiap ${p.interval} hari</span><span>Jadwal ${fmtTglTahun(tambahHari(sisa))}</span></div>
      <button class="btn" style="justify-self:start" data-a="sudahGanti" data-v="${n}">Sudah diganti hari ini</button></article>`;
  }).join('');
  return `<p class="muted small" style="max-width:70ch">Interval bawaan mengikuti umur pakai umum tiap komponen dan bisa diubah. Pengingat muncul di dasbor 7 hari sebelum jadwal.</p><div class="grid-2">${kartu}</div>`;
} };
AKSI.sudahGanti = (n) => { PERAWATAN[n].terakhir = 0; toast(`${PERAWATAN[n].nama} dicatat diganti hari ini`); };

/* ---------- Tahap 3: Kepatuhan ---------- */
BOS.kepatuhan = { judul: 'Kepatuhan', isi: () => {
  const U = KEPATUHAN.ujiLab, ujiSisa = U.interval + U.terakhir, slhs = KEPATUHAN.slhs.berlakuSampai;
  const chipSisa = (h) => h < 0 ? `<span class="chip danger">${ikon('awas', 14)}Lewat ${-h} hari</span>` : h <= 30 ? `<span class="chip warn">${ikon('awas', 14)}${h} hari lagi</span>` : `<span class="chip ok">${ikon('cek', 14)}${h} hari lagi</span>`;
  const periksa = KEPATUHAN.periksa.map((c, n) => `<li><button class="toggle" role="switch" aria-checked="${c.ok}" aria-label="${esc(c.teks)}" data-a="periksa" data-v="${n}"></button>
    <span class="grow">${esc(c.teks)}</span>${c.ok ? `<span class="chip ok">${ikon('cek', 14)}Sesuai</span>` : `<span class="chip danger">${ikon('awas', 14)}Perlu tindakan</span>`}</li>`).join('');
  return `<div class="grid-2">
      <article class="card stack" style="--gap:8px"><div class="row between"><div class="row" style="--gap:8px">${ikon('lab', 20)}<b style="font-size:16px">Uji lab kualitas air</b></div>${chipSisa(ujiSisa)}</div>
        <div class="hitung"><span>Terakhir</span><span class="num">${fmtTglTahun(tambahHari(U.terakhir))}</span><span>Berikutnya</span><span class="num"><b>${fmtTglTahun(tambahHari(ujiSisa))}</b></span><span>Interval</span><span class="num">${U.interval} hari</span></div>
        <p class="small muted">Isi interval sesuai ketentuan dinas kesehatan setempat.</p>
        <button class="btn" style="justify-self:start" data-a="catatUji">Catat hasil uji baru</button></article>
      <article class="card stack" style="--gap:8px"><div class="row between"><div class="row" style="--gap:8px">${ikon('perisai', 20)}<b style="font-size:16px">Sertifikat laik higiene (SLHS)</b></div>${chipSisa(slhs)}</div>
        <div class="hitung"><span>Berlaku sampai</span><span class="num"><b>${fmtTglTahun(tambahHari(slhs))}</b></span><span>NIB</span><span class="mono">${KEPATUHAN.nib}</span></div>
        <p class="small muted">Urus perpanjangan sebelum masa berlaku habis.</p></article></div>
    <section class="card"><div class="sec-head"><h3>Daftar periksa aturan Kemendag 2026</h3><span class="small muted">galon dan tutup bermerek</span></div>
      <ul class="list" style="margin-top:6px">${periksa}</ul></section>`;
} };
AKSI.periksa = (n) => { const c = KEPATUHAN.periksa[n]; c.ok = !c.ok; render(); };
AKSI.catatUji = () => { KEPATUHAN.ujiLab.terakhir = 0; toast('Uji lab dicatat hari ini. Jadwal berikutnya diperbarui.'); };

/* ---------- Cek muatan (spesifikasi 3.1) ---------- */
AKSI.muatanCocok = (k) => {
  const rit = RIT[k]; rit.muatanDicek = true; rit.dicekJam = jamSekarang();
  catatAudit(`Muatan cocok — rit ${NAMA_KURIR[k]}`, `${rit.dibawa} galon`, `${rit.dibawa} galon`, '');
  toast(`Muatan ${NAMA_KURIR[k]} dicek: ${rit.dibawa} galon`);
};
AKSI.betulkanMuatan = (k) => {
  const rit = RIT[k];
  S.modal = `<h3>Betulkan muatan ${NAMA_KURIR[k]}</h3><p class="small muted" style="margin-top:4px">Kurir menulis ${rit.dibawa} galon.</p>
    <div class="stack" style="margin-top:14px">
      <label class="field" for="muatan-baru"><span>Jumlah hasil hitungan bos</span><div class="input-unit"><input id="muatan-baru" inputmode="numeric" value="${rit.dibawa}"><span>galon</span></div></label>
      <label class="field" for="muatan-alasan"><span>Alasan</span><input id="muatan-alasan" class="input" placeholder="Contoh: dihitung ulang di motor, ada 45 galon"></label>
      <p class="galat" role="alert"></p>
      <div class="row" style="justify-content:flex-end"><button class="btn" data-a="tutupModal">Batal</button><button class="btn btn-primary" data-a="simpanMuatan" data-v="${k}">Simpan</button></div></div>`;
  render();
};
AKSI.simpanMuatan = (k, el) => {
  const rit = RIT[k], baru = Number(document.getElementById('muatan-baru').value.replace(/\D/g, '')), alasan = document.getElementById('muatan-alasan').value.trim();
  if (!baru) { galatDi(el, 'Isi jumlah galon hasil hitungan.'); return; }
  if (!alasan) { galatDi(el, 'Tulis alasan dulu. Perubahan muatan tercatat di log audit.'); return; }
  catatAudit(`Muatan dibetulkan — rit ${NAMA_KURIR[k]}`, `${rit.dibawa} galon`, `${baru} galon`, alasan);
  const lama = rit.dibawa; rit.dibawa = baru; rit.muatanDicek = true; rit.dicekJam = jamSekarang();
  S.modal = null; toast(`Muatan ${NAMA_KURIR[k]}: ${lama} → ${baru} galon`);
};

/* ---------- Unduh data (CSV) ---------- */
const JENIS_CSV = { penjualan: 'Penjualan', rit: 'Rit & setoran', tanda: 'Tanda Radar', audit: 'Log audit' };
S.csvJenis = 'penjualan'; S.csvHari = 30;
/* Sel teks: cegah rumus Excel (=, +, -, @) dan bungkus bila berisi pemisah. Sel angka: bilangan bulat. */
const selTeks = (v) => { let t = String(v ?? ''); if (/^[=+\-@]/.test(t)) t = "'" + t; return /[;"\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; };
const selAngka = (v) => (v == null || v === '' ? '' : String(Math.round(v)));
const STATUS_TANDA = { baru: 'baru', aman: 'sudah_dicek_aman', terbukti: 'terbukti' };

function isiCsv(jenis, hari) {
  const dari = 30 - hari;
  if (jenis === 'penjualan') {
    const kepala = ['waktu', 'kurir', 'pelanggan', 'jenis', 'galon_isi', 'galon_kosong', 'bayar', 'status_verifikasi', 'jarak_m', 'harga_berlaku', 'total', 'dicatat_offline', 'disimulasikan'];
    const baris = ['rudi', 'dimas'].flatMap((k) => RIT[k].sales).sort((a, b) => a.menit - b.menit).map((x) => [
      selTeks(waktuDari(HARI_INI, x.menit)), selTeks(NAMA_KURIR[x.kurir]), selTeks(x.nama), x.jenis, selAngka(x.galon), selAngka(x.kosong), x.bayar,
      x.status, selAngka(x.jarak), selAngka(x.harga), selAngka(x.galon * x.harga), x.offline ? 'ya' : 'tidak', 'ya']);
    return { kepala, baris };
  }
  if (jenis === 'rit') {
    const kepala = ['tanggal', 'kurir', 'dibawa', 'terjual_catatan', 'galon_toko', 'galon_toko_terverifikasi', 'galon_rumah', 'uang_seharusnya', 'uang_disetor', 'selisih_uang', 'status'];
    const baris = [];
    for (let i = dari; i < 30; i++) ['dimas', 'rudi'].forEach((k) => {
      const h = semuaHari(k)[i], rit = RIT[k], hariIni = i === 29, aktif = hariIni && rit.status === 'aktif';
      const disetor = hariIni ? rit.disetor : h.disetor;
      baris.push([isoTgl(tanggalKe(i)), NAMA_KURIR[k], selAngka(hariIni ? rit.dibawa : h.total), selAngka(h.total), selAngka(h.toko), selAngka(h.verif), selAngka(h.rumah),
        selAngka(h.seharusnya), aktif ? '' : selAngka(disetor), aktif ? '' : selAngka(disetor - h.seharusnya), aktif ? 'aktif' : hariIni && !rit.diterima ? 'selesai' : 'diterima']);
    });
    return { kepala, baris };
  }
  if (jenis === 'tanda') {
    const kepala = ['tanggal', 'kurir', 'kode', 'penjelasan', 'perkiraan_rupiah', 'masuk_ke', 'status'];
    const baris = [];
    for (let i = dari; i < 30; i++) ['dimas', 'rudi'].forEach((k) => semuaHari(k)[i].flags.forEach((f) => baris.push([
      isoTgl(tanggalKe(i)), NAMA_KURIR[k], f.kode, selTeks(f.teks), selAngka(f.rupiah), f.rupiah == null ? '' : f.masuk === 'tagihan' ? 'tagihan_kembali' : 'perkiraan_bocor', STATUS_TANDA[statusGrup(k, i)]])));
    return { kepala, baris };
  }
  const batas = isoTgl(tanggalKe(dari));
  const kepala = ['waktu', 'pengguna', 'aksi', 'sebelum', 'sesudah', 'alasan'];
  const baris = LOG_AUDIT.filter((l) => l.waktu.slice(0, 10) >= batas).sort((a, b) => a.waktu.localeCompare(b.waktu))
    .map((l) => [selTeks(l.waktu), selTeks(l.pengguna), selTeks(l.aksi), selTeks(l.sebelum), selTeks(l.sesudah), selTeks(l.alasan)]);
  return { kepala, baris };
}
const namaBerkasCsv = () => `aquair-${S.csvJenis === 'rit' ? 'rit-setoran' : S.csvJenis === 'tanda' ? 'tanda-radar' : S.csvJenis === 'audit' ? 'log-audit' : 'penjualan'}-${isoTgl(tanggalKe(30 - S.csvHari))}_${isoTgl(HARI_INI)}.csv`;

BOS.unduh = { judul: 'Unduh data', isi: () => {
  const { kepala, baris } = isiCsv(S.csvJenis, S.csvHari);
  const teks = [kepala.join(';'), ...baris.slice(0, 12).map((b) => b.join(';'))].join('\n');
  const seg = (nama, pilihan, aksi, nilai) => `<div class="field"><span>${nama}</span><div><span class="seg" role="group" aria-label="${nama}">${pilihan.map(([v, l]) => `<button aria-pressed="${nilai === v}" data-a="${aksi}" data-v="${v}">${l}</button>`).join('')}</span></div></div>`;
  return `<p class="muted small" style="max-width:70ch">Simpan salinan data depot di luar aplikasi, atau olah di Excel dan Google Sheets. Isinya hanya data depot ini.</p>
    <section class="card stack" style="--gap:14px">
      ${seg('Jenis data', Object.entries(JENIS_CSV), 'csvJenis', S.csvJenis)}
      ${seg('Rentang', [['1', 'Hari ini'], ['7', '7 hari'], ['30', '30 hari']], 'csvHari', String(S.csvHari))}
      <div class="row"><button class="btn btn-primary" data-a="unduhCsv">${ikon('unduh', 18)}Unduh CSV</button><span class="mono small muted">${namaBerkasCsv()}</span></div>
    </section>
    <section class="stack"><div class="sec-head"><h3>Pratinjau isi berkas</h3><span class="small muted">${baris.length} baris data${baris.length > 12 ? ' · 12 pertama' : ''}</span></div>
      <div class="table-wrap"><pre class="csv">${esc(teks)}</pre></div>
      ${S.csvJenis === 'penjualan' && S.csvHari > 1 ? '<p class="small muted">Riwayat contoh hanya menyimpan ringkasan harian, jadi penjualan per baris di prototipe berisi hari ini saja. Di aplikasi, semua penjualan dalam rentang ikut.</p>' : ''}
      <p class="small muted" style="max-width:75ch">Pemisah titik koma dan UTF-8 BOM supaya kolomnya langsung terpisah di Excel berbahasa Indonesia. Uang ditulis bilangan bulat tanpa "Rp". Teks yang diawali = + - @ diberi awalan ' supaya tidak dijalankan sebagai rumus.</p></section>`;
} };
AKSI.csvJenis = (v) => { S.csvJenis = v; render(); };
AKSI.csvHari = (v) => { S.csvHari = Number(v); render(); };
AKSI.unduhCsv = () => {
  catatAudit('Unduh data CSV', '', namaBerkasCsv(), '');
  toast('Di aplikasi, berkas CSV langsung terunduh. Isinya seperti pratinjau.');
};
