import { useEffect } from 'react';
import { NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { api } from '../api';
import Ikon from '../komponen/Ikon';
import { DemoBar, useData } from '../komponen/umum';
import { useSesi } from '../Sesi';
import Bon from './Bon';
import Dasbor from './Dasbor';
import Galon from './Galon';
import Kepatuhan from './Kepatuhan';
import Konfirmasi from './Konfirmasi';
import Kurir from './Kurir';
import Pelanggan from './Pelanggan';
import Pengaturan from './Pengaturan';
import Perawatan from './Perawatan';
import Persetujuan from './Persetujuan';
import Radar from './Radar';
import { DetailRit, DaftarRit } from './Rit';
import StikerQR from './StikerQR';
import { KonteksBos } from './umumBos';
import Unduh from './Unduh';

const MENU = [
  ['', 'Dasbor', 'dasbor'], ['radar', 'Radar Kecurangan', 'radar'], ['rit', 'Rit & setoran', 'rit'],
  ['-', 'Data'], ['persetujuan', 'Persetujuan', 'setuju'], ['pelanggan', 'Pelanggan', 'orang'], ['qr', 'Stiker QR', 'qr'],
  ['bon', 'Bon belum lunas', 'uang'], ['kurir', 'Kurir', 'orang'],
  ['-', 'Galon dan toko'], ['galon', 'Galon di luar', 'galon'], ['konfirmasi', 'Konfirmasi toko', 'wa'],
  ['-', 'Depot'], ['perawatan', 'Perawatan mesin', 'alat'], ['kepatuhan', 'Kepatuhan', 'perisai'], ['unduh', 'Unduh data', 'unduh'],
  ['pengaturan', 'Pengaturan', 'gerigi'],
];

export default function BosApp() {
  const { sesi, keluar } = useSesi();
  const lokasi = useLocation();
  const lencana = useData(() => api('/bos/persetujuan').then((r) => r.menunggu.length), [sesi.token]);
  const { muatUlang } = lencana;
  useEffect(() => { muatUlang({ diam: true }); }, [lokasi.pathname, muatUlang]);

  return (
    <KonteksBos.Provider value={{ muatLencana: () => muatUlang({ diam: true }) }}>
      <DemoBar peran="bos" />
      <div className="app penuh">
        <nav className="app-nav no-print" aria-label="Menu bos">
          <div className="depot"><b>{sesi.depot?.nama}</b><span className="small muted">{sesi.demo ? 'Depot contoh' : sesi.nama}</span></div>
          {MENU.map(([jalur, label, ikon], i) => jalur === '-'
            ? <div className="sep" key={`sep-${i}`}>{label}</div>
            : (
              <NavLink key={jalur || 'dasbor'} to={`/bos${jalur ? `/${jalur}` : ''}`} end={!jalur}>
                <Ikon n={ikon} s={18} />{label}
                {jalur === 'persetujuan' && lencana.data > 0 && <span className="badge">{lencana.data}</span>}
              </NavLink>
            ))}
          {!sesi.demo && <button onClick={keluar} style={{ marginTop: 12 }}><Ikon n="keluar" s={18} />Keluar</button>}
        </nav>
        <Routes>
          <Route index element={<Dasbor />} />
          <Route path="radar" element={<Radar />} />
          <Route path="rit" element={<DaftarRit />} />
          <Route path="rit/:id" element={<DetailRit />} />
          <Route path="persetujuan" element={<Persetujuan />} />
          <Route path="pelanggan" element={<Pelanggan />} />
          <Route path="qr" element={<StikerQR />} />
          <Route path="bon" element={<Bon />} />
          <Route path="kurir" element={<Kurir />} />
          <Route path="galon" element={<Galon />} />
          <Route path="konfirmasi" element={<Konfirmasi />} />
          <Route path="perawatan" element={<Perawatan />} />
          <Route path="kepatuhan" element={<Kepatuhan />} />
          <Route path="unduh" element={<Unduh />} />
          <Route path="pengaturan" element={<Pengaturan />} />
          <Route path="*" element={<Dasbor />} />
        </Routes>
      </div>
    </KonteksBos.Provider>
  );
}
