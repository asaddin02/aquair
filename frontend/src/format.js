// Format angka, uang, tanggal, dan jarak. Zona waktu selalu Asia/Jakarta.
const ZONA = 'Asia/Jakarta';

export const rp = (n) => `Rp${Math.round(n || 0).toLocaleString('id-ID')}`;
export const pct = (n) => (n == null ? '—' : `${Math.round(n * 100)}%`);
export const angka = (n) => Math.round(n || 0).toLocaleString('id-ID');

const keTanggal = (t) => (t instanceof Date ? t : new Date(`${t}T12:00:00+07:00`));

export const tglPanjang = (t) => keTanggal(t).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short', timeZone: ZONA });
export const tglPendek = (t) => keTanggal(t).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', timeZone: ZONA });
export const tglTahun = (t) => (t ? keTanggal(t).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: ZONA }) : '—');
export const jam = (iso) => new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: ZONA });

export function hariIniWib() {
  const bagian = new Intl.DateTimeFormat('en-CA', { timeZone: ZONA, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  return bagian; // YYYY-MM-DD
}

export function geserTanggal(t, hari) {
  const d = new Date(`${t}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + hari);
  return d.toISOString().slice(0, 10);
}

export function periodeTeks(mulai, selesai) {
  const a = keTanggal(mulai);
  const b = keTanggal(selesai);
  const bulanSama = a.toLocaleDateString('id-ID', { month: 'short', timeZone: ZONA }) === b.toLocaleDateString('id-ID', { month: 'short', timeZone: ZONA });
  return bulanSama ? `${a.toLocaleDateString('id-ID', { day: 'numeric', timeZone: ZONA })}–${tglPendek(b)}` : `${tglPendek(a)} – ${tglPendek(b)}`;
}

export const jarakTeks = (m) => (m == null ? '—' : m >= 1000 ? `${(m / 1000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} km` : `${Math.round(m)} m`);

export const NAMA_STATUS = {
  terverifikasi: 'Terverifikasi',
  lokasi_jauh: 'Lokasi jauh',
  lokasi_lemah: 'Lokasi lemah',
  tanpa_qr: 'Tanpa QR',
  rumah: 'Harga rumah',
};
