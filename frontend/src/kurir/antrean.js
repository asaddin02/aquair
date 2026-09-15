import { useCallback, useEffect, useRef, useState } from 'react';
import { api, GalatApi, penyimpanan } from '../api';

// Antrean tanpa sinyal (spesifikasi 3.2, Tahap 2): penjualan disimpan di HP beserta waktu HP,
// lalu dikirim saat sinyal kembali. client_id yang sama mencegah penjualan ganda.
const kunci = (depotId) => `aquair.antrean.${depotId}`;

export const bacaAntrean = (depotId) => penyimpanan.baca(kunci(depotId)) || [];
const tulisAntrean = (depotId, isi) => penyimpanan.tulis(kunci(depotId), isi);

export function tambahKeAntrean(depotId, body, label) {
  const isi = bacaAntrean(depotId);
  isi.push({ body: { ...body, dicatat_offline: true, waktu_hp: new Date().toISOString() }, label, galat: null });
  tulisAntrean(depotId, isi);
}

export async function simpanPenjualan(body) {
  return api('/kurir/penjualan', { method: 'POST', body });
}

export function useAntrean(depotId, setelahTerkirim) {
  const [antrean, setAntrean] = useState(() => bacaAntrean(depotId));
  const sedang = useRef(false);
  const muatUlang = useCallback(() => setAntrean(bacaAntrean(depotId)), [depotId]);

  const kirimSekarang = useCallback(async () => {
    if (sedang.current) return 0;
    sedang.current = true;
    let terkirim = 0;
    try {
      for (const item of bacaAntrean(depotId)) {
        try {
          await simpanPenjualan(item.body);
          tulisAntrean(depotId, bacaAntrean(depotId).filter((x) => x.body.client_id !== item.body.client_id));
          terkirim += 1;
        } catch (e) {
          if (e instanceof GalatApi && e.jaringan) break;
          tulisAntrean(depotId, bacaAntrean(depotId).map((x) => (x.body.client_id === item.body.client_id ? { ...x, galat: e.message } : x)));
        }
      }
    } finally {
      sedang.current = false;
      muatUlang();
      if (terkirim) setelahTerkirim?.(terkirim);
    }
    return terkirim;
  }, [depotId, muatUlang, setelahTerkirim]);

  const buang = useCallback((clientId) => {
    tulisAntrean(depotId, bacaAntrean(depotId).filter((x) => x.body.client_id !== clientId));
    muatUlang();
  }, [depotId, muatUlang]);

  useEffect(() => {
    const online = () => kirimSekarang();
    window.addEventListener('online', online);
    const jeda = setInterval(() => { if (bacaAntrean(depotId).length && navigator.onLine) kirimSekarang(); }, 20000);
    if (bacaAntrean(depotId).length && navigator.onLine) kirimSekarang();
    return () => { window.removeEventListener('online', online); clearInterval(jeda); };
  }, [depotId, kirimSekarang]);

  return { antrean, kirimSekarang, muatUlang, buang };
}
