import { useEffect, useState } from 'react';

const API = `${process.env.REACT_APP_BACKEND_URL || ''}/api`;

export default function App() {
  const [status, setStatus] = useState('memeriksa…');
  useEffect(() => {
    fetch(`${API}/sehat`).then((r) => r.json()).then((d) => setStatus(d.status)).catch(() => setStatus('backend tidak terhubung'));
  }, []);
  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: 24 }}>
      <h1>AQUAIR</h1>
      <p>Kerangka aplikasi. Status backend: <b>{status}</b></p>
    </main>
  );
}
