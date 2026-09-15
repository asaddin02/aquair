/* AQUAIR prototipe — halaman publik: landing, masuk, daftar, konfirmasi pemilik toko (spesifikasi bagian 2, 7, 10). */
'use strict';

AKSI.coba = (tujuan) => {
  S.modal = `<div class="stack" style="align-items:center;text-align:center;--gap:10px;padding:10px 0">
    <div class="putar" aria-hidden="true"></div><b>Menyiapkan depot contoh…</b>
    <p class="small muted">Depot Tirta Sejahtera · 2 kurir · 20 toko · 60 rumah · riwayat 30 hari yang berakhir hari ini</p></div>`;
  render();
  setTimeout(() => { S.modal = null; pergi(tujuan); }, 900);
};

/* ---------- Landing ---------- */
function bukuKurir() {
  return `<figure class="ledger" style="margin:0">
    <figcaption class="eyebrow">Contoh hitungan · satu rit, 40 galon</figcaption>
    <div class="ledger-paper" role="img" aria-label="Catatan tulisan tangan kurir: toko 36 kali 3.000, rumah 4 kali 4.000, setor 124.000">
      Rit Senin — Rudi<br>Toko 36 × 3.000 = 108.000<br>Rumah 4 × 4.000 = 16.000<br><u>Setor 124.000</u></div>
    <div class="card hitung" aria-label="Hitungan AQUAIR">
      <span class="small muted" style="grid-column:1/-1">AQUAIR menghitung dari bukti:</span>
      <span>15 toko terverifikasi × Rp3.000</span><span class="num">Rp45.000</span>
      <span>21 toko tanpa bukti × Rp4.000</span><span class="num">Rp84.000</span>
      <span>4 rumah × Rp4.000</span><span class="num">Rp16.000</span>
      <span class="total">Seharusnya disetor</span><span class="total num">Rp145.000</span>
    </div>
    <div class="row between"><span class="chip danger">${ikon('awas', 14)}Kurang setor Rp21.000</span><span class="small muted">Ilustrasi, bukan data depot sungguhan</span></div>
  </figure>`;
}

LAYAR.landing = () => kepala('Landing', 'Halaman pertama untuk pemilik depot, juri, dan pemberi vote. Tombol "Coba sebagai…" membuka depot contoh tanpa kata sandi.') + `
<div class="site">
  <nav class="site-nav" aria-label="Situs"><span class="logo">${logo(28)}AQUAIR</span>
    <span class="row" style="--gap:6px"><button class="btn btn-ghost" data-go="masuk">Masuk</button><button class="btn" data-go="daftar">Daftarkan depot</button></span></nav>
  <section class="hero">
    <div>
      <div class="eyebrow">Untuk Depot Air Minum Isi Ulang</div>
      <h1 style="margin-top:10px">Kurir jujur, <em>setoran utuh.</em></h1>
      <p class="lead">Kurir yang mencatat pembeli rumah sebagai toko mengantongi Rp1.000 per galon, dan catatan "36 toko, 4 rumah" tetap tampak wajar setiap hari. AQUAIR hanya memberi harga toko kalau ada bukti dari toko itu.</p>
      <div class="cta">
        <button class="btn btn-primary btn-lg" data-a="coba" data-v="b:dasbor">${ikon('dasbor', 20)}Coba sebagai Bos</button>
        <button class="btn btn-lg" style="border:2px solid var(--sky)" data-a="coba" data-v="k:beranda">${ikon('rit', 20)}Coba sebagai Kurir</button>
      </div>
      <p class="small muted" style="margin-top:12px">Tanpa daftar. Setiap pengunjung mendapat depot contoh sendiri, terhapus otomatis setelah 24 jam.
        <button class="btn btn-ghost" style="min-height:30px;padding:2px 6px" data-go="daftar">Daftarkan depot saya</button></p>
    </div>
    ${bukuKurir()}
  </section>
  <section class="band">
    <div class="eyebrow">Kuncinya</div>
    <h2>Bukti hanya diminta untuk harga yang lebih murah.</h2>
    <p>Kurir tidak pernah untung menulis penjualan toko sebagai rumah. Jadi penjualan rumah dicatat tanpa hambatan, dan hanya harga toko yang perlu dibuktikan. Tidak ada yang dituduh: klaim toko tanpa bukti otomatis dihitung harga rumah.</p>
    <div class="grid-2">
      <div class="tarif rumah"><span class="chip sky">${ikon('rumah', 14)}Rumah</span><div class="angka">Rp4.000 <small>per galon</small></div>
        <p>Pilih pembeli, isi jumlah galon, simpan. Tanpa bukti apa pun.</p></div>
      <div class="tarif toko"><span class="chip brand">${ikon('qr', 14)}Toko</span><div class="angka">Rp3.000 <small>per galon</small></div>
        <p>Wajib scan stiker QR di dalam toko, dengan HP kurir paling jauh 75 m dari titik toko. Tanpa bukti, dihitung Rp4.000.</p></div>
    </div>
  </section>
  <section class="band">
    <h2>Cara kerjanya di setiap titik antar</h2>
    <div class="steps">
      <div class="card">${ikon('qr', 28)}<h3>Scan QR toko</h3><p>Stiker ditempel di dalam toko, bukan di luar. Isinya token acak yang bisa diganti bos kapan saja.</p></div>
      <div class="card">${ikon('lokasi', 28)}<h3>Lokasi dicocokkan</h3><p>Server membandingkan lokasi HP dengan titik toko. QR yang difoto lalu dipindai di tempat lain langsung ketahuan.</p></div>
      <div class="card">${ikon('radar', 28)}<h3>Radar Kecurangan</h3><p>Bos melihat kejanggalan per kurir per hari: porsi toko terlalu tinggi, stok toko tidak masuk akal, setoran kurang. Lengkap dengan perkiraan Rupiah.</p></div>
    </div>
  </section>
  <section class="band">
    <h2>Masalah depot lain ikut terjaga</h2>
    <div class="steps">
      <div class="card">${ikon('galon', 24)}<h3>Galon pinjaman ${tahapChip(2)}</h3><p>Saldo galon di setiap pelanggan, dan siapa yang tidak mengembalikan lebih dari 14 hari.</p></div>
      <div class="card">${ikon('wa', 24)}<h3>Konfirmasi pemilik toko ${tahapChip(2)}</h3><p>Pemilik toko menjawab jumlah galon mingguan lewat tautan WhatsApp, tanpa akun.</p></div>
      <div class="card">${ikon('alat', 24)}<h3>Mesin dan uji air ${tahapChip(3)}</h3><p>Pengingat ganti filter, lampu UV, dan membran RO, plus jadwal uji lab dan masa berlaku SLHS.</p></div>
    </div>
  </section>
  <footer class="site-foot">AQUAIR · aplikasi web untuk Depot Air Minum Isi Ulang. Bisa dipasang dari Chrome ke layar utama HP.</footer>
</div>`;

/* ---------- Masuk ---------- */
const jamKunci = () => new Date(Date.now() + 15 * 60000).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' });
function pesanSalah(n, salah, lalu) {
  if (!n) return '';
  if (n >= 5) return `<div class="banner danger" role="alert">${ikon('kunci', 22)}<span><b>Akun dikunci 15 menit</b> karena 5 kali salah. Coba lagi pukul ${jamKunci()} WIB, ${lalu}.</span></div>`;
  return `<div class="banner warn" role="alert">${ikon('awas', 22)}<span>${salah} Sisa ${5 - n} kali coba sebelum akun dikunci 15 menit.</span></div>`;
}

function masukBos() {
  const n = S.sandiSalah || 0;
  return `<div class="site"><div class="auth">
    <span class="logo">${logo(30)}AQUAIR</span><h2>Masuk sebagai bos</h2>
    ${pesanSalah(n, 'Email atau kata sandi salah.', 'atau hubungi pengelola AQUAIR')}
    <label class="field" for="masuk-email"><span>Email</span><input id="masuk-email" class="input" type="email" autocomplete="email" placeholder="nama@email.com"></label>
    <label class="field" for="masuk-sandi"><span>Kata sandi</span><input id="masuk-sandi" class="input" type="password" autocomplete="current-password"></label>
    <button class="btn btn-primary btn-lg btn-block" data-a="masukBos" ${n >= 5 ? 'disabled' : ''}>Masuk</button>
    <p class="small muted">Belum punya akun? <button class="btn btn-ghost" style="min-height:30px;padding:2px 6px" data-go="daftar">Daftarkan depot</button></p>
    <div class="divider">atau coba tanpa akun</div>
    <div class="grid-2" style="grid-template-columns:1fr 1fr;gap:8px"><button class="btn" data-a="coba" data-v="b:dasbor">Coba sebagai Bos</button><button class="btn" data-a="coba" data-v="k:beranda">Coba sebagai Kurir</button></div>
  </div></div>`;
}

function masukKurir() {
  const n = S.pinSalah, pin = S.pin || '', kunci = n >= 5;
  const kotak = Array.from({ length: 6 }, (_, i) => `<span class="${i < pin.length ? 'isi' : ''}">${i < pin.length ? '•' : ''}</span>`).join('');
  const tombol = ['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => `<button data-a="pinTekan" data-v="${d}" ${kunci ? 'disabled' : ''}>${d}</button>`).join('') +
    `<button class="kecil" data-a="pinTekan" data-v="hapus" aria-label="Hapus satu angka" ${kunci ? 'disabled' : ''}>Hapus</button><button data-a="pinTekan" data-v="0" ${kunci ? 'disabled' : ''}>0</button><button class="kecil masuk" data-a="pinTekan" data-v="masuk" ${kunci ? 'disabled' : ''}>Masuk</button>`;
  return `<div class="phone-wrap">
    <div class="phone"><div class="phone-status"><span>06.12</span><span>4G ▮▮▮</span></div><div class="phone-screen">
      <div class="k-body" style="padding-top:26px">
        <span class="logo">${logo(30)}AQUAIR</span><h2 style="font-size:24px">Masuk kurir</h2>
        ${pesanSalah(n, 'Nomor HP atau PIN salah.', 'atau minta bos mengatur ulang PIN')}
        <label class="field" for="masuk-hp"><span>Nomor HP</span><input id="masuk-hp" class="input" inputmode="tel" autocomplete="tel" placeholder="08…" value="${esc(S.masukHp || '')}" data-ubah="masukHp"></label>
        <div class="field"><span>PIN 6 digit</span><div class="pin" role="img" aria-label="${pin.length} dari 6 angka PIN terisi">${kotak}</div></div>
        <p class="galat" role="alert"></p>
        <div class="keypad">${tombol}</div>
      </div></div></div>
    <aside class="notes">
      <div class="card"><div class="eyebrow">Layar ini · spesifikasi 2</div><h2>Masuk dengan PIN</h2>
        <p>Tombol angka besar supaya PIN bisa diketik satu tangan. 5 kali salah mengunci akun 15 menit. PIN yang lupa diatur ulang bos dari menu Kurir.</p></div>
      <div class="card"><h2>Coba tanpa akun</h2><p style="margin-bottom:10px">Depot contoh langsung membuka rit aktif Rudi hari ini.</p>
        <button class="btn btn-primary" data-a="coba" data-v="k:beranda">Coba sebagai Kurir</button></div>
    </aside></div>`;
}

LAYAR.masuk = () => {
  const kurir = S.masukTab === 'kurir';
  return kepala('Masuk', 'Bos masuk dengan email dan kata sandi. Kurir masuk dengan nomor HP dan PIN 6 digit.') + `
  <div class="row" style="margin-bottom:16px"><span class="seg" role="group" aria-label="Masuk sebagai"><button aria-pressed="${!kurir}" data-a="masukTab" data-v="bos">Bos</button><button aria-pressed="${kurir}" data-a="masukTab" data-v="kurir">Kurir</button></span>
    <span class="small muted">Di prototipe, setiap percobaan masuk dianggap salah supaya batas 5 kali terlihat.</span></div>
  ${kurir ? masukKurir() : masukBos()}`;
};

AKSI.masukTab = (v) => { S.masukTab = v; render(); };
AKSI.masukHp = (v) => { S.masukHp = v; };
AKSI.masukBos = () => { S.sandiSalah = (S.sandiSalah || 0) + 1; render(); };
AKSI.pinTekan = (v, el) => {
  const pin = S.pin || '';
  if (v === 'hapus') S.pin = pin.slice(0, -1);
  else if (v === 'masuk') {
    if (pin.length < 6) { galatDi(el, 'PIN harus 6 angka.'); return; }
    S.pinSalah++; S.pin = '';
  } else if (pin.length < 6) S.pin = pin + v;
  render();
};

/* ---------- Daftar depot ---------- */
LAYAR.daftar = () => kepala('Daftarkan depot', 'Pendaftaran membuat satu depot baru beserta akun bosnya. Kurir dan pelanggan ditambahkan bos sesudahnya.') +
  `<div class="site">${S.daftarSelesai ? daftarSelesai() : daftarForm()}</div>`;

function daftarForm() {
  const f = (id, label, attr = '', hint = '') => `<label class="field" for="${id}"><span>${label}${hint ? ` <span class="hint">${hint}</span>` : ''}</span><input id="${id}" class="input" ${attr}></label>`;
  return `<div class="auth lebar">
    <span class="logo">${logo(30)}AQUAIR</span><h2>Daftarkan depot</h2>
    <div class="form-grid">${f('dft-depot', 'Nama depot', 'placeholder="Contoh: Depot Tirta Makmur"')}${f('dft-kota', 'Kota atau kabupaten')}</div>
    <div class="form-grid">${f('dft-nama', 'Nama pemilik')}${f('dft-email', 'Email', 'type="email" autocomplete="email"')}</div>
    <div class="form-grid">${f('dft-sandi', 'Kata sandi', 'type="password" autocomplete="new-password"', 'minimal 8 karakter')}<span></span></div>
    <div class="form-grid">
      <label class="field" for="dft-toko"><span>Harga toko per galon</span><div class="input-unit"><span>Rp</span><input id="dft-toko" class="num" inputmode="numeric" value="3000"></div></label>
      <label class="field" for="dft-rumah"><span>Harga rumah per galon</span><div class="input-unit"><span>Rp</span><input id="dft-rumah" class="num" inputmode="numeric" value="4000"></div></label>
    </div>
    <p class="small muted">Harga bisa diubah kapan saja di Pengaturan.</p>
    <p class="galat" role="alert"></p>
    <button class="btn btn-primary btn-lg" data-a="daftar">Buat depot</button>
    <p class="small muted">Sudah punya akun? <button class="btn btn-ghost" style="min-height:30px;padding:2px 6px" data-go="masuk">Masuk</button></p>
  </div>`;
}

function daftarSelesai() {
  return `<div class="auth lebar">
    <div class="hasil ok" role="status"><div class="ikon">${ikon('cek', 30)}</div><div class="judul">${esc(S.daftarSelesai)} siap dipakai</div><p>Akun bos sudah dibuat. Tiga langkah sebelum rit pertama:</p></div>
    <ol class="langkah">
      <li><b>Tambah kurir</b> beserta nomor HP-nya. PIN dibuat otomatis. <button class="btn btn-ghost" data-go="b:kurir">Buka Kurir</button></li>
      <li><b>Tambah toko</b> dengan titik lokasi, kapasitas simpan, dan laku per hari. <button class="btn btn-ghost" data-go="b:pelanggan">Buka Pelanggan</button></li>
      <li><b>Cetak stiker QR</b> dan tempel di dalam setiap toko. <button class="btn btn-ghost" data-go="b:qr">Buka Stiker QR</button></li>
    </ol>
    <p class="small muted">Di prototipe, tombol di atas membuka depot contoh.</p>
    <button class="btn" style="justify-self:start" data-a="daftarUlang">Isi ulang formulir</button>
  </div>`;
}

AKSI.daftar = (_, el) => {
  const nilai = (id) => document.getElementById(id).value.trim();
  const toko = Number(nilai('dft-toko').replace(/\D/g, '')), rumah = Number(nilai('dft-rumah').replace(/\D/g, ''));
  if (!nilai('dft-depot')) { galatDi(el, 'Isi nama depot dulu.'); return; }
  if (!nilai('dft-email').includes('@')) { galatDi(el, 'Email belum benar. Contoh: nama@email.com'); return; }
  if (nilai('dft-sandi').length < 8) { galatDi(el, 'Kata sandi minimal 8 karakter.'); return; }
  if (rumah <= toko) { galatDi(el, 'Harga rumah harus lebih tinggi dari harga toko.'); return; }
  S.daftarSelesai = nilai('dft-depot'); render(true);
};
AKSI.daftarUlang = () => { S.daftarSelesai = null; render(); };

/* ---------- Konfirmasi pemilik toko (Tahap 2) ---------- */
const KONF_DEMO = 3;
LAYAR.konfirmasi = () => {
  const k = KONFIRMASI[KONF_DEMO], t = cariPelanggan(k.pelanggan), per = periodeLalu(), jawab = S.konfirmasiJawab;
  let isi;
  if (jawab) {
    isi = `<div class="hasil ${jawab === 'benar' ? 'ok' : 'info'}" role="status"><div class="ikon">${ikon('cek', 30)}</div><div class="judul">Terima kasih</div>
      <p>Jawaban Anda: <b>${k.menurutToko} galon</b> untuk minggu ${per.teks}.</p>
      <p style="font-size:15px">Jawaban sudah diterima Depot Tirta Sejahtera dan tidak bisa diubah lewat tautan ini.</p></div>`;
  } else if (S.konfirmasiUbah) {
    isi = `<p>Berapa galon yang benar-benar diterima <b>${esc(t.nama)}</b> minggu ${per.teks}?</p>
      ${stepper('konfirmasiAngka', S.konfirmasiAngka, 'Galon diterima')}
      <button class="btn btn-primary btn-lg btn-block" data-a="jawabKonfirmasi" data-v="berbeda">Kirim jawaban</button>
      <button class="btn btn-ghost btn-block" data-a="konfirmasiBatal">Kembali</button>`;
  } else {
    isi = `<div class="card" style="text-align:center;padding:22px 16px"><p>Minggu ${per.teks} tercatat</p>
        <div class="num" style="font:800 52px/1.1 var(--f-head);letter-spacing:-.02em;margin:6px 0">${k.tercatat} galon</div><p>diantar ke <b>${esc(t.nama)}</b>.</p></div>
      <p style="font:800 24px/1.2 var(--f-head);text-align:center">Benar?</p>
      <button class="btn btn-primary btn-lg btn-block" data-a="jawabKonfirmasi" data-v="benar">${ikon('cek', 22)}Ya, benar</button>
      <button class="btn btn-lg btn-block" data-a="konfirmasiUbah">Tidak, yang benar … galon</button>`;
  }
  return kepala('Konfirmasi pemilik toko', 'Halaman tanpa login yang dibuka pemilik toko dari tautan WhatsApp. Satu tautan per toko per minggu.') + `
  <div class="phone-wrap">
    <div class="phone"><div class="phone-status"><span>19.05</span><span>4G ▮▮▮</span></div><div class="phone-screen">
      <div class="k-top"><span class="logo" style="font-size:16px">${logo(24)}Depot Tirta Sejahtera</span><span class="chip warn" style="margin-left:auto">Data contoh</span></div>
      <div class="k-body">${isi}<p class="small muted" style="margin-top:auto">Tautan berlaku sampai ${fmtHari(per.berlaku)}. Jawaban hanya bisa dikirim sekali.</p></div>
    </div></div>
    <aside class="notes">
      <div class="card"><div class="eyebrow">Layar ini · spesifikasi 7</div><h2>Bukti dari pihak ketiga</h2>
        <p>Pemilik toko tidak punya alasan menutupi kurir. Kalau jawabannya lebih sedikit dari catatan, Radar memunculkan tanda R8 dengan perkiraan Rupiah. Token tautan disimpan dalam bentuk hash dan berlaku 7 hari.</p></div>
      <div class="card"><h2>Coba</h2><p style="margin-bottom:10px">Jawab "Tidak", kurangi jumlahnya, kirim, lalu buka Radar bos.</p>
        <div class="row">${jawab === 'berbeda' ? '<button class="btn btn-primary" data-go="b:radar">Lihat R8 di Radar</button>' : ''}${jawab ? '<button class="btn" data-a="konfirmasiUlang">Ulangi (khusus prototipe)</button>' : '<button class="btn" data-go="b:konfirmasi">Lihat daftar di aplikasi bos</button>'}</div></div>
    </aside>
  </div>`;
};

const stepSebelumnya = AKSI.step;
AKSI.step = (v, el) => {
  const [f, d] = v.split(':');
  if (f !== 'konfirmasiAngka') { stepSebelumnya(v, el); return; }
  S.konfirmasiAngka = Math.max(0, S.konfirmasiAngka + Number(d)); render();
};
AKSI.konfirmasiUbah = () => { S.konfirmasiUbah = true; S.konfirmasiAngka = Math.max(0, KONFIRMASI[KONF_DEMO].tercatat - 3); render(); };
AKSI.konfirmasiBatal = () => { S.konfirmasiUbah = false; render(); };
AKSI.jawabKonfirmasi = (v) => {
  const k = KONFIRMASI[KONF_DEMO], t = cariPelanggan(k.pelanggan);
  if (v === 'berbeda' && S.konfirmasiAngka !== k.tercatat) {
    k.status = 'berbeda'; k.menurutToko = S.konfirmasiAngka;
    const kurang = k.tercatat - k.menurutToko;
    TANDA_TAMBAHAN[t.rute].push(flag('R8', `${t.nama} menjawab ${k.menurutToko} galon untuk minggu ${periodeLalu().teks}, catatan ${k.tercatat} galon.`, Math.max(0, kurang) * SELISIH, 'bocor'));
    S.konfirmasiJawab = 'berbeda';
  } else { k.status = 'benar'; k.menurutToko = k.tercatat; S.konfirmasiJawab = 'benar'; }
  S.konfirmasiUbah = false; render(true);
};
AKSI.konfirmasiUlang = () => {
  const k = KONFIRMASI[KONF_DEMO], t = cariPelanggan(k.pelanggan);
  TANDA_TAMBAHAN[t.rute] = TANDA_TAMBAHAN[t.rute].filter((f) => f.kode !== 'R8');
  k.status = 'menunggu'; delete k.menurutToko; S.konfirmasiJawab = null; render();
};
