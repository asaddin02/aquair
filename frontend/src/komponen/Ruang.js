import Ikon from './Ikon';

export function Ringkasan({ items }) {
  return <div className="ringkasan-grid">{items.map(({ label, nilai, ket, ikon = 'dasbor', warna = '' }) => <div className={`ringkasan-item ${warna}`} key={label}><span className="ringkasan-icon"><Ikon n={ikon} s={22} /></span><div><span className="ringkasan-label">{label}</span><strong className="num">{nilai ?? '—'}</strong>{ket && <small>{ket}</small>}</div></div>)}</div>;
}

export function Cari({ value, onChange, placeholder = 'Cari…', label = placeholder }) {
  return <label className="pencarian"><Ikon n="cari" s={20} /><input type="search" aria-label={label} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} /></label>;
}

export function TabPilihan({ label, nilai, onUbah, pilihan }) {
  return <div className="pilihan-tab" role="group" aria-label={label}>{pilihan.map(([id, nama, jumlah]) => <button key={id} type="button" aria-pressed={nilai === id} onClick={() => onUbah(id)}>{nama}{jumlah != null && <span>{jumlah}</span>}</button>)}</div>;
}

export function Kosong({ ikon = 'cari', judul = 'Belum ada data', children, aksi }) {
  return <div className="keadaan-kosong"><span><Ikon n={ikon} s={30} /></span><h3>{judul}</h3>{children && <p>{children}</p>}{aksi}</div>;
}

export function Panel({ judul, ket, aksi, children, className = '', id }) {
  return <section id={id} className={`panel ${className}`}><header className="panel-head"><div><h2>{judul}</h2>{ket && <p>{ket}</p>}</div>{aksi}</header><div className="panel-body">{children}</div></section>;
}

export function Catatan({ ikon = 'perisai', judul, children }) {
  return <aside className="catatan-panel"><span className="catatan-ikon"><Ikon n={ikon} s={25} /></span><h3>{judul}</h3><p>{children}</p></aside>;
}

export function LangkahForm({ nomor, judul, ket, children, className = '' }) {
  return <section className={`langkah-form ${className}`}><header><span>{nomor}</span><div><h3>{judul}</h3>{ket && <p>{ket}</p>}</div></header><div className="langkah-isi">{children}</div></section>;
}
