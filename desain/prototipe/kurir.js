/* AQUAIR prototipe — aplikasi kurir (spesifikasi bagian 3 dan 10.3). */
'use strict';

const K = S.k;
const ritR = () => RIT.rudi;
const namaStatus = { terverifikasi: 'Terverifikasi', lokasi_jauh: 'Lokasi jauh', lokasi_lemah: 'Lokasi lemah', tanpa_qr: 'Tanpa QR', rumah: 'Harga rumah', disetujui: 'Disetujui bos' };
function chipStatus(s) {
  const kelas = s === 'terverifikasi' || s === 'disetujui' ? 'ok' : s === 'rumah' ? 'sky' : 'warn';
  const ik = s === 'terverifikasi' || s === 'disetujui' ? ikon('cek', 14) : s === 'rumah' ? ikon('rumah', 14) : ikon('awas', 14);
  return `<span class="chip ${kelas}">${ik}${namaStatus[s]}</span>`;
}
const stepper = (field, nilai, label, hint = '') => `<div class="field"><span>${label}${hint ? ` <span class="hint">${hint}</span>` : ''}</span>
  <div class="stepper"><button data-a="step" data-v="${field}:-1" aria-label="Kurangi ${label}">−</button><output class="num" aria-live="polite">${nilai}</output><button data-a="step" data-v="${field}:1" aria-label="Tambah ${label}">+</button></div></div>`;

function kTop(judul, kembali = 'beranda') {
  return `<div class="k-top"><button class="k-back" data-a="kLangkah" data-v="${kembali}" aria-label="Kembali">${ikon('kiri', 22)}</button><h2>${judul}</h2></div>`;
}
function demoBar() {
  return `<div class="demo-bar"><span>DATA CONTOH</span><span class="seg" role="group" aria-label="Lihat sebagai"><button aria-pressed="true">Kurir</button><button aria-pressed="false" data-go="b:dasbor">Bos</button></span></div>`;
}
function gagalSinyal() {
  if (!K.gagal) return '';
  return `<div class="banner danger" role="alert">${ikon('sinyal', 22)}<div class="stack" style="--gap:8px"><b>Belum tersimpan — tidak ada sinyal</b>
    <div class="row" style="--gap:8px"><button class="btn" data-a="simpan">Coba lagi</button><button class="btn" data-a="antrekan">Simpan di HP, kirim nanti ${tahapChip(2)}</button></div></div></div>`;
}

/* ---------- Layar ---------- */
const KL = {};

KL.mulai = () => `${demoBar()}<div class="k-top"><h2>Halo, Rudi</h2></div><div class="k-body">
  <p>Belum ada rit hari ini. Hitung galon isi di motor, lalu mulai rit.</p>
  ${stepper('mulaiGalon', K.mulaiGalon ?? 40, 'Galon isi yang dibawa')}
  <button class="btn btn-primary btn-lg btn-block" data-a="mulaiRit">Mulai rit</button>
  <p class="small muted">Bos akan mengecek jumlah muatan. Sebelum dicek, rit tetap bisa berjalan.</p></div>`;

KL['mulai-tunggu'] = () => `${demoBar()}<div class="k-top"><h2>Rit dimulai</h2></div><div class="k-body">
  <div class="hasil info"><div class="ikon">${ikon('rit', 30)}</div><div class="judul">Berangkat ${fmtJam(432)}</div>
  <p>Muatan ${K.mulaiGalon ?? 40} galon</p>${ritR().muatanDicek ? `<span class="chip ok">${ikon('cek', 14)}Muatan dicek bos ${ritR().dicekJam}</span>` : `<span class="chip warn">${ikon('awas', 14)}Muatan belum dicek bos</span>`}</div>
  <button class="btn btn-primary btn-lg btn-block" data-a="kLangkah" data-v="beranda">Lanjut ke rit</button>
  <button class="btn btn-ghost btn-block" data-a="lihatRit" data-v="rudi">Lihat sebagai bos: cek muatan</button></div>`;

KL.beranda = () => {
  const rit = ritR(), st = hitungSetoran(rit), antreData = K.antreanData;
  const sales = antreData.map((x) => ({ ...x, diAntre: true })).reverse().concat([...rit.sales].reverse());
  const selesai = rit.status !== 'aktif', galonAntre = antreData.reduce((a, x) => a + x.galon, 0);
  const antre = !K.sinyal ? `<div class="banner warn">${ikon('sinyal', 22)}<div><b>Tidak ada sinyal</b>${antreData.length ? `<br>Menunggu sinyal (${antreData.length}) — dikirim otomatis saat sinyal kembali.` : ''}</div></div>` : '';
  const pasang = K.langkah === 'pasang' ? `<div class="card" style="border:2px solid var(--brand)"><div class="row between"><b>Pasang AQUAIR di HP</b>${tahapChip(3)}</div>
    <p class="small" style="margin:6px 0 10px">Buka lebih cepat dari layar utama, seperti aplikasi biasa.</p>
    <div class="row"><button class="btn btn-primary" data-a="pasang">${ikon('unduh', 18)}Pasang aplikasi</button><button class="btn btn-ghost" data-a="kLangkah" data-v="beranda">Nanti</button></div>
    <p class="small muted" style="margin-top:8px">Tidak muncul? Di Chrome, ketuk ⋮ lalu "Tambahkan ke layar utama".</p></div>` : '';
  return `${demoBar()}<div class="k-top"><div class="grow"><h2>Halo, Rudi</h2><p class="small muted">Rit hari ini · berangkat ${fmtJam(rit.berangkat)}</p></div></div>
  <div class="k-body">${pasang}${antre}
    <div class="card"><div class="k-load">
      <div><div class="eyebrow">Di motor</div><div class="big num">${st.diMotor - galonAntre}</div><div class="small muted">galon isi</div></div>
      <div><div class="eyebrow">Terjual</div><div class="big num">${st.catatan + galonAntre}</div><div class="small muted">dari ${rit.dibawa} galon</div></div></div>
      <div style="margin-top:10px">${rit.muatanDicek ? `<span class="chip ok">${ikon('cek', 14)}Muatan dicek bos ${rit.dicekJam}</span>` : `<span class="chip warn">Muatan belum dicek</span>`}</div></div>
    ${selesai ? `<div class="hasil info"><div class="judul">Rit selesai</div><p>Setoran ${rp(rit.disetor)} menunggu dihitung ulang bos.</p></div>
      <button class="btn btn-block btn-lg" data-a="aturUlang">Atur ulang data demo</button>` : `
    <button class="btn btn-primary btn-kurir" data-a="kLangkah" data-v="toko-pilih">${ikon('qr', 38)}<span>JUAL KE TOKO<small>Scan stiker QR di dalam toko</small></span></button>
    <button class="btn btn-kurir rumah" data-a="kLangkah" data-v="rumah-pilih">${ikon('rumah', 38)}<span>JUAL KE RUMAH<small>Pilih pembeli</small></span></button>`}
    <div><div class="row between"><h3 style="font-size:17px">Penjualan hari ini</h3><span class="small muted">${sales.length} catatan</span></div>
      ${sales.map((x) => `<div class="k-sale"><div><b>${esc(x.nama)}</b><div class="t">${fmtJam(x.menit)} · ${x.galon} galon${x.diAntre ? '' : ` × ${rp(x.harga)}`}${x.bayar === 'bon' ? ' · bon' : ''}${x.offline && !x.diAntre ? ' · dicatat tanpa sinyal' : ''}</div></div>
        <div style="text-align:right">${x.diAntre ? `<span class="chip warn">${ikon('sinyal', 14)}Menunggu sinyal</span>` : `${chipStatus(x.status)}<div><button class="btn-ghost btn small" style="min-height:30px;padding:2px 6px" data-a="koreksi" data-v="${x.id}">Ajukan koreksi</button></div>`}</div></div>`).join('')}
    </div>
    ${selesai ? '' : `<button class="btn btn-lg btn-block" data-a="kLangkah" data-v="selesai">Selesai rit & setor</button>`}
  </div>`;
};

KL['toko-pilih'] = () => {
  const d = K.draft || {};
  const judul = d.tanpaQr ? 'Toko tanpa QR' : 'Simulasi scan QR toko';
  return `${kTop(judul)}<div class="k-body">
    ${d.tanpaQr ? `<div class="banner warn">${ikon('awas', 22)}<span>Tanpa scan QR, penjualan <b>dihitung harga rumah ${rp(HARGA.rumah)}</b>. Bos bisa menyetujui harga toko nanti.</span></div>`
    : `<div class="scan-view" aria-hidden="true"><div class="frame"></div><p>Di depot sungguhan, kamera terbuka di sini</p></div>
       <p class="small muted">Depot demo tidak memakai kamera. Pilih toko untuk menyimulasikan hasil scan.</p>`}
    <div>${tokoRute('rudi').map((t) => `<button class="list-btn" data-a="pilihToko" data-v="${t.id}">${ikon(d.tanpaQr ? 'awas' : 'qr', 24)}<span class="grow"><b>${t.nama}</b><br><span class="small muted">Stiker QR ${d.tanpaQr ? 'tidak bisa dipindai' : 'terpasang'}</span></span></button>`).join('')}</div>
    ${d.tanpaQr ? '' : `<button class="btn btn-block" data-a="tanpaQr">${ikon('awas', 18)}Toko tanpa QR (stiker rusak/hilang)</button>`}
  </div>`;
};

KL['toko-posisi'] = () => {
  const t = cariPelanggan(K.draft.toko);
  return `${kTop('Posisi kamu', 'toko-pilih')}<div class="k-body">
    <div class="card flat"><span class="chip ok">${ikon('qr', 14)}QR sah</span><h3 style="margin-top:8px">${t.nama}</h3></div>
    <p>Di depot sungguhan, lokasi HP diambil otomatis. Di demo, pilih posisi:</p>
    <button class="choice" data-a="posisi" data-v="dekat">${ikon('lokasi', 26)}<b>Di lokasi toko</b><small>±10 m dari titik toko, akurasi 15 m</small></button>
    <button class="choice" data-a="posisi" data-v="jauh">${ikon('awas', 26)}<b>1,2 km dari toko</b><small>Seperti QR yang difoto lalu dipindai di tempat lain</small></button>
  </div>`;
};

function formBayar(p, baru) {
  const bon = p && p.bolehBon && !baru;
  const bayar = K.draft.bayar || 'tunai';
  return `<div class="field"><span>Bayar</span><div class="grid-2" style="grid-template-columns:1fr 1fr;gap:8px">
    <button class="choice" style="grid-template-columns:1fr" aria-pressed="${bayar === 'tunai'}" data-a="bayar" data-v="tunai"><b>Tunai</b></button>
    <button class="choice" style="grid-template-columns:1fr" aria-pressed="${bayar === 'bon'}" data-a="bayar" data-v="bon" ${bon ? '' : 'disabled'}><b>Bon</b></button></div>
    ${bon ? '' : `<span class="hint">${baru ? 'Pembeli baru selalu tunai.' : 'Bon belum diizinkan bos untuk pelanggan ini.'}</span>`}</div>`;
}

KL['toko-form'] = () => {
  const d = K.draft, t = cariPelanggan(d.toko);
  const lok = d.tanpaQr ? '<span class="chip warn">Tanpa QR — harga rumah</span>'
    : d.posisi === 'jauh' ? `<span class="chip warn">${ikon('lokasi', 14)}1.200 m dari titik toko</span>` : `<span class="chip ok">${ikon('lokasi', 14)}${d.jarak} m dari titik toko · akurasi 15 m</span>`;
  return `${kTop(t.nama, d.tanpaQr ? 'toko-pilih' : 'toko-posisi')}<div class="k-body">
    <div class="row" style="--gap:6px">${d.tanpaQr ? '' : `<span class="chip ok">${ikon('qr', 14)}QR sah</span>`}${lok}</div>
    ${d.posisi === 'dekat' && !d.tanpaQr ? '' : ''}
    ${stepper('galon', d.galon, 'Galon isi diserahkan')}
    ${stepper('kosong', d.kosong, 'Galon kosong diambil')}
    ${formBayar(t)}
    ${gagalSinyal()}
    <button class="btn btn-primary btn-lg btn-block" data-a="simpan">Simpan penjualan</button>
    ${d.tanpaQr || d.posisi === 'jauh' ? '' : '<button class="btn btn-ghost btn-block" data-a="noop">Ambil ulang lokasi</button>'}
  </div>`;
};

KL['rumah-pilih'] = () => {
  const rumah = PELANGGAN.filter((p) => p.jenis === 'rumah').map((p) => ({ p, j: Math.round(Math.hypot(p.x - 120, p.y + 340)) })).sort((a, b) => a.j - b.j).slice(0, 7);
  return `${kTop('Jual ke rumah')}<div class="k-body">
    <button class="btn btn-sky btn-lg btn-block" data-a="kLangkah" data-v="rumah-baru">+ Pembeli baru</button>
    <div><div class="eyebrow" style="margin-bottom:4px">Terdekat dari posisimu</div>
    ${rumah.map(({ p, j }) => `<button class="list-btn" data-a="pilihRumah" data-v="${p.id}">${ikon('rumah', 24)}<span class="grow"><b>${esc(p.nama)}</b><br><span class="small muted">${j} m${p.bolehBon ? ' · boleh bon' : ''}</span></span></button>`).join('')}</div>
  </div>`;
};

KL['rumah-baru'] = () => `${kTop('Pembeli baru', 'rumah-pilih')}<div class="k-body">
  <label class="field" for="nama-baru"><span>Nama pembeli</span><input id="nama-baru" class="input" value="${esc(K.draft.namaBaru || 'Pak Joko (No. 41)')}" data-ubah="namaBaru"></label>
  <label class="field" for="hp-baru"><span>Nomor HP <span class="hint">opsional</span></span><input id="hp-baru" class="input" inputmode="tel" placeholder="08…" data-ubah="hpBaru"></label>
  <div class="banner sky">${ikon('rumah', 22)}<span>Pembeli baru dari kurir selalu dicatat sebagai <b>rumah</b>. Hanya bos yang bisa mengubahnya menjadi toko.</span></div>
  <button class="btn btn-primary btn-lg btn-block" data-a="pembeliBaru">Lanjut</button></div>`;

KL['rumah-form'] = () => {
  const d = K.draft, p = d.pelanggan ? cariPelanggan(d.pelanggan) : null;
  return `${kTop(p ? p.nama : d.namaBaru, 'rumah-pilih')}<div class="k-body">
    <span class="chip sky">${ikon('rumah', 14)}Harga rumah ${rp(HARGA.rumah)}</span>
    ${stepper('galon', d.galon, 'Galon isi diserahkan')}
    ${stepper('kosong', d.kosong, 'Galon kosong diambil')}
    ${formBayar(p, !p)}
    ${gagalSinyal()}
    <button class="btn btn-primary btn-lg btn-block" data-a="simpan">Simpan penjualan</button></div>`;
};

KL.hasil = () => {
  const x = K.hasil, ok = x.status === 'terverifikasi', rumah = x.status === 'rumah';
  const kelas = ok ? 'ok' : rumah ? 'info' : 'warn';
  const judul = ok ? 'Terverifikasi' : rumah ? 'Tersimpan' : 'Tidak terverifikasi';
  const alasan = ok ? `QR sah · ${x.jarak} m dari titik toko (batas ${PENGATURAN.radius} m)`
    : x.status === 'lokasi_jauh' ? `QR sah, tetapi posisimu ${x.jarak.toLocaleString('id-ID')} m dari titik toko (batas ${PENGATURAN.radius} m).`
    : x.status === 'tanpa_qr' ? 'Stiker QR tidak dipindai.' : 'Penjualan ke rumah.';
  return `${demoBar()}<div class="k-body" style="padding-top:22px">
    <div class="hasil ${kelas}" role="status"><div class="ikon">${ikon(ok ? 'cek' : rumah ? 'rumah' : 'awas', 30)}</div>
      <div class="judul">${judul}${ok ? ' — harga toko' : rumah ? ' — harga rumah' : ''}</div>
      ${ok || rumah ? '' : `<div style="font-weight:700;font-size:19px">${x.hargaTokoTanpaBukti ? 'Tetap harga toko (sakelar bos mati)' : 'Dihitung harga rumah'}</div>`}
      <div class="harga num">${x.galon} galon × ${rp(x.harga)} = ${rp(x.galon * x.harga)}</div>
      <p style="font-size:15px">${alasan}</p></div>
    <div class="card flat small"><b>${esc(x.nama)}</b> · galon kosong ${x.kosong} · ${x.bayar}<br><span class="muted">Tercatat ${fmtJam(x.menit)} (waktu server). Tidak bisa diubah; koreksi lewat bos.</span></div>
    ${!ok && !rumah ? '<button class="btn btn-lg btn-block" data-a="mintaSetuju">Minta bos setujui harga toko</button>' : ''}
    <button class="btn btn-primary btn-lg btn-block" data-a="kLangkah" data-v="beranda">Kembali ke rit</button></div>`;
};

KL.selesai = () => {
  const rit = ritR(), st = hitungSetoran(rit);
  if (K.isiPulang == null) { K.isiPulang = st.diMotor; K.kosongPulang = rit.sales.reduce((a, x) => a + x.kosong, 0); K.setor = st.seharusnya; }
  const stok = rit.dibawa - K.isiPulang, selGalon = stok - st.catatan, selUang = K.setor - st.seharusnya;
  const baris = (l, v, cls = '') => `<tr><td>${l}</td><td class="r num ${cls}"><b>${v}</b></td></tr>`;
  return `${kTop('Selesai rit & setor')}<div class="k-body">
    ${stepper('isiPulang', K.isiPulang, 'Galon isi dibawa pulang')}
    ${stepper('kosongPulang', K.kosongPulang, 'Galon kosong dibawa pulang')}
    <label class="field" for="uang-setor"><span>Uang tunai disetor</span><input id="uang-setor" class="input num" inputmode="numeric" value="${K.setor}" data-ubah="setor"></label>
    <div class="row" style="--gap:6px"><button class="btn" data-a="setorCepat" data-v="0">Sesuai hitungan</button><button class="btn" data-a="setorCepat" data-v="-3000">Kurang Rp3.000</button></div>
    <div class="table-wrap"><table><tbody>
      ${baris('Terjual menurut stok', `${rit.dibawa} − ${K.isiPulang} = ${stok} galon`)}
      ${baris('Terjual menurut catatan', `${st.catatan} galon`)}
      ${baris('Selisih galon', selGalon === 0 ? '0 ✓' : selGalon, selGalon ? 'danger-t' : '')}
      ${baris('Uang seharusnya (tunai)', rp(st.seharusnya))}
      ${st.bon ? baris('Penjualan bon', rp(st.bon)) : ''}
      ${baris('Selisih uang', selUang === 0 ? 'Rp0 ✓' : (selUang < 0 ? '−' : '+') + rp(Math.abs(selUang)))}
    </tbody></table></div>
    ${selUang < 0 || selGalon ? `<div class="banner warn">${ikon('awas', 22)}<span>Selisih ini akan muncul di Radar bos.</span></div>` : ''}
    <button class="btn btn-primary btn-lg btn-block" data-a="kirimSetor">Kirim setoran ke bos</button></div>`;
};

KL.koreksi = () => {
  const rit = ritR(), x = rit.sales.find((s) => s.id === K.koreksiDari) || rit.sales[rit.sales.length - 1];
  return `${kTop('Ajukan koreksi')}<div class="k-body">
    <div class="card flat"><b>${esc(x.nama)}</b><br><span class="small">${fmtJam(x.menit)} · ${x.galon} galon isi · ${x.kosong} kosong · ${x.bayar}</span></div>
    <div class="banner sky">${ikon('perisai', 22)}<span>Penjualan yang sudah tersimpan tidak bisa diubah atau dihapus kurir. Bos yang memutuskan koreksinya, dan semuanya tercatat.</span></div>
    ${stepper('korGalon', K.korGalon ?? x.galon, 'Galon isi yang benar')}
    <label class="field" for="alasan"><span>Alasan</span><textarea id="alasan" class="input" rows="3">Salah pencet, seharusnya ${x.galon + 1} galon.</textarea></label>
    <button class="btn btn-primary btn-lg btn-block" data-a="kirimKoreksi">Kirim ke bos</button></div>`;
};
KL.pasang = KL.beranda;

/* ---------- Catatan di samping HP ---------- */
const CATATAN = {
  mulai: ['Mulai rit', 'Kurir menulis jumlah muatan, tetapi bos yang mengecek. Tanpa cek bos, kurir bisa menulis 40 padahal membawa 45.', '3.1'],
  'mulai-tunggu': ['Muatan belum dicek', 'Label ini tampil di dasbor bos sampai bos menekan "Muatan cocok".', '3.1'],
  beranda: ['Rit aktif', 'Dua tombol besar (≥ 72 px, teks ≥ 18 px) supaya bisa dipakai satu tangan di bawah terik matahari. Sisa galon di motor dihitung otomatis.', '3.2, 11'],
  pasang: ['Pasang aplikasi (Tahap 3)', 'Kartu pemasangan PWA. Kalau browser tidak mendukung pemasangan otomatis, tampilkan petunjuk manual.', '8'],
  'toko-pilih': ['Scan QR toko', 'Di depot demo, kamera diganti daftar toko supaya juri bisa mencoba tanpa berada di toko. Token QR hanya dikirim ke HP kurir di depot demo.', '10.3, 6'],
  'toko-posisi': ['Lokasi dicocokkan', 'Server membandingkan posisi HP dengan titik toko. Lebih dari 75 m berarti tidak terverifikasi.', '3.2'],
  'toko-form': ['Isi penjualan toko', 'Bon hanya bisa dipilih untuk pelanggan yang diizinkan bos. Server — bukan HP — yang menentukan status dan harga.', '3.2, 3.3'],
  'rumah-pilih': ['Jual ke rumah', 'Tanpa hambatan: kurir tidak pernah untung mencatat toko sebagai rumah, jadi penjualan rumah tidak butuh bukti.', '3.2'],
  'rumah-baru': ['Pembeli baru', 'Selalu berjenis rumah dan masuk daftar Persetujuan bos.', '3.2'],
  'rumah-form': ['Isi penjualan rumah', 'Harga rumah langsung berlaku.', '3.2'],
  hasil: ['Hasil verifikasi', 'Kurir langsung tahu harga yang berlaku. Klaim toko tanpa bukti dihitung harga rumah — insentif curang hilang tanpa menuduh siapa pun.', '3.2, 4'],
  selesai: ['Selesai rit', 'Server menghitung selisih galon dan uang. Coba "Kurang Rp3.000" lalu buka Radar bos: tanda R6 muncul.', '3.3, 4.2'],
  koreksi: ['Ajukan koreksi', 'Satu-satunya jalan mengubah catatan. Masuk ke daftar Persetujuan bos.', '3.2'],
};

LAYAR.kurir = () => {
  const l = K.langkah, fn = KL[l] || KL.beranda, [judul, isi, spek] = CATATAN[l] || CATATAN.beranda;
  const u = S.uji;
  const cek = (on, teks) => `<li><span class="tick ${on ? 'on' : ''}">${on ? '✓' : ''}</span><span>${teks}</span></li>`;
  return kepala('Aplikasi kurir', 'Tampilan di HP kurir. Tombol di dalam HP bisa diklik; urutan uji juri di kanan tercentang otomatis.') + `
  <div class="phone-wrap">
    <div class="phone"><div class="phone-status"><span>09.41</span><span>${K.sinyal ? '4G ▮▮▮' : 'Tanpa sinyal'}</span></div><div class="phone-screen">${fn()}</div></div>
    <aside class="notes">
      <div class="card"><div class="eyebrow">Layar ini · spesifikasi ${spek}</div><h2>${judul}</h2><p>${isi}</p></div>
      <div class="card"><h2>Urutan uji juri</h2><ul class="checklist">
        ${cek(u.rumah, 'Catat satu penjualan rumah')}${cek(u.tokoOk, 'Jual ke toko di lokasi toko → terverifikasi')}
        ${cek(u.tokoJauh, 'Jual ke toko "1,2 km dari toko" atau tanpa QR → harga rumah')}${cek(u.bos, 'Pindah ke Bos, lihat penjualan tadi di Radar')}</ul></div>
      <div class="card"><div class="row between"><h2>Sinyal HP</h2>${tahapChip(1)}${tahapChip(2)}</div>
        <p style="margin-bottom:10px">Matikan sinyal lalu coba simpan penjualan. T1: pesan "Belum tersimpan". T2: bisa disimpan di HP dan dikirim nanti.</p>
        <div class="row"><button class="toggle" role="switch" aria-checked="${K.sinyal}" aria-label="Sinyal" data-a="sinyal"></button><span>${K.sinyal ? 'Sinyal ada' : 'Tanpa sinyal'}</span></div></div>
    </aside>
  </div>`;
};

/* ---------- Aksi ---------- */
AKSI.kLangkah = (v) => {
  K.langkah = v; K.gagal = false;
  if (v === 'toko-pilih') K.draft = { jenis: 'toko' };
  if (v === 'rumah-pilih') K.draft = { jenis: 'rumah' };
  if (v === 'selesai') K.isiPulang = null;
  render(true);
};
AKSI.tanpaQr = () => { K.draft = { jenis: 'toko', tanpaQr: true }; render(true); };
AKSI.pilihToko = (id) => { Object.assign(K.draft, { toko: id, galon: 3, kosong: 3, bayar: 'tunai' }); K.langkah = K.draft.tanpaQr ? 'toko-form' : 'toko-posisi'; render(true); };
AKSI.posisi = (v) => { K.draft.posisi = v; K.draft.jarak = v === 'jauh' ? 1200 : antara(6, 18); K.langkah = 'toko-form'; render(true); };
AKSI.pilihRumah = (id) => { Object.assign(K.draft, { pelanggan: id, galon: 2, kosong: 2, bayar: 'tunai' }); K.langkah = 'rumah-form'; render(true); };
AKSI.namaBaru = (v) => { K.draft.namaBaru = v; };
AKSI.pembeliBaru = () => { K.draft.namaBaru = K.draft.namaBaru || 'Pak Joko (No. 41)'; Object.assign(K.draft, { pelanggan: null, galon: 1, kosong: 0, bayar: 'tunai' }); K.langkah = 'rumah-form'; render(true); };
AKSI.bayar = (v) => { K.draft.bayar = v; render(); };
AKSI.step = (v) => {
  const [f, d] = v.split(':'), n = Number(d);
  if (f === 'galon' || f === 'kosong') K.draft[f] = Math.max(f === 'galon' ? 1 : 0, (K.draft[f] || 0) + n);
  else if (f === 'mulaiGalon') K.mulaiGalon = Math.max(1, (K.mulaiGalon ?? 40) + n);
  else if (f === 'korGalon') K.korGalon = Math.max(0, (K.korGalon ?? 2) + n);
  else K[f] = Math.max(0, K[f] + n);
  render();
};
AKSI.mulaiRit = () => { const rit = ritR(); rit.dibawa = K.mulaiGalon ?? 40; rit.muatanDicek = false; rit.dicekJam = null; K.langkah = 'mulai-tunggu'; render(true); };
AKSI.sinyal = () => {
  K.sinyal = !K.sinyal;
  if (K.sinyal) { const n = kirimAntrean(); if (n) { toast(`${n} penjualan dari antrean terkirim`); return; } }
  render();
};
AKSI.antrekan = () => {
  const x = buatPenjualan(K.draft); x.offline = true; K.antreanData.push(x); catatUji(x);
  K.gagal = false; K.langkah = 'beranda'; toast('Disimpan di HP — menunggu sinyal');
};
AKSI.noop = () => toast('Lokasi diambil ulang (akurasi 12 m)');
AKSI.pasang = () => toast('Di HP sungguhan, dialog pemasangan Chrome muncul');

function buatPenjualan(d) {
  const semua = ritR().sales.concat(K.antreanData), menit = semua[semua.length - 1].menit + antara(6, 12);
  if (d.jenis === 'toko') {
    const status = d.tanpaQr ? 'tanpa_qr' : d.jarak > PENGATURAN.radius ? 'lokasi_jauh' : 'terverifikasi';
    return penjualan('rudi', menit, d.toko, d.galon, d.kosong, { status, jarak: status === 'tanpa_qr' ? null : d.jarak, bayar: d.bayar });
  }
  let id = d.pelanggan;
  if (!id) {
    id = 'rb' + PELANGGAN.length;
    PELANGGAN.push({ id, jenis: 'rumah', nama: d.namaBaru, x: 0, y: 0, bolehBon: false, saldo: 0, tidakKembali: 0 });
    PERSETUJUAN.unshift({ id: 'p' + Date.now(), jenis: 'pelanggan', judul: 'Pelanggan baru dari Rudi', isi: `${d.namaBaru} · rumah · dicatat hari ini ${fmtJam(menit)}`, status: 'menunggu', pelangganId: id });
  }
  return penjualan('rudi', menit, id, d.galon, d.kosong, { bayar: d.bayar });
}
function catatUji(x) {
  if (x.jenis === 'rumah') S.uji.rumah = true; else if (x.status === 'terverifikasi') S.uji.tokoOk = true; else S.uji.tokoJauh = true;
}
/* Masuk ke rit dan memperbarui saldo galon pelanggan (Tahap 2): saldo += isi − kosong */
function masukkanKeRit(daftar) {
  const rit = ritR();
  daftar.forEach((x) => {
    rit.sales.push(x);
    const p = cariPelanggan(x.pelangganId);
    p.saldo = Math.max(0, p.saldo + x.galon - x.kosong);
    if (x.kosong > 0) p.tidakKembali = 0;
  });
  rit.sales.sort((a, b) => a.menit - b.menit);
}
function kirimAntrean() {
  const n = K.antreanData.length;
  if (n) { masukkanKeRit(K.antreanData); K.antreanData = []; }
  return n;
}
function contohAntrean() {
  if (K.contohAntreanDipakai || K.antreanData.length || ritR().status !== 'aktif') return;
  K.contohAntreanDipakai = true;
  [['r3', 2, 2], ['r4', 1, 1]].forEach(([id, galon, kosong]) => {
    const x = buatPenjualan({ jenis: 'rumah', pelanggan: id, galon, kosong, bayar: 'tunai' });
    x.offline = true; K.antreanData.push(x);
  });
}

AKSI.simpan = () => {
  if (!K.sinyal) { K.gagal = true; render(); return; }
  const x = buatPenjualan(K.draft);
  masukkanKeRit([x]); catatUji(x);
  K.hasil = x; K.langkah = 'hasil'; K.gagal = false;
  render(true);
};
AKSI.mintaSetuju = () => {
  const x = K.hasil;
  PERSETUJUAN.unshift({ id: 'p' + Date.now(), jenis: 'harga', judul: 'Minta harga toko — Rudi', isi: `${x.nama} · ${x.galon} galon · status ${x.status}. Alasan kurir: "Saya memang di toko."`, status: 'menunggu', saleId: x.id });
  K.langkah = 'beranda'; toast('Terkirim ke daftar Persetujuan bos');
};
AKSI.setor = (v) => { K.setor = Math.max(0, Number(String(v).replace(/\D/g, '')) || 0); render(); };
AKSI.setorCepat = (v) => { K.setor = hitungSetoran(ritR()).seharusnya + Number(v); render(); };
AKSI.kirimSetor = () => {
  const rit = ritR(); rit.status = 'selesai'; rit.isiPulang = K.isiPulang; rit.kosongPulang = K.kosongPulang; rit.disetor = K.setor;
  K.langkah = 'beranda'; toast('Setoran terkirim. Bos akan menghitung ulang.');
};
AKSI.koreksi = (id) => { K.koreksiDari = id; K.korGalon = ritR().sales.find((s) => s.id === id).galon + 1; K.langkah = 'koreksi'; render(true); };
AKSI.kirimKoreksi = () => {
  const x = ritR().sales.find((s) => s.id === K.koreksiDari) || ritR().sales.at(-1);
  PERSETUJUAN.unshift({ id: 'p' + Date.now(), jenis: 'koreksi', judul: 'Koreksi dari Rudi', isi: `${x.nama} · galon isi tertulis ${x.galon}, seharusnya ${K.korGalon}.`, status: 'menunggu', saleId: x.id, galonBaru: K.korGalon });
  K.langkah = 'beranda'; toast('Pengajuan koreksi terkirim ke bos');
};
AKSI.aturUlang = () => { location.reload(); };
