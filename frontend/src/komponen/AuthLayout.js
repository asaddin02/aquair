import { Link } from 'react-router-dom';
import Ikon, { Logo } from './Ikon';

export default function AuthLayout({ children, daftar = false }) {
  return <div className="auth-layout">
    <aside className="auth-story"><Link className="logo" to="/"><Logo s={38} />AQUAIR<span className="logo-dot">.</span></Link><div className="auth-story-content"><span className="eyebrow">TEMAN USAHA DEPOT AIR MINUM</span><h1>Setiap galon<br />berarti.<br /><em>Setiap rupiah<br />terjaga.</em></h1><p>Satukan catatan, pengantaran, dan setoran dalam satu ruang kerja yang nyaman.</p><div className="auth-proof"><Ikon n="perisai" s={25} /><span>Catatan yang jelas.<br /><b>Usaha yang lebih terkendali.</b></span></div></div><span className="small">Dibuat untuk keseharian depot di Indonesia.</span></aside>
    <div className="auth-form-side"><nav className="auth-nav"><Link to="/" className="auth-back"><Ikon n="kiri" s={16} />Beranda</Link><span>{daftar ? 'Sudah punya akun?' : 'Baru di AQUAIR?'} <Link to={daftar ? '/masuk' : '/daftar'}>{daftar ? 'Masuk' : 'Daftar depot'}</Link></span></nav>{children}<div className="auth-foot"><Logo s={20} />AQUAIR · Air mengalir. Usaha terkendali.</div></div>
  </div>;
}
