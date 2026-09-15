import { useEffect, useState } from 'react';
import { Link, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { api } from '../api';
import Ikon, { Logo } from '../komponen/Ikon';
import { DemoBar, Modal, useData } from '../komponen/umum';
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
import PenjualanDepot from './PenjualanDepot';
import Persetujuan from './Persetujuan';
import Produk from './Produk';
import Radar from './Radar';
import { DetailRit, DaftarRit } from './Rit';
import StikerQR from './StikerQR';
import { KonteksBos } from './umumBos';
import Unduh from './Unduh';

const MENU = [
  ['', 'Dasbor', 'dasbor'], ['radar', 'Radar Kecurangan', 'radar'], ['rit', 'Rit & setoran', 'rit'], ['depot', 'Penjualan di depot', 'toko'],
  ['-', 'Data'], ['persetujuan', 'Persetujuan', 'setuju'], ['pelanggan', 'Pelanggan', 'orang'], ['qr', 'Stiker QR', 'qr'],
  ['bon', 'Bon belum lunas', 'uang'], ['kurir', 'Kurir', 'orang'],
  ['-', 'Galon dan toko'], ['galon', 'Galon di luar', 'galon'], ['konfirmasi', 'Konfirmasi toko', 'wa'],
  ['-', 'Depot'], ['produk', 'Produk & harga', 'galon'], ['perawatan', 'Perawatan mesin', 'alat'], ['kepatuhan', 'Kepatuhan', 'perisai'], ['unduh', 'Unduh data', 'unduh'],
  ['pengaturan', 'Pengaturan', 'gerigi'],
];

export default function BosApp() {
  const { sesi, keluar } = useSesi();
  const lokasi = useLocation();
  const [menuTerbuka, setMenuTerbuka] = useState(false);
  const [cariMenu, setCariMenu] = useState('');
  useEffect(() => { setMenuTerbuka(false); }, [lokasi.pathname]);
  const lencana = useData(() => api('/bos/persetujuan').then((r) => r.menunggu.length), [sesi.token]);
  const { muatUlang } = lencana;
  useEffect(() => { muatUlang({ diam: true }); }, [lokasi.pathname, muatUlang]);

  const daftarMenu = (mobile = false) => <>
    <div className="depot"><span className="depot-icon"><Ikon n="toko" s={21} /></span><div><b>{sesi.depot?.nama}</b><span className="small muted">{sesi.demo ? 'Depot contoh' : 'Ruang pemilik depot'}</span></div></div>
    <label className="nav-search"><Ikon n="cari" s={16} /><input aria-label={mobile ? 'Cari menu di HP' : 'Cari menu'} placeholder="Cari menu…" value={cariMenu} onChange={(e) => setCariMenu(e.target.value)} /></label>
    <div className="nav-menu">{MENU.filter(([jalur, label]) => !cariMenu || (jalur !== '-' && label.toLowerCase().includes(cariMenu.toLowerCase()))).map(([jalur, label, ikon], i) => jalur === '-'
      ? <div className="sep" key={`sep-${i}`}>{label}</div>
      : <NavLink key={jalur || 'dasbor'} to={`/bos${jalur ? `/${jalur}` : ''}`} end={!jalur} onClick={() => { setMenuTerbuka(false); setCariMenu(''); }}><Ikon n={ikon} s={19} />{label}{jalur === 'persetujuan' && lencana.data > 0 && <span className="badge">{lencana.data}</span>}</NavLink>)}
      {cariMenu && !MENU.some(([jalur, label]) => jalur !== '-' && label.toLowerCase().includes(cariMenu.toLowerCase())) && <p className="small muted nav-empty">Menu tidak ditemukan.</p>}
    </div>
    <div className="nav-bottom"><div className="nav-tip"><Ikon n="perisai" s={21} /><b>Usaha lebih terjaga.</b><p>Catatan jelas, keputusan lebih tenang.</p></div><div className="nav-profile"><span className="owner-avatar">{(sesi.nama || 'P')[0]}</span><div><b>{sesi.nama || 'Pemilik depot'}</b><small>Pemilik depot</small></div><button onClick={keluar} aria-label={sesi.demo ? 'Keluar dari demo' : 'Keluar'} title="Keluar"><Ikon n="keluar" s={19} /></button></div></div>
  </>;

  return (
    <KonteksBos.Provider value={{ muatLencana: () => muatUlang({ diam: true }) }}>
      <div className="owner-shell v2">
        <a className="skip-link" href="#konten-depot">Langsung ke isi</a>
        <header className="workspace-header no-print"><Link to="/" className="logo"><Logo s={34} />AQUAIR<span className="logo-dot">.</span></Link><div className="workspace-breadcrumb"><span>Ruang kerja</span><Ikon n="kanan" s={13} /><b>{sesi.depot?.nama}</b></div><div className="workspace-actions"><Link to="/bos/unduh" className="btn btn-ghost"><Ikon n="unduh" s={16} /><span>Unduh laporan</span></Link><span className="owner-avatar">{(sesi.nama || 'P')[0]}</span><button className="mobile-menu btn" aria-label="Buka menu depot" aria-expanded={menuTerbuka} onClick={() => setMenuTerbuka(true)}><Ikon n="menu" />Menu</button></div></header>
        <DemoBar peran="bos" />
        <div className="app penuh">
          <nav className="app-nav no-print" aria-label="Menu bos"><Link className="sidebar-brand logo" to="/"><Logo s={38} />AQUAIR<span className="logo-dot">.</span></Link>{daftarMenu()}</nav>
          {menuTerbuka && <Modal judul="Menu depot" onTutup={() => setMenuTerbuka(false)}><button className="btn drawer-close" onClick={() => setMenuTerbuka(false)} aria-label="Tutup menu"><Ikon n="silang" /></button><nav className="drawer-nav" aria-label="Menu bos di HP">{daftarMenu(true)}</nav></Modal>}
        <Routes>
          <Route index element={<Dasbor />} />
          <Route path="radar" element={<Radar />} />
          <Route path="rit" element={<DaftarRit />} />
          <Route path="rit/:id" element={<DetailRit />} />
          <Route path="depot" element={<PenjualanDepot />} />
          <Route path="produk" element={<Produk />} />
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
      </div>
    </KonteksBos.Provider>
  );
}
