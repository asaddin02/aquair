import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import BosApp from './bos/BosApp';
import Daftar from './halaman/Daftar';
import KonfirmasiToko from './halaman/KonfirmasiToko';
import Landing from './halaman/Landing';
import Masuk from './halaman/Masuk';
import KurirApp from './kurir/KurirApp';
import { ToastProvider } from './komponen/umum';
import { SesiProvider, useSesi } from './Sesi';

function Penjaga({ peran, children }) {
  const { sesi } = useSesi();
  if (!sesi) return <Navigate to="/masuk" replace />;
  if (sesi.peran !== peran) return <Navigate to={sesi.peran === 'bos' ? '/bos' : '/kurir'} replace />;
  return children;
}

function NavigasiHalaman() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    if (!pathname.startsWith('/bos')) {
      document.title = `${pathname.startsWith('/kurir') ? 'Ruang kurir' : pathname === '/masuk' ? 'Masuk' : pathname === '/daftar' ? 'Daftarkan depot' : 'Air mengalir. Usaha terkendali.'} · AQUAIR`;
    }
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <NavigasiHalaman />
      <SesiProvider>
        <ToastProvider>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/masuk" element={<Masuk />} />
            <Route path="/daftar" element={<Daftar />} />
            <Route path="/k/:token" element={<KonfirmasiToko />} />
            <Route path="/kurir/*" element={<Penjaga peran="kurir"><KurirApp /></Penjaga>} />
            <Route path="/bos/*" element={<Penjaga peran="bos"><BosApp /></Penjaga>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ToastProvider>
      </SesiProvider>
    </BrowserRouter>
  );
}
