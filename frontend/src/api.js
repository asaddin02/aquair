// Penghubung ke backend FastAPI. Semua endpoint ada di bawah /api.
const DASAR = `${process.env.REACT_APP_BACKEND_URL || ''}/api`;
const KUNCI_SESI = 'aquair.sesi';
const KUNCI_DEMO = 'aquair.demo';

function baca(kunci) {
  try {
    return JSON.parse(localStorage.getItem(kunci) || 'null');
  } catch {
    return null;
  }
}

function tulis(kunci, nilai) {
  try {
    if (nilai == null) localStorage.removeItem(kunci);
    else localStorage.setItem(kunci, JSON.stringify(nilai));
  } catch {
    /* penyimpanan browser tidak tersedia */
  }
}

export const penyimpanan = {
  sesi: () => baca(KUNCI_SESI),
  simpanSesi: (s) => tulis(KUNCI_SESI, s),
  demo: () => baca(KUNCI_DEMO),
  simpanDemo: (d) => tulis(KUNCI_DEMO, d),
  baca,
  tulis,
};

export class GalatApi extends Error {
  constructor(pesan, status = 0, jaringan = false) {
    super(pesan);
    this.status = status;
    this.jaringan = jaringan;
  }
}

function pesanDariDetail(detail) {
  if (!detail) return null;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    const kolom = detail.map((d) => (d.loc || []).slice(-1)[0]).filter(Boolean);
    return `Isian belum benar${kolom.length ? `: ${kolom.join(', ')}` : ''}.`;
  }
  return null;
}

export async function api(jalur, { method = 'GET', body, token, mentah = false } = {}) {
  const t = token ?? penyimpanan.sesi()?.token;
  let respons;
  try {
    respons = await fetch(DASAR + jalur, {
      method,
      headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(t ? { Authorization: `Bearer ${t}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new GalatApi('Tidak ada sinyal atau server tidak terjangkau.', 0, true);
  }
  if (respons.status === 401 && t && !jalur.startsWith('/auth/masuk')) {
    window.dispatchEvent(new CustomEvent('aquair:sesi-berakhir'));
  }
  if (mentah) {
    if (!respons.ok) {
      const data = await respons.json().catch(() => ({}));
      throw new GalatApi(pesanDariDetail(data.detail) || `Terjadi galat (${respons.status}).`, respons.status);
    }
    return respons;
  }
  const data = await respons.json().catch(() => ({}));
  if (!respons.ok) {
    throw new GalatApi(pesanDariDetail(data.detail) || `Terjadi galat (${respons.status}). Coba lagi.`, respons.status, respons.status >= 502);
  }
  return data;
}

export const idUnik = () =>
  (window.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`).replace(/-/g, '');
