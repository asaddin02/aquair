import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { NAMA_STATUS } from '../format';
import { useSesi } from '../Sesi';
import Ikon from './Ikon';

// ---------------------------------------------------------------- data dari API
export function useData(ambil, deps = []) {
  const [keadaan, setKeadaan] = useState({ data: null, galat: null, memuat: true });
  const nomor = useRef(0);
  const muatUlang = useCallback(async ({ diam = false } = {}) => {
    const ini = ++nomor.current;
    if (!diam) setKeadaan((k) => ({ ...k, memuat: true, galat: null }));
    try {
      const data = await ambil();
      if (ini === nomor.current) setKeadaan({ data, galat: null, memuat: false });
    } catch (galat) {
      if (ini === nomor.current) setKeadaan((k) => ({ ...k, galat, memuat: false }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => { muatUlang(); }, [muatUlang]);
  const setData = (fn) => setKeadaan((k) => ({ ...k, data: typeof fn === 'function' ? fn(k.data) : fn }));
  return { ...keadaan, muatUlang, setData };
}

export function Memuat({ teks = 'Memuat…' }) {
  return <div className="pusat" role="status"><div className="stack" style={{ '--gap': '12px' }}><div className="putar" aria-hidden="true" /><span className="muted">{teks}</span></div></div>;
}

export function KotakGalat({ galat, onUlang }) {
  if (!galat) return null;
  return (
    <div className="banner danger" role="alert">
      <Ikon n={galat.jaringan ? 'sinyal' : 'awas'} s={22} />
      <div className="stack grow" style={{ '--gap': '8px' }}>
        <span>{galat.message}</span>
        {onUlang && <button className="btn" style={{ alignSelf: 'start' }} onClick={() => onUlang()}>Coba lagi</button>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- toast
const KonteksToast = createContext(() => {});
export function ToastProvider({ children }) {
  const [pesan, setPesan] = useState(null);
  const timer = useRef();
  const toast = useCallback((teks) => {
    setPesan(teks);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setPesan(null), 2800);
  }, []);
  return (
    <KonteksToast.Provider value={toast}>
      {children}
      {pesan && <div className="toast" role="status">{pesan}</div>}
    </KonteksToast.Provider>
  );
}
export const useToast = () => useContext(KonteksToast);

// ---------------------------------------------------------------- elemen kecil
export function Chip({ jenis = '', ikon, children, style }) {
  return <span className={`chip ${jenis}`} style={style}>{ikon && <Ikon n={ikon} s={14} />}{children}</span>;
}

export function ChipStatus({ status, disetujui }) {
  if (disetujui) return <Chip jenis="ok" ikon="cek">Disetujui bos</Chip>;
  const ok = status === 'terverifikasi';
  const rumah = status === 'rumah';
  return <Chip jenis={ok ? 'ok' : rumah ? 'sky' : 'warn'} ikon={ok ? 'cek' : rumah ? 'rumah' : 'awas'}>{NAMA_STATUS[status] || status}</Chip>;
}

export function ChipRisiko({ risiko }) {
  if (risiko === 'tinggi') return <Chip jenis="danger" ikon="awas">Risiko tinggi</Chip>;
  if (risiko === 'sedang') return <Chip jenis="warn" ikon="awas">Risiko sedang</Chip>;
  return <Chip jenis="ok" ikon="cek">Risiko rendah</Chip>;
}

export const Tahap = ({ t }) => <span className={`tahap t${t}`} title={`Tahap ${t}`}>T{t}</span>;

export function Toggle({ nyala, onUbah, label, disabled }) {
  return <button type="button" className="toggle" role="switch" aria-checked={!!nyala} aria-label={label} disabled={disabled} onClick={() => onUbah(!nyala)} />;
}

export function Stepper({ label, nilai, onUbah, min = 0, max = 500, hint }) {
  const ubah = (d) => onUbah(Math.min(max, Math.max(min, (Number(nilai) || 0) + d)));
  return (
    <div className="field">
      <span>{label}{hint && <span className="hint"> {hint}</span>}</span>
      <div className="stepper">
        <button type="button" onClick={() => ubah(-1)} aria-label={`Kurangi ${label}`} disabled={nilai <= min}>−</button>
        <output className="num" aria-live="polite">{nilai}</output>
        <button type="button" onClick={() => ubah(1)} aria-label={`Tambah ${label}`} disabled={nilai >= max}>+</button>
      </div>
    </div>
  );
}

export function Modal({ judul, onTutup, children }) {
  const kotak = useRef(null);
  const tutup = useRef(onTutup);
  tutup.current = onTutup;
  useEffect(() => {
    const sebelum = document.activeElement;
    const pertama = kotak.current?.querySelector('input, select, textarea, button');
    (pertama || kotak.current)?.focus();
    const tekan = (e) => {
      if (e.key === 'Escape') tutup.current();
      if (e.key === 'Tab' && kotak.current) {
        const bisa = [...kotak.current.querySelectorAll('button, input, select, textarea, a[href]')].filter((el) => !el.disabled);
        if (!bisa.length) return;
        const [awal, akhir] = [bisa[0], bisa[bisa.length - 1]];
        if (e.shiftKey && document.activeElement === awal) { e.preventDefault(); akhir.focus(); }
        else if (!e.shiftKey && document.activeElement === akhir) { e.preventDefault(); awal.focus(); }
      }
    };
    document.addEventListener('keydown', tekan);
    return () => { document.removeEventListener('keydown', tekan); sebelum?.focus?.(); };
  }, []);
  return (
    <div className="modal-back" onMouseDown={(e) => e.target === e.currentTarget && onTutup()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={judul} ref={kotak} tabIndex={-1}>
        {judul && <h3 style={{ marginBottom: 10 }}>{judul}</h3>}
        {children}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- depot demo
export function DemoBar({ peran }) {
  const { sesi, lihatSebagai } = useSesi();
  const pergi = useNavigate();
  if (!sesi?.demo) return null;
  const ganti = (p) => { if (p !== peran) { lihatSebagai(p); pergi(p === 'bos' ? '/bos' : '/kurir'); } };
  return (
    <div className="demo-bar no-print">
      <span>DATA CONTOH</span>
      <span className="row" style={{ '--gap': '8px' }}>
        <span className="small" style={{ fontWeight: 500 }}>Lihat sebagai</span>
        <span className="seg" role="group" aria-label="Lihat sebagai">
          <button aria-pressed={peran === 'bos'} onClick={() => ganti('bos')}>Bos</button>
          <button aria-pressed={peran === 'kurir'} onClick={() => ganti('kurir')}>Kurir</button>
        </span>
      </span>
    </div>
  );
}

// ---------------------------------------------------------------- pasang aplikasi (PWA)
let tundaanPasang = null;
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); tundaanPasang = e; window.dispatchEvent(new Event('aquair:bisa-pasang')); });
}

export function usePasang() {
  const [bisa, setBisa] = useState(!!tundaanPasang);
  const terpasang = typeof window !== 'undefined' && window.matchMedia?.('(display-mode: standalone)').matches;
  useEffect(() => {
    const h = () => setBisa(true);
    window.addEventListener('aquair:bisa-pasang', h);
    window.addEventListener('appinstalled', () => setBisa(false));
    return () => window.removeEventListener('aquair:bisa-pasang', h);
  }, []);
  const pasang = async () => {
    if (!tundaanPasang) return false;
    tundaanPasang.prompt();
    await tundaanPasang.userChoice;
    tundaanPasang = null;
    setBisa(false);
    return true;
  };
  return { bisa, terpasang, pasang };
}

export function KartuPasang({ onTutup }) {
  const { bisa, terpasang, pasang } = usePasang();
  const [petunjuk, setPetunjuk] = useState(false);
  if (terpasang) return null;
  return (
    <div className="card" style={{ border: '2px solid var(--brand)' }}>
      <b>Pasang AQUAIR di HP</b>
      <p className="small" style={{ margin: '6px 0 10px' }}>Buka lebih cepat dari layar utama, seperti aplikasi biasa.</p>
      <div className="row">
        <button className="btn btn-primary" onClick={async () => { if (!(await pasang())) setPetunjuk(true); }}><Ikon n="unduh" s={18} />Pasang aplikasi</button>
        {onTutup && <button className="btn btn-ghost" onClick={onTutup}>Nanti</button>}
      </div>
      {(petunjuk || !bisa) && <p className="small muted" style={{ marginTop: 8 }}>Tombol tidak memunculkan apa-apa? Di Chrome, ketuk menu ⋮ lalu "Tambahkan ke layar utama".</p>}
    </div>
  );
}
