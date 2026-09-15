import { createContext, useCallback, useContext } from 'react';
import { Route, Routes, useNavigate } from 'react-router-dom';
import { api } from '../api';
import Ikon from '../komponen/Ikon';
import { DemoBar, useData, useToast } from '../komponen/umum';
import { useSesi } from '../Sesi';
import { useAntrean } from './antrean';
import Beranda from './Beranda';
import Hasil from './Hasil';
import JualRumah from './JualRumah';
import JualToko from './JualToko';
import Koreksi from './Koreksi';
import MulaiRit from './MulaiRit';
import SelesaiRit from './SelesaiRit';

const KonteksKurir = createContext(null);
export const useKurir = () => useContext(KonteksKurir);

export function KTop({ judul, kembali = '/kurir', kanan }) {
  const pergi = useNavigate();
  return (
    <div className="k-top">
      {kembali && <button className="k-back" onClick={() => pergi(kembali)} aria-label="Kembali"><Ikon n="kiri" s={22} /></button>}
      <h2 className="grow">{judul}</h2>
      {kanan}
    </div>
  );
}

export default function KurirApp() {
  const { sesi } = useSesi();
  const toast = useToast();
  const beranda = useData(() => api('/kurir/beranda'), [sesi.token]);
  const { muatUlang } = beranda;
  const setelahTerkirim = useCallback((n) => {
    toast(`${n} penjualan dari antrean terkirim`);
    muatUlang({ diam: true });
  }, [toast, muatUlang]);
  const antrean = useAntrean(sesi.depot.id, setelahTerkirim);

  return (
    <KonteksKurir.Provider value={{ beranda, antrean }}>
      <div className="layar-kurir">
        <DemoBar peran="kurir" />
        <Routes>
          <Route index element={<Beranda />} />
          <Route path="mulai" element={<MulaiRit />} />
          <Route path="toko" element={<JualToko />} />
          <Route path="rumah" element={<JualRumah />} />
          <Route path="hasil" element={<Hasil />} />
          <Route path="selesai" element={<SelesaiRit />} />
          <Route path="koreksi/:id" element={<Koreksi />} />
          <Route path="*" element={<Beranda />} />
        </Routes>
      </div>
    </KonteksKurir.Provider>
  );
}
