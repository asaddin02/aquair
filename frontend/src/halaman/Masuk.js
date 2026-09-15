import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import Ikon from '../komponen/Ikon';
import AuthLayout from '../komponen/AuthLayout';
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

function FormMasuk({ peran }) {
  const { masuk, masukDemo } = useSesi();
  const pergi = useNavigate();
  const [username, setUsername] = useState('');
  const [sandi, setSandi] = useState('');
  const [keypad, setKeypad] = useState(false);
  const [galat, setGalat] = useState(null);
  const [kirim, setKirim] = useState(false);
  const bos = peran === 'bos';
  const akunContoh = bos ? 'admin' : 'kurir';
  const nomorHp = !bos && /^\+?[\d\s-]+$/.test(username.trim());
  const pakaiKeypad = nomorHp && keypad;
  const terkunci = galat?.status === 423;
  const submit = async (e) => {
    e.preventDefault();
    setGalat(null);
    setKirim(true);
    try {
      const nama = username.trim().toLowerCase();
      if (nama === akunContoh) {
        await masukDemo(nama, sandi);
      } else if (nama === 'admin' || nama === 'kurir') {
        throw new Error(`Pilih ${nama === 'admin' ? 'Bos' : 'Kurir'} untuk masuk dengan akun ${nama}.`);
      } else {
        masuk(await api(bos ? '/auth/masuk-bos' : '/auth/masuk-kurir', {
          method: 'POST', token: '',
          body: bos ? { email: username, sandi } : { no_hp: username, pin: sandi },
        }));
      }
      pergi(bos ? '/bos' : '/kurir');
    } catch (err) {
      setGalat(err);
    } finally {
      setKirim(false);
    }
  };
  const ubahUsername = (e) => {
    setUsername(e.target.value);
    setGalat(null);
  };
  return (
    <form className="stack" onSubmit={submit}>
      <PesanGalat galat={galat} />
      <label className="field" htmlFor="masuk-username"><span>{bos ? 'Username atau email' : 'Username atau nomor HP'}</span>
        <input id="masuk-username" className="input" autoComplete="username" autoCapitalize="none" spellCheck={false} required maxLength={120} disabled={kirim} value={username} onChange={ubahUsername} placeholder={bos ? 'admin atau nama@email.com' : 'kurir atau 08…'} /></label>
      {pakaiKeypad ? <>
        <div className="field"><span>PIN 6 angka</span>
          <div className="pin" role="img" aria-label={`${sandi.length} dari 6 angka PIN terisi`}>
            {Array.from({ length: 6 }, (_, i) => <span key={i} className={i < sandi.length ? 'isi' : ''}>{i < sandi.length ? '•' : ''}</span>)}
          </div>
        </div>
        <div className="keypad">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'hapus', '0'].map((d) => <button key={d} type="button" className={d === 'hapus' ? 'kecil' : ''} disabled={terkunci || kirim}
            onClick={() => setSandi((s) => d === 'hapus' ? s.slice(0, -1) : (s.length < 6 ? s + d : s))} aria-label={d === 'hapus' ? 'Hapus satu angka' : d}>{d === 'hapus' ? 'Hapus' : d}</button>)}
          <button type="submit" className="kecil masuk" disabled={terkunci || kirim || sandi.length !== 6}>{kirim ? '…' : 'Masuk'}</button>
        </div>
      </> : <>
        <label className="field" htmlFor="masuk-sandi"><span>{bos ? 'Kata sandi' : 'Kata sandi atau PIN'}</span>
          <input id="masuk-sandi" className="input" type="password" autoComplete="current-password" inputMode={nomorHp ? 'numeric' : 'text'} required maxLength={nomorHp ? 6 : 128} disabled={kirim} value={sandi} onChange={(e) => setSandi(e.target.value)} /></label>
        <button className="btn btn-primary btn-lg btn-block" disabled={terkunci || kirim}>{kirim ? 'Memeriksa…' : 'Masuk'}</button>
      </>}
      {nomorHp && <button type="button" className="text-action" disabled={kirim} onClick={() => { setKeypad(!keypad); setSandi(''); }}>{pakaiKeypad ? 'Ketik PIN dengan keyboard' : 'Gunakan keypad PIN'}</button>}
      <p className="small muted">Untuk mencoba dengan data contoh: <b>{akunContoh} / {akunContoh}</b> (username / kata sandi).</p>
      {bos ? <p className="small muted">Belum punya akun? <Link to="/daftar">Daftarkan depot</Link></p> : <p className="small muted">Akun dari pemilik depot memakai nomor HP dan PIN 6 angka. Lupa PIN? Minta pemilik mengaturnya ulang dari menu Kurir.</p>}
    </form>
  );
}

function PanduanMasuk() {
  const [terbuka, setTerbuka] = useState(() => new URLSearchParams(window.location.search).has('panduan'));
  return <details className="login-help" open={terbuka} onToggle={(e) => setTerbuka(e.currentTarget.open)}>
    <summary>Cara login dan memakai AQUAIR</summary>
    <div className="stack">
      <p>Pilih <b>Bos</b> atau <b>Kurir</b>, isi akun, lalu tekan <b>Masuk</b>.</p>
      <div><b>Mencoba dengan data contoh</b><p>Bos: <strong>admin / admin</strong><br />Kurir: <strong>kurir / kurir</strong><br /><span className="muted">Username / kata sandi. Data contoh milik setiap browser terpisah.</span></p></div>
      <div><b>Memakai depot sendiri</b><p>Bos masuk dengan email dan kata sandi saat mendaftar. Kurir memakai nomor HP dan PIN yang diberikan bos.</p></div>
      <ol><li><b>Bos:</b> cek dasbor, pelanggan, serta muatan kurir di Rit &amp; setoran.</li><li><b>Kurir:</b> mulai rit, catat penjualan ke rumah atau toko, lalu buka Riwayat.</li><li><b>Selesai mengantar:</b> kurir membuka Setor. Bos memeriksa setoran, Radar, dan Persetujuan.</li></ol>
      <p>Di data contoh, tombol <b>Bos / Kurir</b> mengganti peran pada depot yang sama.</p>
    </div>
  </details>;
}

export default function Masuk() {
  const [tab, setTab] = useState('bos');
  const { coba, menyiapkan, tampilan } = useCobaDemo();
  return (
    <AuthLayout>
      <div className="auth">
        <div className="auth-heading"><span className="eyebrow">SENANG MELIHAT ANDA KEMBALI</span><h1>Selamat datang.</h1><p>Masuk dan lanjutkan aktivitas depot Anda.</p></div>
        <span className="seg" role="group" aria-label="Masuk sebagai" style={{ alignSelf: 'start', justifySelf: 'start' }}>
          <button aria-pressed={tab === 'bos'} onClick={() => setTab('bos')}>Bos</button>
          <button aria-pressed={tab === 'kurir'} onClick={() => setTab('kurir')}>Kurir</button>
        </span>
        <FormMasuk key={tab} peran={tab} />
        <PanduanMasuk />
        <div className="divider">atau coba tanpa akun</div>
        <div className="grid-2" style={{ gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <button className="btn" onClick={() => coba('bos')} disabled={menyiapkan}>Coba sebagai Bos</button>
          <button className="btn" onClick={() => coba('kurir')} disabled={menyiapkan}>Coba sebagai Kurir</button>
        </div>
        {tampilan}
      </div>
    </AuthLayout>
  );
}
