import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Link, NavLink, Route, Routes, useNavigate } from 'react-router-dom';
import { api } from '../api';
import Ikon, { Logo } from '../komponen/Ikon';
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
import Riwayat from './Riwayat';

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
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const ubah = () => setOnline(navigator.onLine);
    window.addEventListener('online', ubah); window.addEventListener('offline', ubah);
    return () => { window.removeEventListener('online', ubah); window.removeEventListener('offline', ubah); };
  }, []);
  const beranda = useData(() => api('/kurir/beranda'), [sesi.token]);
  const { muatUlang } = beranda;
  const setelahTerkirim = useCallback((n) => {
    toast(`${n} penjualan dari antrean terkirim`);
    muatUlang({ diam: true });
  }, [toast, muatUlang]);
  const antrean = useAntrean(sesi.depot.id, setelahTerkirim);

  return (
    <KonteksKurir.Provider value={{ beranda, antrean }}>
      <div className="courier-workspace v2">
        <aside className="courier-aside"><Link className="logo" to="/"><Logo s={40} />AQUAIR<span className="logo-dot">.</span></Link><div className="eyebrow">RUANG KURIR</div><h1>Antar airnya.<br /><em>Jaga amanahnya.</em></h1><p>Setiap pengantaran tercatat. Setiap galon bisa ditelusuri. Mulai hari dengan langkah yang lebih tertata.</p><div className="courier-aside-list"><span><Ikon n="qr" />Scan QR untuk harga toko</span><span><Ikon n="galon" />Pantau galon di motor</span><span><Ikon n="uang" />Cocokkan setoran rit</span></div><span className="small muted">AQUAIR · Teman usaha depot air minum</span></aside>
        <main className="layar-kurir">
          <div className="courier-brand"><Link className="logo" to="/"><Logo s={28} />AQUAIR</Link><span className={`connection ${online ? '' : 'offline'}`} role="status"><span className="status-dot" />{online ? 'Terhubung' : 'Tanpa sinyal'}</span></div>
        <DemoBar peran="kurir" />
        <Routes>
          <Route index element={<Beranda />} />
          <Route path="riwayat" element={<Riwayat />} />
          <Route path="mulai" element={<MulaiRit />} />
          <Route path="toko" element={<JualToko />} />
          <Route path="rumah" element={<JualRumah />} />
          <Route path="hasil" element={<Hasil />} />
          <Route path="selesai" element={<SelesaiRit />} />
          <Route path="koreksi/:id" element={<Koreksi />} />
          <Route path="*" element={<Beranda />} />
        </Routes>
          <nav className="courier-bottom" aria-label="Navigasi kurir"><NavLink to="/kurir" end><Ikon n="dasbor" s={23} />Beranda</NavLink><NavLink to="/kurir/riwayat"><Ikon n="rit" s={23} />Riwayat</NavLink>{beranda.data?.rit?.status === 'aktif' ? <NavLink to="/kurir/selesai"><Ikon n="uang" s={23} />Setor</NavLink> : <NavLink to="/kurir/mulai"><Ikon n="tambah" s={23} />Mulai rit</NavLink>}</nav>
        </main>
      </div>
    </KonteksKurir.Provider>
  );
}
