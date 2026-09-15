/* AQUAIR prototipe — kerangka: status, navigasi, ikon, dan event. */
'use strict';

const S = {
  layar: 'landing', b: 'dasbor',
  k: { langkah: 'beranda', draft: null, hasil: null, sinyal: true, gagal: false, antreanData: [], koreksiDari: null },
  uji: { rumah: false, tokoOk: false, tokoJauh: false, bos: false },
  radarPeriode: 30, radarStatus: {}, radarLebih: false,
  masukTab: 'bos', pinSalah: 0, konfirmasiJawab: null, konfirmasiAngka: 8,
  pelangganFilter: 'semua', ringkasan: 0, modal: null, toast: null,
};
const LAYAR = {};   // id → fungsi render isi
const AKSI = {};    // nama → fungsi(nilai, elemen)

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const IKON = {
  qr: '<path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 14h2v2h-2zM14 18h2v2h-2zM18 18h2v2h-2zM16 16h2v2h-2z"/>',
  rumah: '<path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
  cek: '<path d="m5 12 5 5 9-10"/>',
  silang: '<path d="M6 6l12 12M18 6 6 18"/>',
  awas: '<path d="M12 3 2 21h20L12 3z"/><path d="M12 10v5M12 18v.5"/>',
  kiri: '<path d="M15 5l-7 7 7 7"/>',
  lokasi: '<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  radar: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><path d="M12 12l6-6"/>',
  dasbor: '<path d="M4 13h6V4H4zM14 20h6v-9h-6zM4 20h6v-3H4zM14 7h6V4h-6z"/>',
  rit: '<path d="M3 17h2l2-5h8l3 5h3"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/><path d="M9 12V7h5"/>',
  orang: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
  daftar: '<path d="M8 6h12M8 12h12M8 18h12M4 6h.5M4 12h.5M4 18h.5"/>',
  setuju: '<path d="M9 12l2 2 4-4"/><rect x="4" y="4" width="16" height="16" rx="3"/>',
  uang: '<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/>',
  galon: '<path d="M9 3h6v3H9z"/><path d="M8 6h8l1 3v10a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V9z"/><path d="M7 13h10"/>',
  wa: '<path d="M4 20l1.3-4A8 8 0 1 1 8 18.7z"/><path d="M9 9.5c.5 2.5 3 5 5.5 5.5l1.2-1.4-2-1-.8.8c-1-.4-2-1.4-2.4-2.4l.8-.8-1-2z"/>',
  alat: '<path d="M14.5 5.5a4 4 0 0 0 5 5L12 18l-3 3-3-3 3-3 7.5-7.5z"/>',
  perisai: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="m9 12 2 2 4-4"/>',
  gerigi: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/>',
  sinyal: '<path d="M2 20h2M7 20v-4M12 20v-8M17 20V8M22 20V4"/>',
  unduh: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  bintang: '<path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z"/>',
};
const ikon = (n, s = 20) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IKON[n]}</svg>`;
const logo = (s = 26) => `<svg width="${s}" height="${s}" viewBox="0 0 32 32" aria-hidden="true"><path d="M16 2C11 9 6 14.5 6 20a10 10 0 0 0 20 0C26 14.5 21 9 16 2z" fill="var(--brand)"/><path d="m11 20 3.5 3.5L21.5 16" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

const DIREKTORI = [
  { grup: 'Halaman publik', item: [['landing', 'Landing', 1], ['masuk', 'Masuk bos & kurir', 1], ['daftar', 'Daftarkan depot', 1], ['konfirmasi', 'Konfirmasi pemilik toko', 2]] },
  { grup: 'Aplikasi kurir (HP)', item: [['k:mulai', 'Mulai rit', 1], ['k:beranda', 'Rit aktif', 1], ['k:toko-pilih', 'Jual ke toko', 1], ['k:rumah-pilih', 'Jual ke rumah', 1], ['k:selesai', 'Selesai rit & setor', 1], ['k:koreksi', 'Ajukan koreksi', 1], ['k:offline', 'Tanpa sinyal & antrean', 2], ['k:pasang', 'Pasang aplikasi', 3]] },
  { grup: 'Aplikasi bos', item: [['b:dasbor', 'Dasbor', 1], ['b:radar', 'Radar Kecurangan', 1], ['b:rit', 'Rit & setoran', 1], ['b:pelanggan', 'Pelanggan', 1], ['b:qr', 'Stiker QR', 1], ['b:persetujuan', 'Persetujuan', 1], ['b:bon', 'Bon belum lunas', 1], ['b:kurir', 'Kurir', 1], ['b:pengaturan', 'Pengaturan', 1], ['b:unduh', 'Unduh data (CSV)', 1], ['b:galon', 'Galon di luar', 2], ['b:konfirmasi', 'Konfirmasi toko', 2], ['b:perawatan', 'Perawatan mesin', 3], ['b:kepatuhan', 'Kepatuhan', 3]] },
];

function kunciAktif() {
  if (S.layar === 'bos') return 'b:' + S.b;
  if (S.layar !== 'kurir') return S.layar;
  const l = S.k.langkah, j = S.k.draft?.jenis;
  if (l === 'mulai-tunggu') return 'k:mulai';
  if (l.startsWith('toko') || (l === 'hasil' && j === 'toko')) return 'k:toko-pilih';
  if (l.startsWith('rumah') || (l === 'hasil' && j === 'rumah')) return 'k:rumah-pilih';
  return 'k:' + l;
}

function pergi(id) {
  if (id.startsWith('k:')) {
    S.layar = 'kurir'; S.k.langkah = id.slice(2); S.k.gagal = false;
    if (id === 'k:toko-pilih') S.k.draft = { jenis: 'toko' };
    if (id === 'k:rumah-pilih') S.k.draft = { jenis: 'rumah' };
    if (id === 'k:selesai') S.k.isiPulang = null;
    if (id === 'k:offline') { S.k.langkah = 'beranda'; S.k.sinyal = false; contohAntrean(); }
    else if (!S.k.sinyal) { S.k.sinyal = true; kirimAntrean(); }
  } else if (id.startsWith('b:')) { S.layar = 'bos'; S.b = id.slice(2); if (S.b === 'dasbor' || S.b === 'radar') S.uji.bos = true; }
  else S.layar = id;
  render(true);
}

const tahapChip = (t) => `<span class="tahap t${t}" title="Tahap ${t}">T${t}</span>`;

function renderRail() {
  const aktif = kunciAktif();
  const grup = DIREKTORI.map((g) => `<div class="rail-group eyebrow">${g.grup}</div>` + g.item.map(([id, label, t]) =>
    `<button class="rail-link" data-go="${id}" aria-current="${id === aktif}">${label}${tahapChip(t)}</button>`).join('')).join('');
  const opsi = DIREKTORI.map((g) => `<optgroup label="${g.grup}">` + g.item.map(([id, label, t]) =>
    `<option value="${id}" ${id === aktif ? 'selected' : ''}>${label} (T${t})</option>`).join('') + '</optgroup>').join('');
  return `<nav class="rail" aria-label="Daftar layar">
    <div class="rail-brand">${logo()}<b>AQUAIR</b><span class="chip warn" style="margin-left:auto">Prototipe</span></div>
    <p class="rail-note">Semua layar Tahap 1–3. Nama, angka, dan lokasi adalah <b>data contoh fiktif</b>. T1/T2/T3 = tahap pembangunan di Emergent.</p>
    <label class="sr" for="pilih-layar">Pilih layar</label>
    <select id="pilih-layar" class="rail-select">${opsi}</select>
    <div class="rail-groups">${grup}</div>
  </nav>`;
}

function render(keAtas) {
  const root = document.getElementById('app');
  const lamaScroll = root.querySelector('.phone-screen')?.scrollTop || 0;
  const fn = LAYAR[S.layar];
  root.innerHTML = `<div class="proto">${renderRail()}<main class="stage">${fn ? fn() : ''}</main></div>` +
    (S.modal ? `<div class="modal-back" data-a="tutupModal"><div class="modal" role="dialog" aria-modal="true" data-stop>${S.modal}</div></div>` : '') +
    (S.toast ? `<div class="toast" role="status">${esc(S.toast)}</div>` : '');
  const ps = root.querySelector('.phone-screen');
  if (ps && !keAtas) ps.scrollTop = lamaScroll;
  if (keAtas && window.innerWidth < 900) root.querySelector('.stage')?.scrollIntoView({ block: 'start' });
  AKSI._setelahRender?.();
}

let toastTimer;
function toast(t) { S.toast = t; render(); clearTimeout(toastTimer); toastTimer = setTimeout(() => { S.toast = null; render(); }, 2200); }

AKSI.tutupModal = () => { S.modal = null; render(); };

document.addEventListener('click', (e) => {
  const stop = e.target.closest('[data-stop]');
  const el = e.target.closest('[data-go],[data-a]');
  if (!el) return;
  if (stop && !stop.contains(el)) return;
  if (el.hasAttribute('data-stop')) return;
  if (el.dataset.go) { S.modal = null; pergi(el.dataset.go); return; }
  const f = AKSI[el.dataset.a];
  if (f) { e.preventDefault(); f(el.dataset.v, el); }
});
document.addEventListener('change', (e) => {
  if (e.target.id === 'pilih-layar') { pergi(e.target.value); return; }
  const f = AKSI[e.target.dataset.ubah];
  if (f) f(e.target.value, e.target);
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && S.modal) { S.modal = null; render(); } });

function kepala(judul, ket) {
  return `<header class="stage-head"><h1>${judul}</h1><p>${ket}</p></header>`;
}
