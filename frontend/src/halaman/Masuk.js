import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import Ikon, { Logo } from '../komponen/Ikon';
import { useSesi } from '../Sesi';
import { useCobaDemo } from './Landing';

function PesanGalat({ galat }) {
  if (!galat) return null;
  const terkunci = galat.status === 423;
  return (
    <div className={`banner ${terkunci || galat.status === 403 ? 'danger' : 'warn'}`} role="alert">
      <Ikon n={terkunci ? 'kunci' : galat.jaringan ? 'sinyal' : 'awas'} s={22} /><span>{galat.message}</span>
    </div>
  );
}

function MasukBos() {
  const { masuk } = useSesi();
  const pergi = useNavigate();
  const [email, setEmail] = useState('');
  const [sandi, setSandi] = useState('');
  const [galat, setGalat] = useState(null);
  const [kirim, setKirim] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setKirim(true);
    setGalat(null);
    try {
      masuk(await api('/auth/masuk-bos', { method: 'POST', body: { email, sandi }, token: '' }));
      pergi('/bos');
    } catch (err) {
      setGalat(err);
    } finally {
      setKirim(false);
    }
  };
  return (
    <form className="stack" onSubmit={submit}>
      <PesanGalat galat={galat} />
      <label className="field" htmlFor="masuk-email"><span>Email</span>
        <input id="masuk-email" className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nama@email.com" /></label>
      <label className="field" htmlFor="masuk-sandi"><span>Kata sandi</span>
        <input id="masuk-sandi" className="input" type="password" autoComplete="current-password" required value={sandi} onChange={(e) => setSandi(e.target.value)} /></label>
      <button className="btn btn-primary btn-lg btn-block" disabled={kirim || galat?.status === 423}>{kirim ? 'Memeriksa…' : 'Masuk'}</button>
      <p className="small muted">Belum punya akun? <Link to="/daftar">Daftarkan depot</Link></p>
    </form>
  );
}

function MasukKurir() {
  const { masuk } = useSesi();
  const pergi = useNavigate();
  const [hp, setHp] = useState('');
  const [pin, setPin] = useState('');
  const [galat, setGalat] = useState(null);
  const [kirim, setKirim] = useState(false);
  const terkunci = galat?.status === 423;
  const tekan = async (v) => {
    setGalat((g) => (g?.status === 423 ? g : null));
    if (v === 'hapus') return setPin((p) => p.slice(0, -1));
    if (v !== 'masuk') return setPin((p) => (p.length < 6 ? p + v : p));
    if (hp.replace(/\D/g, '').length < 10) return setGalat({ message: 'Isi nomor HP dulu, minimal 10 angka.' });
    if (pin.length < 6) return setGalat({ message: 'PIN harus 6 angka.' });
    setKirim(true);
    try {
      masuk(await api('/auth/masuk-kurir', { method: 'POST', body: { no_hp: hp, pin }, token: '' }));
      pergi('/kurir');
    } catch (err) {
      setGalat(err);
      setPin('');
    } finally {
      setKirim(false);
    }
  };
  return (
    <div className="stack" style={{ fontSize: 18 }}>
      <PesanGalat galat={galat} />
      <label className="field" htmlFor="masuk-hp"><span>Nomor HP</span>
        <input id="masuk-hp" className="input" style={{ minHeight: 52, fontSize: 18 }} inputMode="tel" autoComplete="tel" value={hp} onChange={(e) => setHp(e.target.value)} placeholder="08…" /></label>
      <div className="field"><span>PIN 6 angka</span>
        <div className="pin" role="img" aria-label={`${pin.length} dari 6 angka PIN terisi`}>
          {Array.from({ length: 6 }, (_, i) => <span key={i} className={i < pin.length ? 'isi' : ''}>{i < pin.length ? '•' : ''}</span>)}
        </div>
      </div>
      <div className="keypad">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => <button key={d} type="button" onClick={() => tekan(d)} disabled={terkunci || kirim}>{d}</button>)}
        <button type="button" className="kecil" onClick={() => tekan('hapus')} disabled={terkunci || kirim} aria-label="Hapus satu angka">Hapus</button>
        <button type="button" onClick={() => tekan('0')} disabled={terkunci || kirim}>0</button>
        <button type="button" className="kecil masuk" onClick={() => tekan('masuk')} disabled={terkunci || kirim}>{kirim ? '…' : 'Masuk'}</button>
      </div>
      <p className="small muted">Lupa PIN? Minta pemilik depot mengatur ulang PIN dari menu Kurir.</p>
    </div>
  );
}

export default function Masuk() {
  const [tab, setTab] = useState('bos');
  const { coba, menyiapkan, tampilan } = useCobaDemo();
  return (
    <div className="site penuh">
      <nav className="site-nav"><Link className="logo" to="/" style={{ textDecoration: 'none' }}><Logo s={28} />AQUAIR</Link></nav>
      <div className="auth">
        <h2>Masuk</h2>
        <span className="seg" role="group" aria-label="Masuk sebagai" style={{ alignSelf: 'start', justifySelf: 'start' }}>
          <button aria-pressed={tab === 'bos'} onClick={() => setTab('bos')}>Pemilik depot</button>
          <button aria-pressed={tab === 'kurir'} onClick={() => setTab('kurir')}>Kurir</button>
        </span>
        {tab === 'bos' ? <MasukBos /> : <MasukKurir />}
        <div className="divider">atau coba tanpa akun</div>
        <div className="grid-2" style={{ gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <button className="btn" onClick={() => coba('bos')} disabled={menyiapkan}>Coba sebagai Bos</button>
          <button className="btn" onClick={() => coba('kurir')} disabled={menyiapkan}>Coba sebagai Kurir</button>
        </div>
        {tampilan}
      </div>
    </div>
  );
}
