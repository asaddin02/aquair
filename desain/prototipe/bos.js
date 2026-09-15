/* AQUAIR prototipe — aplikasi bos: kerangka, dasbor, Radar, rit (spesifikasi bagian 4, 5, 7). */
'use strict';

const NAMA_KURIR = { dimas: 'Dimas', rudi: 'Rudi' };
S.ritPilih = 'rudi';

function statusGrup(k, i) {
  const s = S.radarStatus[k + '-' + i];
  if (s) return s;
  if (k === 'rudi' && i < 5) return 'terbukti';
  if (k === 'dimas' && i === 11) return 'aman';
  return 'baru';
}
function semuaHari(k) { return RIWAYAT[k].map((h, i) => ({ ...h, i })).concat([{ ...radarHariIni(k), i: 29 }]); }
function nilaiHari(k, h) {
  if (statusGrup(k, h.i) === 'aman') return { tagihan: 0, bocor: 0, risiko: 'rendah' };
  const jumlah = (m) => h.flags.filter((f) => f.masuk === m).reduce((a, f) => a + (f.rupiah || 0), 0);
  return { tagihan: jumlah('tagihan'), bocor: jumlah('bocor'), risiko: risiko(h.flags) };
}
function ringkas(k, dari = 0) {
  const r = { tagihan: 0, bocor: 0, tinggi: 0, sedang: 0, toko: 0, total: 0, verif: 0, perKode: {} };
  semuaHari(k).filter((h) => h.i >= dari).forEach((h) => {
    const v = nilaiHari(k, h);
    r.tagihan += v.tagihan; r.bocor += v.bocor; r.toko += h.toko; r.total += h.total; r.verif += h.verif;
    if (v.risiko === 'tinggi') r.tinggi++; if (v.risiko === 'sedang') r.sedang++;
    if (statusGrup(k, h.i) !== 'aman') h.flags.filter((f) => f.masuk === 'bocor' && f.rupiah).forEach((f) => { r.perKode[f.kode] = (r.perKode[f.kode] || 0) + f.rupiah; });
  });
  return r;
}
const gabung = (a, b) => ({ tagihan: a.tagihan + b.tagihan, bocor: a.bocor + b.bocor, perKode: Object.fromEntries([...new Set([...Object.keys(a.perKode), ...Object.keys(b.perKode)])].map((k) => [k, (a.perKode[k] || 0) + (b.perKode[k] || 0)])) });
const chipRisiko = (r) => r === 'tinggi' ? `<span class="chip danger">${ikon('awas', 14)}Risiko tinggi</span>` : r === 'sedang' ? `<span class="chip warn">${ikon('awas', 14)}Risiko sedang</span>` : `<span class="chip ok">${ikon('cek', 14)}Risiko rendah</span>`;
const avatar = (k) => `<span class="avatar" style="background:${k === 'rudi' ? 'var(--s-rudi)' : 'var(--s-dimas)'}">${NAMA_KURIR[k][0]}</span>`;
const LABEL_KODE = { R1: 'rasio toko', R3: 'stok toko', R6: 'kurang setor', R7: 'selisih galon', R8: 'konfirmasi toko' };

const NAV_BOS = [
  ['dasbor', 'Dasbor', 'dasbor'], ['radar', 'Radar Kecurangan', 'radar'], ['rit', 'Rit & setoran', 'rit'], ['-', 'Data'],
  ['pelanggan', 'Pelanggan', 'orang'], ['qr', 'Stiker QR', 'qr'], ['persetujuan', 'Persetujuan', 'setuju'], ['bon', 'Bon belum lunas', 'uang'],
  ['kurir', 'Kurir', 'orang'], ['pengaturan', 'Pengaturan', 'gerigi'], ['unduh', 'Unduh data', 'unduh'], ['-', 'Tahap 2'], ['galon', 'Galon di luar', 'galon'],
  ['konfirmasi', 'Konfirmasi toko', 'wa'], ['-', 'Tahap 3'], ['perawatan', 'Perawatan mesin', 'alat'], ['kepatuhan', 'Kepatuhan', 'perisai'],
];
const BOS = {};   // id → { judul, isi() }

LAYAR.bos = () => {
  const hal = BOS[S.b] || BOS.dasbor;
  const menunggu = PERSETUJUAN.filter((p) => p.status === 'menunggu').length;
  const tandaBaru = ['dimas', 'rudi'].reduce((a, k) => a + radarHariIni(k).flags.length, 0);
  const nav = NAV_BOS.map(([id, label, ik]) => id === '-' ? `<div class="sep">${label}</div>` :
    `<button data-go="b:${id}" aria-current="${S.b === id}">${ikon(ik, 18)}${label}${id === 'persetujuan' && menunggu ? `<span class="badge">${menunggu}</span>` : ''}${id === 'radar' && tandaBaru ? `<span class="badge">${tandaBaru}</span>` : ''}</button>`).join('');
  return kepala('Aplikasi bos', 'Dipakai pemilik depot di HP atau laptop. Menu kiri dan tombol di dalam aplikasi bisa diklik. Layar ini menyesuaikan lebar sampai 360 px.') + `
  <div class="app">
    <nav class="app-nav" aria-label="Menu bos"><div class="depot"><b>Depot Tirta Sejahtera</b><span class="small muted">Bos · depot contoh</span></div>${nav}</nav>
    <div class="app-main">
      <div class="app-top"><h2>${hal.judul}</h2><div class="row" style="--gap:8px"><span class="chip warn">Data contoh</span>
        <span class="seg" role="group" aria-label="Lihat sebagai"><button aria-pressed="true">Bos</button><button aria-pressed="false" data-go="k:beranda">Kurir</button></span></div></div>
      <div class="app-body">${hal.isi()}</div>
    </div>
  </div>`;
};

/* ---------- Dasbor ---------- */
BOS.dasbor = { judul: 'Dasbor', isi: () => {
  const d = ringkas('dimas'), r = ringkas('rudi'), t = gabung(d, r);
  const hd = radarHariIni('dimas'), hr = radarHariIni('rudi');
  const bocorRinci = Object.entries(t.perKode).sort((a, b) => b[1] - a[1]).map(([k, v]) => `<span>${LABEL_KODE[k] || k} <b class="num">${rp(v)}</b></span>`).join('');
  const telat = PERAWATAN.map((p) => ({ ...p, sisa: p.interval + p.terakhir })).filter((p) => p.sisa <= 7);
  return `
  ${kartuRingkasanAI(t, r)}
  ${telat.length ? `<div class="banner warn">${ikon('alat', 22)}<div class="grow"><b>Perawatan:</b> ${telat.map((p) => p.sisa < 0 ? `${p.nama} terlambat ${-p.sisa} hari` : `${p.nama} ${p.sisa} hari lagi`).join(' · ')} · SLHS habis dalam ${KEPATUHAN.slhs.berlakuSampai} hari</div>
    <button class="btn" data-go="b:perawatan">Lihat</button>${tahapChip(3)}</div>` : ''}
  <div class="grid-2">
    <div class="hero-tile utama"><div class="eyebrow">Tagihan kembali · 30 hari</div><div class="angka">${rp(t.tagihan)}</div>
      <p>Uang yang diamankan aturan "toko tanpa bukti dihitung harga rumah". Tanpa AQUAIR, uang ini hilang tanpa terlihat.</p></div>
    <div class="hero-tile"><div class="eyebrow">Perkiraan bocor · 30 hari</div><div class="angka" style="color:var(--danger-text)">${rp(t.bocor)}</div>
      <p>Uang yang mungkin masih hilang walau aturan harga sudah berjalan. Dua angka ini tidak dijumlahkan.</p><div class="rinci muted">${bocorRinci}</div></div>
  </div>
  <section class="stack"><div class="sec-head"><h3>Hari ini · ${fmtHari(HARI_INI)}</h3><button class="btn btn-ghost" data-go="b:rit">Lihat rit</button></div>
    <div class="grid-4">
      <div class="card mini"><span class="ket">Galon terjual</span><span class="angka">${hd.total + hr.total}</span><span class="ket">${hd.toko + hr.toko} toko · ${hd.rumah + hr.rumah} rumah</span></div>
      <div class="card mini"><span class="ket">Uang seharusnya vs disetor</span><span class="angka">${rp(hd.seharusnya + hr.seharusnya)}</span><span class="ket">disetor ${rp(RIT.dimas.disetor + (RIT.rudi.status === 'aktif' ? 0 : RIT.rudi.disetor))}${RIT.rudi.status === 'aktif' ? ' · Rudi masih di jalan' : ''}</span></div>
      <div class="card mini"><span class="ket">Tagihan kembali · bocor hari ini</span><span class="angka">${rp(nilaiHari('rudi', { ...hr, i: 29 }).tagihan + nilaiHari('dimas', { ...hd, i: 29 }).tagihan)}</span><span class="ket">bocor ${rp(nilaiHari('rudi', { ...hr, i: 29 }).bocor + nilaiHari('dimas', { ...hd, i: 29 }).bocor)}</span></div>
      <div class="card mini"><span class="ket">Tanda baru · muatan belum dicek</span><span class="angka">${hd.flags.length + hr.flags.length}</span><span class="ket">${['rudi', 'dimas'].filter((k) => !RIT[k].muatanDicek).length} rit belum dicek</span></div>
    </div></section>
  <section class="stack"><div class="sec-head"><h3>Kurir</h3><span class="small muted">30 hari terakhir</span></div>
    <div class="grid-2">${['rudi', 'dimas'].map((k) => kartuKurir(k)).join('')}</div></section>
  <section class="card stack"><div class="sec-head"><h3>Porsi toko per kurir · 30 hari</h3><span class="small muted">Simulasi data contoh</span></div>
    ${grafikPorsi()}</section>`;
} };

function kartuKurir(k) {
  const r = ringkas(k), hari = semuaHari(k), h = hari[29], v = nilaiHari(k, h);
  const strip = hari.map((x) => { const n = nilaiHari(k, x); return `<i class="${n.risiko} ${x.i === 29 ? 'hari-ini' : ''}" title="${fmtTgl(tanggalKe(x.i))}: risiko ${n.risiko}"></i>`; }).join('');
  return `<div class="card kurir-card">
    <div class="nama">${avatar(k)}<div class="grow"><b style="font-size:17px">${NAMA_KURIR[k]}</b><div class="small muted">Hari ini: ${h.total} galon · porsi toko ${h.total ? pct(h.toko / h.total) : '—'}</div></div>${chipRisiko(v.risiko)}</div>
    <div class="grid-4" style="grid-template-columns:repeat(auto-fit,minmax(110px,1fr))">
      <div class="mini"><span class="ket">Porsi toko</span><span class="angka">${pct(r.toko / r.total)}</span></div>
      <div class="mini"><span class="ket">Toko terverifikasi</span><span class="angka">${pct(r.verif / r.toko)}</span></div>
      <div class="mini"><span class="ket">Tagihan kembali</span><span class="angka">${rp(r.tagihan)}</span></div>
      <div class="mini"><span class="ket">Perkiraan bocor</span><span class="angka">${rp(r.bocor)}</span></div>
    </div>
    <div class="stack" style="--gap:6px"><div class="row between small"><b>${r.tinggi} hari berisiko tinggi</b><span class="muted">${r.sedang} hari sedang</span></div>
      <div class="strip" aria-label="Risiko per hari, 30 hari">${strip}</div>
      <div class="legend"><span><i style="background:var(--danger)"></i>Tinggi</span><span><i style="background:var(--warn)"></i>Sedang</span><span><i style="background:var(--surface-3)"></i>Rendah</span><span>Kotak bergaris = hari ini</span></div></div>
    <div class="row"><button class="btn" data-a="lihatRit" data-v="${k}">Lihat rit</button><button class="btn btn-ghost" data-go="b:radar">Buka Radar</button></div>
  </div>`;
}

function kartuRingkasanAI(t, r) {
  const head = `<div class="row between"><div class="row" style="--gap:8px">${ikon('bintang', 18)}<b>Ringkasan AI hari ini</b>${tahapChip(3)}</div>`;
  if (!S.ringkasan) return `<div class="card">${head}<button class="btn" data-a="buatRingkasan">Buat ringkasan</button></div>
    <p class="small muted" style="margin-top:6px">Di depot demo, ringkasan dibuat hanya saat tombol ditekan (maksimal 3 kali).</p></div>`;
  const hr = radarHariIni('rudi');
  const kal = [
    `Dalam 30 hari terakhir, aturan harga rumah mengamankan ${rp(t.tagihan)}, hampir semuanya dari Rudi (${rp(r.tagihan)}).`,
    `Rudi punya ${r.tinggi} hari berisiko tinggi, sebagian besar di awal periode; porsi tokonya sekarang mendekati garis dasar.`,
    `Perkiraan bocor 30 hari ${rp(t.bocor)}, terutama dari kurang setor dan stok toko yang tidak wajar.`,
    hr.flags.length ? `Hari ini ada ${hr.flags.length} tanda baru untuk Rudi — cek di Radar.` : 'Hari ini belum ada tanda baru.',
    (() => { const p = PERAWATAN.map((x) => ({ ...x, sisa: x.interval + x.terakhir })).sort((a, b) => a.sisa - b.sisa)[0];
      return p.sisa < 0 ? `${p.nama} sudah lewat ${-p.sisa} hari dari jadwal ganti; jadwalkan penggantian minggu ini.` : p.sisa <= 7 ? `${p.nama} perlu diganti dalam ${p.sisa} hari.` : 'Semua komponen mesin masih dalam jadwal ganti.'; })(),
  ];
  return `<div class="card">${head}<span class="small muted">Dibuat 09.40 · sisa ${3 - S.ringkasan} dari 3</span></div>
    <p style="margin-top:8px;max-width:75ch">${kal.join(' ')}</p>
    <div class="row" style="margin-top:10px"><button class="btn" data-a="buatRingkasan" ${S.ringkasan >= 3 ? 'disabled' : ''}>Buat ulang</button><span class="small muted">Model hanya menyusun kalimat dari angka yang dihitung server.</span></div></div>`;
}

function grafikPorsi() {
  const W = 720, H = 260, L = 40, Rt = 92, T = 14, B = 30, w = W - L - Rt, h = H - T - B;
  const X = (i) => L + (i / 29) * w, Y = (v) => T + (1 - v) * h;
  const seri = ['dimas', 'rudi'].map((k) => ({ k, v: semuaHari(k).map((x) => x.total ? x.toko / x.total : 0) }));
  const grid = [0, .25, .5, .75, 1].map((v) => `<line x1="${L}" x2="${L + w}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--line)" stroke-width="1"/><text x="${L - 8}" y="${Y(v) + 4}" text-anchor="end" font-size="11" fill="var(--ink-3)">${v * 100}%</text>`).join('');
  const xl = [0, 7, 14, 21, 29].map((i) => `<text x="${X(i)}" y="${H - 8}" text-anchor="${i === 29 ? 'end' : i === 0 ? 'start' : 'middle'}" font-size="11" fill="var(--ink-3)">${i === 29 ? 'Hari ini' : fmtTgl(tanggalKe(i))}</text>`).join('');
  const ends = seri.map((s) => ({ k: s.k, y: Y(s.v[29]), v: s.v[29] }));
  if (Math.abs(ends[0].y - ends[1].y) < 16) { const up = ends[0].y < ends[1].y ? 0 : 1; ends[up].y -= 9; ends[1 - up].y += 9; }
  const lines = seri.map((s, n) => `<path d="${s.v.map((v, i) => (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(v).toFixed(1)).join(' ')}" fill="none" stroke="var(--s-${s.k})" stroke-width="2" stroke-linejoin="round"/>
    <circle cx="${X(29)}" cy="${Y(s.v[29])}" r="4.5" fill="var(--s-${s.k})" stroke="var(--surface)" stroke-width="2"/>
    <text x="${X(29) + 10}" y="${ends[n].y + 4}" font-size="12" font-weight="600" fill="var(--ink)">${NAMA_KURIR[s.k]} ${pct(s.v[29])}</text>`).join('');
  const dasar = `<line x1="${L}" x2="${L + w}" y1="${Y(GARIS_DASAR)}" y2="${Y(GARIS_DASAR)}" stroke="var(--ink-3)" stroke-width="1.5" stroke-dasharray="5 4"/>
    <text x="${L + 6}" y="${Y(GARIS_DASAR) - 6}" font-size="11" fill="var(--ink-2)">Garis dasar ${pct(GARIS_DASAR)}</text>`;
  const baris = seri[0].v.map((_, i) => `<tr><td>${fmtTgl(tanggalKe(i))}</td><td class="r num">${pct(seri[1].v[i])}</td><td class="r num">${pct(seri[0].v[i])}</td></tr>`).join('');
  return `<div class="legend"><span><i style="background:var(--s-rudi)"></i>Rudi</span><span><i style="background:var(--s-dimas)"></i>Dimas</span><span>- - garis dasar depot</span></div>
  <div class="chart-box" data-chart='${JSON.stringify({ L, w, W, v: seri.map((s) => s.v) })}'>
    <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Grafik porsi toko 30 hari: Rudi sekitar 90% lalu turun, Dimas stabil sekitar 45%">
      ${grid}${xl}${dasar}${lines}<line class="cross" x1="0" x2="0" y1="${T}" y2="${T + h}" stroke="var(--ink-3)" stroke-width="1" visibility="hidden"/>
      <rect x="${L}" y="${T}" width="${w}" height="${h}" fill="transparent" class="hit"/></svg>
    <div class="chart-tip" hidden></div></div>
  <details><summary class="small">Lihat sebagai tabel</summary><div class="table-wrap" style="margin-top:8px;max-height:260px;overflow-y:auto"><table><thead><tr><th>Tanggal</th><th class="r">Rudi</th><th class="r">Dimas</th></tr></thead><tbody>${baris}</tbody></table></div></details>`;
}

AKSI._setelahRender = () => {
  const box = document.querySelector('.chart-box');
  if (!box) return;
  const c = JSON.parse(box.dataset.chart), svg = box.querySelector('svg'), tip = box.querySelector('.chart-tip'), cross = svg.querySelector('.cross');
  const gerak = (ev) => {
    const r = svg.getBoundingClientRect(), sx = (ev.clientX - r.left) * (c.W / r.width);
    const i = Math.max(0, Math.min(29, Math.round(((sx - c.L) / c.w) * 29))), x = c.L + (i / 29) * c.w;
    cross.setAttribute('x1', x); cross.setAttribute('x2', x); cross.setAttribute('visibility', 'visible');
    tip.hidden = false;
    tip.innerHTML = `<b>${i === 29 ? 'Hari ini' : fmtHari(tanggalKe(i))}</b><br><span class="sw" style="background:var(--s-rudi)"></span>Rudi <b class="num">${pct(c.v[1][i])}</b><br><span class="sw" style="background:var(--s-dimas)"></span>Dimas <b class="num">${pct(c.v[0][i])}</b><br><span class="muted">Garis dasar ${pct(GARIS_DASAR)}</span>`;
    const px = (x / c.W) * r.width;
    tip.style.left = Math.min(px + 12, r.width - 170) + 'px'; tip.style.top = '8px';
  };
  svg.addEventListener('pointermove', gerak);
  svg.addEventListener('pointerleave', () => { tip.hidden = true; cross.setAttribute('visibility', 'hidden'); });
};

/* ---------- Radar ---------- */
BOS.radar = { judul: 'Radar Kecurangan', isi: () => {
  const dari = S.radarPeriode === 30 ? 0 : S.radarPeriode === 7 ? 23 : 29;
  const grup = [];
  for (let i = 29; i >= dari; i--) ['rudi', 'dimas'].forEach((k) => { const h = semuaHari(k)[i]; if (h.flags.length) grup.push({ k, h }); });
  const tampil = S.radarLebih ? grup : grup.slice(0, 6);
  const tot = gabung(ringkas('dimas', dari), ringkas('rudi', dari));
  const seg = [[1, 'Hari ini'], [7, '7 hari'], [30, '30 hari']].map(([v, l]) => `<button aria-pressed="${S.radarPeriode === v}" data-a="periode" data-v="${v}">${l}</button>`).join('');
  return `<div class="row between"><span class="seg" role="group" aria-label="Periode">${seg}</span>
      <button class="btn" data-a="cekAcak">${ikon('wa', 18)}Cek 3 toko hari ini ${tahapChip(2)}</button></div>
    <p class="muted small">${grup.length} kelompok tanda · Tagihan kembali <b class="num">${rp(tot.tagihan)}</b> · Perkiraan bocor <b class="num">${rp(tot.bocor)}</b>. Radar tidak menghukum — bos yang memutuskan.</p>
    ${tampil.map(({ k, h }) => grupRadar(k, h)).join('') || '<div class="card">Tidak ada tanda pada periode ini.</div>'}
    ${grup.length > 6 && !S.radarLebih ? `<button class="btn btn-block" data-a="radarLebih">Tampilkan ${grup.length - 6} kelompok lagi</button>` : ''}`;
} };

function grupRadar(k, h) {
  const st = statusGrup(k, h.i), v = risiko(h.flags), jumlah = (m) => h.flags.filter((f) => f.masuk === m).reduce((a, f) => a + (f.rupiah || 0), 0);
  const stChip = st === 'aman' ? `<span class="chip ok">${ikon('cek', 14)}Sudah dicek — aman</span>` : st === 'terbukti' ? `<span class="chip danger">Terbukti</span>` : '<span class="chip line">Baru</span>';
  return `<article class="flag-group ${st === 'aman' ? '' : v}">
    <header>${avatar(k)}<b>${NAMA_KURIR[k]} — ${h.i === 29 ? 'hari ini' : fmtHari(tanggalKe(h.i))}</b>${st === 'aman' ? '' : chipRisiko(v)}${stChip}</header>
    ${h.flags.map((f) => `<div class="flag-row"><span class="code">${f.kode}</span><span>${esc(f.teks)}</span>
      <span class="rp">${f.rupiah == null ? '<small>termasuk R2</small>' : f.rupiah === 0 ? 'Rp0<small>sinyal saja</small>' : `${rp(f.rupiah)}<small>${f.masuk === 'tagihan' ? 'Tagihan kembali' : 'Perkiraan bocor'}</small>`}</span></div>`).join('')}
    <footer><span class="small">Tagihan kembali <b class="num">${rp(jumlah('tagihan'))}</b> · Perkiraan bocor <b class="num">${rp(jumlah('bocor'))}</b></span>
      <span class="row" style="--gap:8px">${h.i === 29 ? `<button class="btn btn-ghost" data-a="lihatRit" data-v="${k}">Lihat rit</button>` : ''}
      <button class="btn" data-a="tandai" data-v="${k}-${h.i}-aman">Sudah dicek — aman</button><button class="btn btn-danger" data-a="tandai" data-v="${k}-${h.i}-terbukti">Terbukti</button></span></footer>
  </article>`;
}

/* ---------- Rit & setoran ---------- */
BOS.rit = { judul: 'Rit & setoran', isi: () => {
  const kartu = ['rudi', 'dimas'].map((k) => {
    const rit = RIT[k], st = hitungSetoran(rit), aktif = rit.status === 'aktif';
    return `<button class="card stack" style="text-align:left;--gap:8px;${S.ritPilih === k ? 'border:2px solid var(--brand)' : ''}" data-a="lihatRit" data-v="${k}">
      <div class="row between">${avatar(k)}<b class="grow">${NAMA_KURIR[k]}</b>${aktif ? '<span class="chip sky">Di jalan</span>' : rit.diterima ? `<span class="chip ok">${ikon('cek', 14)}Setoran diterima</span>` : '<span class="chip warn">Menunggu setoran diterima</span>'}</div>
      <span class="small muted">Berangkat ${fmtJam(rit.berangkat)} · muatan ${rit.dibawa} galon ${rit.muatanDicek ? `(dicek ${rit.dicekJam})` : '(belum dicek)'}</span>
      <span class="num"><b>${st.catatan}</b> galon tercatat · seharusnya <b>${rp(st.seharusnya)}</b>${aktif ? '' : ` · disetor <b>${rp(rit.disetor)}</b>`}</span></button>`;
  }).join('');
  const rit = RIT[S.ritPilih], st = hitungSetoran(rit), aktif = rit.status === 'aktif';
  const baris = rit.sales.map((x, n) => `<tr><td class="num">${n + 1}</td><td class="num">${fmtJam(x.menit)}</td><td>${esc(x.nama)}</td><td>${x.jenis}</td><td class="r num">${x.galon}</td>
    <td>${chipStatus(x.status)}${x.offline ? ' <span class="chip line">dicatat tanpa sinyal</span>' : ''}</td><td class="r num">${x.jarak == null ? '—' : x.jarak.toLocaleString('id-ID') + ' m'}</td><td class="r num">${rp(x.harga)}</td><td class="r num">${x.bayar === 'bon' ? 'bon' : rp(x.galon * x.harga)}</td></tr>`).join('');
  const setoran = aktif ? '<p class="muted">Rit masih berjalan. Hitungan setoran muncul setelah kurir menekan Selesai rit.</p>' : `
    <div class="table-wrap"><table><tbody>
      <tr><td>Terjual menurut stok</td><td class="r num">${rit.dibawa} − ${rit.isiPulang} = <b>${st.stok}</b> galon</td></tr>
      <tr><td>Terjual menurut catatan</td><td class="r num"><b>${st.catatan}</b> galon</td></tr>
      <tr><td>Selisih galon</td><td class="r num"><b>${st.selisihGalon}</b></td></tr>
      <tr><td>Uang seharusnya (tunai)</td><td class="r num"><b>${rp(st.seharusnya)}</b></td></tr>
      <tr><td>Uang disetor</td><td class="r num"><b>${rp(rit.disetor)}</b></td></tr>
      <tr><td>Selisih uang</td><td class="r num"><b style="color:${st.selisihUang < 0 ? 'var(--danger-text)' : 'inherit'}">${st.selisihUang < 0 ? '−' : ''}${rp(Math.abs(st.selisihUang))}</b></td></tr>
    </tbody></table></div>
    ${rit.diterima ? '' : `<button class="btn btn-primary" data-a="terimaSetor" data-v="${S.ritPilih}">Setoran diterima</button><span class="small muted"> Tekan setelah menghitung ulang uang dan galon.</span>`}`;
  const cekMuatan = rit.muatanDicek ? '' : `<div class="banner warn" role="status">${ikon('awas', 22)}<span class="grow"><b>Muatan belum dicek.</b> ${NAMA_KURIR[S.ritPilih]} menulis ${rit.dibawa} galon. Hitung galon di motor, lalu pilih:</span>
    <span class="row" style="--gap:8px"><button class="btn btn-primary" data-a="muatanCocok" data-v="${S.ritPilih}">Muatan cocok</button><button class="btn" data-a="betulkanMuatan" data-v="${S.ritPilih}">Betulkan jumlah</button></span></div>`;
  return `<div class="grid-2">${kartu}</div>${cekMuatan}
    <section class="stack"><div class="sec-head"><h3>Rit ${NAMA_KURIR[S.ritPilih]} hari ini</h3><span class="small muted">${rit.sales.length} penjualan</span></div>
      <div class="table-wrap"><table><thead><tr><th>#</th><th>Jam</th><th>Pelanggan</th><th>Jenis</th><th class="r">Galon</th><th>Status</th><th class="r">Jarak ke titik</th><th class="r">Harga</th><th class="r">Total</th></tr></thead><tbody>${baris}</tbody></table></div></section>
    <section class="card stack"><h3>Setoran</h3>${setoran}</section>
    <section class="card stack"><div class="sec-head"><h3>Peta rit</h3>${tahapChip(2)}</div>${petaRit(rit)}
      <p class="small muted">Pratinjau skematik. Di aplikasi memakai Leaflet + OpenStreetMap.</p></section>`;
} };

function petaRit(rit) {
  const W = 640, H = 360, sx = (x) => W / 2 + x * (W / 3400), sy = (y) => H / 2 + y * (H / 3400);
  const jalan = [60, 150, 240, 300].map((y) => `<path d="M0 ${y} Q ${W / 2} ${y + (y % 120) - 40} ${W} ${y + 10}" stroke="var(--line-2)" stroke-width="6" fill="none" opacity=".6"/>`).join('') +
    [90, 250, 420, 560].map((x) => `<path d="M${x} 0 L ${x + 30} ${H}" stroke="var(--line-2)" stroke-width="4" fill="none" opacity=".5"/>`).join('');
  const titik = rit.sales.map((x) => {
    const p = cariPelanggan(x.pelangganId); let px = sx(p.x), py = sy(p.y);
    if (x.status === 'lokasi_jauh') { px = Math.min(W - 20, px + 120); py = Math.max(20, py - 60); }
    return { x, px, py };
  });
  const garis = titik.map((t, n) => (n ? 'L' : 'M') + t.px.toFixed(0) + ' ' + t.py.toFixed(0)).join(' ');
  const toko = tokoRute(rit.kurir).map((t) => `<rect x="${sx(t.x) - 6}" y="${sy(t.y) - 6}" width="12" height="12" rx="2" fill="var(--surface)" stroke="var(--brand)" stroke-width="2"><title>${t.nama}</title></rect>`).join('');
  const warna = { terverifikasi: 'var(--ok)', rumah: 'var(--sky)', lokasi_jauh: 'var(--warn)', tanpa_qr: 'var(--warn)', lokasi_lemah: 'var(--warn)', disetujui: 'var(--ok)' };
  const pin = titik.map((t, n) => `<g><circle cx="${t.px}" cy="${t.py}" r="11" fill="${warna[t.x.status]}" stroke="var(--surface)" stroke-width="2"/><text x="${t.px}" y="${t.py + 4}" text-anchor="middle" font-size="11" font-weight="700" fill="#fff">${n + 1}</text>${t.x.status === 'lokasi_jauh' ? `<text x="${t.px + 14}" y="${t.py - 8}" font-size="14" fill="var(--warn-text)">⚠</text>` : ''}<title>${n + 1}. ${t.x.nama} — ${namaStatus[t.x.status]}</title></g>`).join('');
  return `<div class="map"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Peta titik penjualan rit">${jalan}<path d="${garis}" stroke="var(--ink-3)" stroke-width="2" stroke-dasharray="4 4" fill="none"/>${toko}${pin}</svg></div>
    <div class="legend"><span><i style="background:var(--ok)"></i>Terverifikasi</span><span><i style="background:var(--sky)"></i>Rumah</span><span><i style="background:var(--warn)"></i>Tidak terverifikasi</span><span><i style="background:var(--surface);outline:2px solid var(--brand)"></i>Titik toko</span></div>`;
}

/* ---------- Aksi ---------- */
AKSI.periode = (v) => { S.radarPeriode = Number(v); S.radarLebih = false; render(); };
AKSI.radarLebih = () => { S.radarLebih = true; render(); };
AKSI.tandai = (v) => { const [k, i, s] = v.split('-'); catatAudit(`Tanda Radar ${NAMA_KURIR[k]} ${fmtTgl(tanggalKe(Number(i)))}`, statusGrup(k, Number(i)), s === 'aman' ? 'sudah_dicek_aman' : 'terbukti', ''); S.radarStatus[k + '-' + i] = s; toast(s === 'aman' ? 'Ditandai: sudah dicek — aman' : 'Ditandai: terbukti'); };
AKSI.lihatRit = (k) => { S.ritPilih = k; S.layar = 'bos'; S.b = 'rit'; render(true); };
AKSI.terimaSetor = (k) => { RIT[k].diterima = true; catatAudit(`Setoran diterima — rit ${NAMA_KURIR[k]}`, 'selesai', 'diterima', ''); toast('Setoran diterima'); };
AKSI.buatRingkasan = () => { S.ringkasan = Math.min(3, S.ringkasan + 1); render(); };
AKSI.cekAcak = () => {
  const toko = RIT.rudi.sales.filter((x) => x.jenis === 'toko').slice(-3);
  S.modal = `<h3>Cek 3 toko hari ini</h3><p class="small muted" style="margin:4px 0 12px">Depot demo hanya menampilkan pratinjau. Di depot sungguhan, tombol membuka WhatsApp di HP bos.</p>
    <div class="stack">${toko.map((x) => `<div class="stack" style="--gap:6px"><b>${esc(x.nama)}</b><div class="wa-bubble">Halo, dari Depot Tirta Sejahtera. Hari ini kurir kami mencatat ${x.galon} galon ke toko Bapak/Ibu. Boleh dibantu cek, benar berapa galon?</div></div>`).join('')}</div>
    <div class="row" style="margin-top:14px;justify-content:flex-end"><button class="btn btn-primary" data-a="tutupModal">Tutup</button></div>`;
  render();
};
