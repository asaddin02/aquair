import { useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { pct, rp, tglPanjang, tglPendek } from '../format';
import Ikon from '../komponen/Ikon';
import { ChipRisiko, KotakGalat, Memuat, useData } from '../komponen/umum';
import { Avatar, Halaman, warnaKurir } from './umumBos';

const LABEL_KODE = { R1: 'rasio toko', R3: 'stok toko', R6: 'kurang setor', R7: 'selisih galon', R8: 'konfirmasi toko', R2: 'toko tanpa bukti' };

function KartuRingkasanAI() {
  const [hasil, setHasil] = useState(null);
  const [kirim, setKirim] = useState(false);
  const buat = async () => {
    setKirim(true);
    try {
      setHasil(await api('/bos/ringkasan-ai', { method: 'POST' }));
    } catch (e) {
      setHasil({ tersedia: false, pesan: e.message });
    } finally {
      setKirim(false);
    }
  };
  return (
    <div className="card">
      <div className="row between">
        <div className="row" style={{ '--gap': '8px' }}><Ikon n="bintang" s={18} /><b>Ringkasan AI hari ini</b></div>
        <button className="btn" onClick={buat} disabled={kirim}>{kirim ? 'Menyusun…' : hasil ? 'Buat ulang' : 'Buat ringkasan'}</button>
      </div>
      {hasil && <p style={{ marginTop: 8, maxWidth: '75ch' }} className={hasil.tersedia ? '' : 'muted small'}>{hasil.teks || hasil.pesan}</p>}
    </div>
  );
}

function GrafikPorsi({ tren, kurir }) {
  const kotak = useRef(null);
  const [sorot, setSorot] = useState(null);
  const W = 720, H = 260, L = 40, Rt = 104, T = 14, B = 30, w = W - L - Rt, h = H - T - B;
  const n = tren.tanggal.length;
  const X = (i) => L + (i / Math.max(1, n - 1)) * w;
  const Y = (v) => T + (1 - v) * h;
  const seri = tren.seri.filter((s) => s.porsi.some((v) => v != null));
  const jalur = (vals) => vals.map((v, i) => (v == null ? null : `${X(i).toFixed(1)} ${Y(v).toFixed(1)}`)).reduce((acc, p, i, arr) => {
    if (p == null) return acc;
    return `${acc}${acc && arr[i - 1] != null ? ' L' : ' M'}${p}`;
  }, '').trim();
  const akhir = seri.map((s) => {
    const idx = s.porsi.map((v, i) => (v != null ? i : -1)).filter((i) => i >= 0).pop();
    return { s, idx, y: Y(s.porsi[idx]) };
  }).sort((a, b) => a.y - b.y);
  for (let i = 1; i < akhir.length; i++) if (akhir[i].y - akhir[i - 1].y < 16) akhir[i].y = akhir[i - 1].y + 16;

  const gerak = (e) => {
    const r = kotak.current.getBoundingClientRect();
    const sx = ((e.clientX - r.left) * W) / r.width;
    setSorot(Math.max(0, Math.min(n - 1, Math.round(((sx - L) / w) * (n - 1)))));
  };
  return (
    <>
      <div className="legend">
        {seri.map((s) => <span key={s.kurir.id}><i style={{ background: warnaKurir(s.kurir) }} />{s.kurir.nama}</span>)}
        <span>- - garis dasar depot</span>
      </div>
      <div className="chart-box" ref={kotak}>
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Grafik porsi toko per kurir, 30 hari" onPointerMove={gerak} onPointerLeave={() => setSorot(null)}>
          {[0, 0.25, 0.5, 0.75, 1].map((v) => (
            <g key={v}><line x1={L} x2={L + w} y1={Y(v)} y2={Y(v)} stroke="var(--line)" strokeWidth="1" />
              <text x={L - 8} y={Y(v) + 4} textAnchor="end" fontSize="11" fill="var(--ink-3)">{v * 100}%</text></g>
          ))}
          {[0, Math.round((n - 1) / 3), Math.round((2 * (n - 1)) / 3), n - 1].map((i) => (
            <text key={i} x={X(i)} y={H - 8} textAnchor={i === n - 1 ? 'end' : i === 0 ? 'start' : 'middle'} fontSize="11" fill="var(--ink-3)">{i === n - 1 ? 'Hari ini' : tglPendek(tren.tanggal[i])}</text>
          ))}
          <path d={tren.garis_dasar.map((v, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)} ${Y(v).toFixed(1)}`).join(' ')} fill="none" stroke="var(--ink-3)" strokeWidth="1.5" strokeDasharray="5 4" />
          {seri.map((s) => <path key={s.kurir.id} d={jalur(s.porsi)} fill="none" stroke={warnaKurir(s.kurir)} strokeWidth="2" strokeLinejoin="round" />)}
          {akhir.map(({ s, idx, y }) => (
            <g key={s.kurir.id}>
              <circle cx={X(idx)} cy={Y(s.porsi[idx])} r="4.5" fill={warnaKurir(s.kurir)} stroke="var(--surface)" strokeWidth="2" />
              <text x={X(n - 1) + 10} y={y + 4} fontSize="12" fontWeight="600" fill="var(--ink)">{s.kurir.nama} {pct(s.porsi[idx])}</text>
            </g>
          ))}
          {sorot != null && <line x1={X(sorot)} x2={X(sorot)} y1={T} y2={T + h} stroke="var(--ink-3)" strokeWidth="1" />}
          <rect x={L} y={T} width={w} height={h} fill="transparent" />
        </svg>
        {sorot != null && (
          <div className="chart-tip" style={{ left: `min(calc(${(X(sorot) / W) * 100}% + 12px), calc(100% - 180px))`, top: 8 }}>
            <b>{sorot === n - 1 ? 'Hari ini' : tglPanjang(tren.tanggal[sorot])}</b>
            {seri.map((s) => <div key={s.kurir.id}><span className="sw" style={{ background: warnaKurir(s.kurir) }} />{s.kurir.nama} <b className="num">{pct(s.porsi[sorot])}</b></div>)}
            <div className="muted">Garis dasar {pct(tren.garis_dasar[sorot])}</div>
          </div>
        )}
      </div>
      <details>
        <summary className="small">Lihat sebagai tabel</summary>
        <div className="table-wrap" style={{ marginTop: 8, maxHeight: 260, overflowY: 'auto' }}>
          <table><thead><tr><th>Tanggal</th>{seri.map((s) => <th key={s.kurir.id} className="r">{s.kurir.nama}</th>)}<th className="r">Garis dasar</th></tr></thead>
            <tbody>{tren.tanggal.map((t, i) => <tr key={t}><td>{tglPendek(t)}</td>{seri.map((s) => <td key={s.kurir.id} className="r num">{pct(s.porsi[i])}</td>)}<td className="r num">{pct(tren.garis_dasar[i])}</td></tr>)}</tbody></table>
        </div>
      </details>
    </>
  );
}

function KartuKurir({ k }) {
  const t = k.tiga_puluh_hari;
  return (
    <div className="card kurir-card">
      <div className="nama"><Avatar kurir={k.kurir} />
        <div className="grow"><b style={{ fontSize: 17 }}>{k.kurir.nama}</b>
          <div className="small muted">Hari ini: {k.hari_ini.total} galon · porsi toko {pct(k.hari_ini.porsi_toko)} · terverifikasi {pct(k.hari_ini.persen_terverifikasi)}</div></div>
        <ChipRisiko risiko={k.hari_ini.risiko} />
      </div>
      <div className="grid-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))' }}>
        <div className="mini"><span className="ket">Porsi toko 30 hari</span><span className="angka">{pct(t.porsi_toko)}</span></div>
        <div className="mini"><span className="ket">Toko terverifikasi</span><span className="angka">{pct(t.persen_terverifikasi)}</span></div>
        <div className="mini"><span className="ket">Tagihan kembali</span><span className="angka">{rp(t.tagihan_kembali)}</span></div>
        <div className="mini"><span className="ket">Perkiraan bocor</span><span className="angka">{rp(t.perkiraan_bocor)}</span></div>
      </div>
      <div className="stack" style={{ '--gap': '6px' }}>
        <div className="row between small"><b>{k.hari_risiko_tinggi} hari berisiko tinggi</b><span className="muted">{k.hari_risiko_sedang} hari sedang</span></div>
        <div className="strip" aria-label="Risiko per hari selama 30 hari">
          {k.strip.map((x, i) => <i key={x.tanggal} className={`${x.risiko} ${i === k.strip.length - 1 ? 'hari-ini' : ''}`} title={`${tglPendek(x.tanggal)}: risiko ${x.risiko}`} />)}
        </div>
        <div className="legend"><span><i style={{ background: 'var(--danger)' }} />Tinggi</span><span><i style={{ background: 'var(--warn)' }} />Sedang</span><span><i style={{ background: 'var(--surface-3)' }} />Rendah</span><span>Kotak bergaris = hari ini</span></div>
      </div>
      <div className="row">
        <Link className="btn" to={`/bos/rit?kurir=${k.kurir.id}`}>Lihat rit</Link>
        <Link className="btn btn-ghost" to={`/bos/radar?kurir=${k.kurir.id}`}>Buka Radar</Link>
      </div>
    </div>
  );
}

export default function Dasbor() {
  const [cari] = useSearchParams();
  const { data, galat, memuat, muatUlang } = useData(() => api('/bos/dasbor'), []);
  if (memuat && !data) return <Halaman judul="Dasbor"><Memuat /></Halaman>;
  if (!data) return <Halaman judul="Dasbor"><KotakGalat galat={galat} onUlang={muatUlang} /></Halaman>;
  const d = data;
  const hi = d.hari_ini;
  const rincian = Object.entries(d.rincian_bocor).sort((a, b) => b[1] - a[1]);
  const pengingat = d.pengingat.map((p) => (p.sisa_hari < 0 ? `${p.komponen} terlambat ${-p.sisa_hari} hari` : p.komponen === 'SLHS' ? `SLHS habis dalam ${p.sisa_hari} hari` : `${p.komponen} ${p.sisa_hari} hari lagi`));
  const kosong = d.kurir.length === 0;

  return (
    <Halaman judul="Dasbor" kanan={<span className="small muted">30 hari terakhir · {tglPendek(d.rentang.dari)} – {tglPendek(d.rentang.sampai)}</span>}>
      {cari.get('baru') && kosong && (
        <div className="card stack" style={{ border: '2px solid var(--brand)' }}>
          <b style={{ fontSize: 17 }}>{d.depot.nama} siap dipakai. Tiga langkah sebelum rit pertama:</b>
          <ol className="langkah">
            <li><b>Tambah kurir</b> beserta nomor HP-nya. PIN dibuat otomatis. <Link to="/bos/kurir">Buka Kurir</Link></li>
            <li><b>Tambah toko</b> dengan titik lokasi, kapasitas simpan, dan laku per hari. <Link to="/bos/pelanggan">Buka Pelanggan</Link></li>
            <li><b>Cetak stiker QR</b> dan tempel di dalam setiap toko. <Link to="/bos/qr">Buka Stiker QR</Link></li>
          </ol>
        </div>
      )}
      <KartuRingkasanAI />
      {d.persetujuan_menunggu > 0 && <div className="banner sky"><Ikon n="setuju" s={22} /><span className="grow">{d.persetujuan_menunggu} pengajuan kurir menunggu keputusanmu.</span><Link className="btn" to="/bos/persetujuan">Periksa</Link></div>}
      {pengingat.length > 0 && <div className="banner warn"><Ikon n="alat" s={22} /><span className="grow"><b>Perawatan dan izin:</b> {pengingat.join(' · ')}</span><Link className="btn" to="/bos/perawatan">Lihat</Link></div>}
      <div className="grid-2">
        <div className="hero-tile utama"><div className="eyebrow">Tagihan kembali · 30 hari</div><div className="angka">{rp(d.tagihan_kembali)}</div>
          <p>Uang yang diamankan aturan "toko tanpa bukti dihitung harga rumah". Tanpa AQUAIR, uang ini hilang tanpa terlihat.</p></div>
        <div className="hero-tile"><div className="eyebrow">Perkiraan bocor · 30 hari</div><div className="angka" style={{ color: 'var(--danger-text)' }}>{rp(d.perkiraan_bocor)}</div>
          <p>Uang yang mungkin masih hilang walau aturan harga sudah berjalan. Dua angka ini tidak dijumlahkan.</p>
          {rincian.length > 0 && <div className="rinci muted">{rincian.map(([k, v]) => <span key={k}>{LABEL_KODE[k] || k} <b className="num">{rp(v)}</b></span>)}</div>}</div>
      </div>
      <section className="stack">
        <div className="sec-head"><h3>Hari ini · {tglPanjang(hi.tanggal)}</h3><Link className="btn btn-ghost" to="/bos/rit">Lihat rit</Link></div>
        <div className="grid-4">
          <div className="card mini"><span className="ket">Galon terjual</span><span className="angka">{hi.total}</span><span className="ket">{hi.toko} toko · {hi.rumah} rumah</span></div>
          <div className="card mini"><span className="ket">Uang seharusnya</span><span className="angka">{rp(hi.uang_seharusnya)}</span><span className="ket">disetor {rp(hi.uang_disetor)}{hi.rit_di_jalan ? ` · ${hi.rit_di_jalan} rit masih di jalan` : ''}</span></div>
          <div className="card mini"><span className="ket">Tagihan kembali hari ini</span><span className="angka">{rp(hi.tagihan_kembali)}</span><span className="ket">bocor {rp(hi.perkiraan_bocor)}</span></div>
          <div className="card mini"><span className="ket">Tanda baru</span><span className="angka">{hi.tanda_baru}</span><span className="ket">{hi.rit_belum_dicek} rit muatan belum dicek</span></div>
        </div>
      </section>
      {!kosong && (
        <>
          <section className="stack"><div className="sec-head"><h3>Kurir</h3><span className="small muted">30 hari terakhir</span></div>
            <div className="grid-2">{d.kurir.map((k) => <KartuKurir key={k.kurir.id} k={k} />)}</div></section>
          <section className="card stack"><div className="sec-head"><h3>Porsi toko per kurir · 30 hari</h3>{d.depot.is_demo && <span className="small muted">Simulasi data contoh</span>}</div>
            <GrafikPorsi tren={d.tren} kurir={d.kurir} /></section>
        </>
      )}
    </Halaman>
  );
}
