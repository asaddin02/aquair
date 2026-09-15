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
        <div className="mobile-intro trip-intro"><span className="start-trip-icon"><Ikon n="rit" s={38} /></span><span className="eyebrow">AWAL PERJALANAN</span><h2>Siapkan muatan.<br />Siap mengantar.</h2><p>Hitung galon isi yang benar-benar ada di motor.</p></div>
        <Stepper label="Galon isi yang dibawa" nilai={dibawa} min={1} max={500} onUbah={setDibawa} />
<div className="load-presets" role="group" aria-label="Pilihan muatan cepat">{[20, 30, 40, 50].map((n) => <button key={n} aria-pressed={dibawa === n} onClick={() => setDibawa(n)}>{n} galon</button>)}</div>
        <KotakGalat galat={galat} />
        <button className="btn btn-primary btn-lg btn-block" onClick={submit} disabled={kirim}>{kirim ? 'Memulai…' : 'Mulai rit'}</button>
        <div className="mobile-note-card"><Ikon n="perisai" s={22} /><p>Minta bos menghitung ulang muatan sebelum berangkat. Rit tetap bisa dimulai sambil menunggu pengecekan.</p></div>
      </div>
    </>
  );
}
