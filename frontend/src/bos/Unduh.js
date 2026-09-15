import { useState } from 'react';
import { api } from '../api';
import { geserTanggal, hariIniWib, jam, tglPendek } from '../format';
import Ikon from '../komponen/Ikon';
import { KotakGalat, Memuat, useData, useToast } from '../komponen/umum';
import { Halaman } from './umumBos';

const JENIS = [['penjualan', 'Penjualan'], ['rit', 'Rit & setoran'], ['tanda', 'Tanda Radar'], ['audit', 'Log audit']];

export default function Unduh() {
  const toast = useToast();
  const hariIni = hariIniWib();
  const [jenis, setJenis] = useState('penjualan');
  const [dari, setDari] = useState(geserTanggal(hariIni, -29));
  const [sampai, setSampai] = useState(hariIni);
  const [kirim, setKirim] = useState(false);
  const [galat, setGalat] = useState(null);
  const log = useData(() => api('/bos/audit?batas=30'), []);

  const unduh = async () => {
    setKirim(true);
    setGalat(null);
    try {
      const r = await api(`/bos/unduh?jenis=${jenis}&dari=${dari}&sampai=${sampai}`, { mentah: true });
      const nama = /filename="([^"]+)"/.exec(r.headers.get('Content-Disposition') || '')?.[1] || `aquair-${jenis}.csv`;
      const berkas = await r.blob();
      const url = URL.createObjectURL(berkas);
      const a = document.createElement('a');
      a.href = url;
      a.download = nama;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      toast(`${nama} terunduh · ${r.headers.get('X-Jumlah-Baris') || 0} baris`);
      log.muatUlang({ diam: true });
    } catch (e) {
      setGalat(e);
    } finally {
      setKirim(false);
    }
  };

  return (
    <Halaman judul="Unduh data">
      <p className="muted small" style={{ maxWidth: '70ch' }}>Simpan salinan data depot di luar aplikasi, atau olah di Excel dan Google Sheets. Isinya hanya data depot ini, dan setiap unduhan tercatat di log audit.</p>
      <section className="card stack" style={{ '--gap': '14px' }}>
        <div className="field"><span>Jenis data</span>
          <div><span className="seg" role="group" aria-label="Jenis data">{JENIS.map(([v, l]) => <button key={v} aria-pressed={jenis === v} onClick={() => setJenis(v)}>{l}</button>)}</span></div></div>
        <div className="form-grid" style={{ maxWidth: 460 }}>
          <label className="field" htmlFor="unduh-dari"><span>Dari</span><input id="unduh-dari" type="date" className="input" value={dari} max={sampai} onChange={(e) => setDari(e.target.value)} /></label>
          <label className="field" htmlFor="unduh-sampai"><span>Sampai</span><input id="unduh-sampai" type="date" className="input" value={sampai} min={dari} max={hariIni} onChange={(e) => setSampai(e.target.value)} /></label>
        </div>
        <KotakGalat galat={galat} />
        <div className="row"><button className="btn btn-primary" onClick={unduh} disabled={kirim || !dari || !sampai}><Ikon n="unduh" s={18} />{kirim ? 'Menyiapkan…' : 'Unduh CSV'}</button>
          <span className="small muted">Pemisah titik koma dan UTF-8, jadi kolomnya langsung terpisah di Excel berbahasa Indonesia.</span></div>
      </section>
      <section className="stack">
        <div className="sec-head"><h3>Log audit terbaru</h3><span className="small muted">30 catatan terakhir</span></div>
        {log.memuat && !log.data ? <Memuat /> : (
          <div className="table-wrap"><table>
            <thead><tr><th>Waktu</th><th>Pengguna</th><th>Aksi</th><th>Sebelum → sesudah</th><th>Alasan</th></tr></thead>
            <tbody>{(log.data || []).map((a) => (
              <tr key={a.id}><td className="num" style={{ whiteSpace: 'nowrap' }}>{tglPendek(a.tanggal)} {jam(a.created_at)}</td><td>{a.nama_pengguna}</td><td>{a.aksi}</td>
                <td className="small">{[a.sebelum, a.sesudah].filter((x) => x != null && x !== '').map((x) => (typeof x === 'object' ? JSON.stringify(x) : String(x))).join(' → ')}</td>
                <td className="small">{a.alasan}</td></tr>
            ))}</tbody>
          </table></div>
        )}
      </section>
    </Halaman>
  );
}
