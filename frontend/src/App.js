import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
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

export default function App() {
  return (
    <BrowserRouter>
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
