import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import Ikon from '../komponen/Ikon';
import { KotakGalat, Stepper } from '../komponen/umum';
import { KTop, useKurir } from './KurirApp';

export default function MulaiRit() {
  const { beranda } = useKurir();
  const pergi = useNavigate();
  const [dibawa, setDibawa] = useState(40);
  const [kirim, setKirim] = useState(false);
  const [galat, setGalat] = useState(null);
  const [mulai, setMulai] = useState(null);

  const submit = async () => {
    setKirim(true);
    setGalat(null);
    try {
      setMulai(await api('/kurir/rit/mulai', { method: 'POST', body: { dibawa } }));
      beranda.muatUlang({ diam: true });
    } catch (e) {
      setGalat(e);
    } finally {
      setKirim(false);
    }
  };

  if (mulai) {
    return (
      <>
        <KTop judul="Rit dimulai" kembali={null} />
        <div className="k-body">
          <div className="hasil info"><div className="ikon"><Ikon n="rit" s={30} /></div><div className="judul">Muatan {mulai.dibawa} galon</div>
            <span className="chip warn" style={{ justifySelf: 'start' }}><Ikon n="awas" s={14} />Muatan belum dicek bos</span>
            <p style={{ fontSize: 15 }}>Rit tetap bisa berjalan. Bos akan menghitung galon di motor lalu menekan "Muatan cocok".</p></div>
          <button className="btn btn-primary btn-lg btn-block" onClick={() => pergi('/kurir')}>Lanjut ke rit</button>
        </div>
      </>
    );
  }

  return (
    <>
      <KTop judul="Mulai rit" />
      <div className="k-body">
        <p>Hitung galon isi di motor, lalu mulai rit.</p>
        <Stepper label="Galon isi yang dibawa" nilai={dibawa} min={1} max={500} onUbah={setDibawa} />
        <KotakGalat galat={galat} />
        <button className="btn btn-primary btn-lg btn-block" onClick={submit} disabled={kirim}>{kirim ? 'Memulai…' : 'Mulai rit'}</button>
        <p className="small muted">Bos mengecek jumlah muatan. Kalau hanya kurir yang menulis muatan, galon lebih bisa dijual tanpa catatan.</p>
      </div>
    </>
  );
}
