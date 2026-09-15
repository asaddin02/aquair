import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, penyimpanan } from './api';

// Sesi masuk: { peran: 'bos'|'kurir', token, depot, nama, demo: boolean }
const KonteksSesi = createContext(null);

export function SesiProvider({ children }) {
  const [sesi, setSesi] = useState(() => penyimpanan.sesi());

  const simpan = useCallback((s) => {
    penyimpanan.simpanSesi(s);
    setSesi(s);
  }, []);

  const masuk = useCallback((hasil) => {
    simpan({ peran: hasil.peran, token: hasil.token, depot: hasil.depot, nama: hasil.pengguna?.nama, demo: false });
  }, [simpan]);

  const keluar = useCallback(() => simpan(null), [simpan]);

  const pakaiDemo = useCallback((r, peran) => {
    penyimpanan.simpanDemo(r);
    simpan({ peran, token: peran === 'bos' ? r.token_bos : r.token_kurir, depot: { id: r.depot_id, nama: r.nama_depot, is_demo: true }, nama: peran === 'bos' ? 'Pemilik Depot' : 'Rudi', demo: true });
    return r;
  }, [simpan]);

  // Setiap browser memakai depot demo miliknya sendiri; ID-nya disimpan di browser (spesifikasi 10.1).
  const mulaiDemo = useCallback(async (peran, { baru = false } = {}) => {
    const lama = baru ? null : penyimpanan.demo();
    const r = await api('/demo/mulai', { method: 'POST', body: { depot_id: lama?.depot_id || null }, token: '' });
    return pakaiDemo(r, peran);
  }, [pakaiDemo]);

  const masukDemo = useCallback(async (username, sandi) => {
    const lama = penyimpanan.demo();
    const r = await api('/demo/masuk', { method: 'POST', body: { username, sandi, depot_id: lama?.depot_id || null }, token: '' });
    return pakaiDemo(r, r.peran);
  }, [pakaiDemo]);

  const lihatSebagai = useCallback((peran) => {
    const d = penyimpanan.demo();
    setSesi((s) => {
      if (!d || !s?.demo) return s;
      const baru = { ...s, peran, token: peran === 'bos' ? d.token_bos : d.token_kurir, nama: peran === 'bos' ? 'Pemilik Depot' : 'Rudi' };
      penyimpanan.simpanSesi(baru);
      return baru;
    });
  }, []);

  useEffect(() => {
    const berakhir = () => simpan(null);
    window.addEventListener('aquair:sesi-berakhir', berakhir);
    return () => window.removeEventListener('aquair:sesi-berakhir', berakhir);
  }, [simpan]);

  return <KonteksSesi.Provider value={{ sesi, masuk, keluar, mulaiDemo, masukDemo, lihatSebagai }}>{children}</KonteksSesi.Provider>;
}

export const useSesi = () => useContext(KonteksSesi);
