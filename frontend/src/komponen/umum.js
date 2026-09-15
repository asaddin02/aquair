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
  const [ketikan, setKetikan] = useState(String(nilai));
  useEffect(() => { setKetikan(String(nilai)); }, [nilai]);
  const tetapkan = () => {
    const angka = Number(ketikan);
    const hasil = ketikan.trim() === '' || !Number.isFinite(angka) ? nilai : Math.min(max, Math.max(min, Math.trunc(angka)));
    setKetikan(String(hasil));
    onUbah(hasil);
  };
  const ubah = (d) => onUbah(Math.min(max, Math.max(min, (Number(nilai) || 0) + d)));
  return (
    <div className="field">
      <span>{label}{hint && <span className="hint"> {hint}</span>}</span>
      <div className="stepper">
        <button type="button" onClick={() => ubah(-1)} aria-label={`Kurangi ${label}`} disabled={nilai <= min}>−</button>
        <input className="num quantity-input" type="text" inputMode="numeric" aria-label={label} value={ketikan}
          onFocus={(e) => e.target.select()} onChange={(e) => setKetikan(e.target.value.replace(/\D/g, ''))}
          onBlur={tetapkan} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); } }} />
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
    const overflowSebelum = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
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
    return () => { document.removeEventListener('keydown', tekan); document.body.style.overflow = overflowSebelum; sebelum?.focus?.(); };
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
      <span className="demo-label"><span className="status-dot" />MODE DEMO<span className="demo-explanation"> · Data contoh, bebas dijelajahi</span></span>
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
let sedangMemasang = false;
let pemasanganSelesai = false;
const kabariPemasangan = () => window.dispatchEvent(new Event('aquair:status-pasang'));
const statusPemasangan = () => ({
  bisa: !!tundaanPasang,
  memasang: sedangMemasang,
  terpasang: pemasanganSelesai || !!window.matchMedia?.('(display-mode: standalone)').matches || !!navigator.standalone,
});
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    tundaanPasang = e;
    kabariPemasangan();
  });
  window.addEventListener('appinstalled', () => {
    pemasanganSelesai = true;
    tundaanPasang = null;
    kabariPemasangan();
  });
}

export function usePasang() {
  const [status, setStatus] = useState(statusPemasangan);
  useEffect(() => {
    const ubah = () => setStatus(statusPemasangan());
    const layar = window.matchMedia?.('(display-mode: standalone)');
    window.addEventListener('aquair:status-pasang', ubah);
    layar?.addEventListener('change', ubah);
    ubah();
    return () => {
      window.removeEventListener('aquair:status-pasang', ubah);
      layar?.removeEventListener('change', ubah);
    };
  }, []);
  const pasang = async () => {
    if (sedangMemasang) return 'menunggu';
    if (!tundaanPasang || !window.isSecureContext) return 'petunjuk';
    const acara = tundaanPasang;
    tundaanPasang = null;
    sedangMemasang = true;
    kabariPemasangan();
    try {
      await acara.prompt();
      const pilihan = await acara.userChoice;
      return pilihan.outcome === 'accepted' ? 'diterima' : 'ditutup';
    } catch {
      return 'petunjuk';
    } finally {
      sedangMemasang = false;
      kabariPemasangan();
    }
  };
  return { ...status, pasang };
}

function PetunjukPasang() {
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (!window.isSecureContext) return <div className="stack">
    <div className="banner sky"><Ikon n="ponsel" s={22} /><p>Pemasangan aplikasi belum tersedia di alamat lokal ini.</p></div>
    <p>Buka AQUAIR melalui alamat <b>HTTPS</b> untuk memasang aplikasi di HP. Alamat yang sedang dibuka masih memakai HTTP.</p>
    <p>Anda tetap bisa memakai AQUAIR di browser. Jika menu browser menawarkan <b>Tambahkan ke layar utama</b>, pintasan tersebut membuka halaman ini di browser.</p>
  </div>;
  return <div className="stack">
    <p>Pasang AQUAIR agar bisa dibuka langsung dari layar utama.</p>
    {ios ? <ol><li>Buka AQUAIR di <b>Safari</b>.</li><li>Ketuk <b>Bagikan</b>, lalu <b>Tambah ke Layar Utama</b>.</li><li>Aktifkan <b>Buka sebagai App</b> jika tersedia, lalu ketuk <b>Tambah</b>.</li></ol> : <ol><li>Buka menu <b>⋮</b> di Chrome.</li><li>Pilih <b>Tambahkan ke layar utama</b> atau <b>Instal aplikasi</b>.</li><li>Pilih <b>Instal</b> untuk memasang AQUAIR.</li></ol>}
    <p className="small muted">Pilihan pemasangan mengikuti dukungan browser. Jika belum muncul, gunakan browser biasa (bukan Incognito), muat ulang, atau periksa apakah AQUAIR sudah terpasang.</p>
  </div>;
}

export function TombolPasang({ className = 'btn btn-primary', ringkas = false }) {
  const { terpasang, memasang, pasang } = usePasang();
  const [petunjuk, setPetunjuk] = useState(false);
  if (terpasang) return null;
  return <>
    <button type="button" className={className} aria-label="Pasang aplikasi" disabled={memasang} onClick={async () => { if (await pasang() === 'petunjuk') setPetunjuk(true); }}>
      <Ikon n="unduh" s={18} /><span className={ringkas ? 'install-label' : undefined}>{memasang ? 'Membuka…' : ringkas ? 'Pasang' : 'Pasang aplikasi'}</span>
    </button>
    {petunjuk && <Modal judul="Pasang AQUAIR" onTutup={() => setPetunjuk(false)}><PetunjukPasang /><button className="btn btn-primary btn-block" style={{ marginTop: 20 }} onClick={() => setPetunjuk(false)}>Mengerti</button></Modal>}
  </>;
}

export function KartuPasang({ onTutup }) {
  const { terpasang } = usePasang();
  if (terpasang) return null;
  return (
    <div className="card install-card">
      <span className="install-icon"><Ikon n="ponsel" s={23} /></span><b>AQUAIR di layar utama</b>
      <p className="small" style={{ margin: '6px 0 10px' }}>{window.isSecureContext ? 'Buka lebih cepat dari layar utama, seperti aplikasi biasa.' : 'Pemasangan di HP tersedia melalui alamat HTTPS. Saat ini AQUAIR bisa dipakai di browser.'}</p>
      <div className="row"><TombolPasang />{onTutup && <button className="btn btn-ghost" onClick={onTutup}>Nanti</button>}</div>
    </div>
  );
}
