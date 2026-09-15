import { useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { pct, rp, tglPanjang, tglPendek } from '../format';
import Ikon from '../komponen/Ikon';
import { ChipRisiko, KotakGalat, Memuat, useData } from '../komponen/umum';
import { Panel, Ringkasan } from '../komponen/Ruang';
import { Avatar, Halaman, warnaKurir } from './umumBos';

const LABEL_KODE = { R1: 'rasio toko', R3: 'stok toko', R6: 'kurang setor', R7: 'selisih stok', R8: 'konfirmasi toko', R2: 'toko tanpa bukti', R9: 'galon kosong kurang' };

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
    <div className="card ai-card">
      <div className="row between">
        <div className="row" style={{ '--gap': '8px' }}><span className="ai-icon"><Ikon n="bintang" s={20} /></span><div><b>Ringkasan AI hari ini</b><p className="small muted">Bantu pahami aktivitas depot Anda.</p></div></div>
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
      {d.rit_belum_ditutup?.length > 0 && (
        <div className="banner danger" role="alert"><Ikon n="awas" s={22} />
          <span className="grow"><b>{d.rit_belum_ditutup.length} rit dari hari sebelumnya belum ditutup.</b> Uang dan barangnya belum dicocokkan: {d.rit_belum_ditutup.map((r) => `${r.kurir.nama} (${tglPendek(r.tanggal)})`).join(', ')}. Minta kurir menekan Selesai rit & setor.</span>
          <Link className="btn" to={`/bos/rit/${d.rit_belum_ditutup[0].id}`}>Buka rit</Link>
        </div>
      )}
      <section className="overview-masthead">
        <div className="overview-intro"><span className="eyebrow">{tglPanjang(hi.tanggal)}</span><h2>Bagaimana depot<br />Anda hari ini?</h2><p>{hi.rit_di_jalan ? `${hi.rit_di_jalan} rit sedang berjalan. Pantau pengantaran dan tindak lanjuti yang perlu diperiksa.` : 'Semua catatan operasional Anda terhubung di sini.'}</p><Link className="btn btn-primary" to="/bos/rit">Pantau rit hari ini<Ikon n="panah" s={18} /></Link></div>
        <div className="overview-finance"><div className="finance-heading"><span><Ikon n="perisai" s={20} />Tagihan kembali</span><small>30 hari</small></div><strong>{rp(d.tagihan_kembali)}</strong><p>Selisih harga yang ditagihkan kembali karena bukti toko belum sesuai.</p><div className="finance-secondary"><span>Perkiraan bocor<strong>{rp(d.perkiraan_bocor)}</strong></span><Link to="/bos/radar" aria-label="Periksa perkiraan bocor di Radar"><Ikon n="panah" s={22} /></Link></div><small>Keduanya berbeda dan tidak dijumlahkan.</small></div>
      </section>
      <Ringkasan items={[
        { label: 'Galon terjual hari ini', nilai: hi.total, ket: `${hi.toko} toko · ${hi.rumah} rumah`, ikon: 'galon' },
        { label: 'Seharusnya disetor', nilai: rp(hi.uang_seharusnya), ket: `Disetor ${rp(hi.uang_disetor)}`, ikon: 'uang' },
        { label: 'Tagihan hari ini', nilai: rp(hi.tagihan_kembali), ket: `Perkiraan bocor ${rp(hi.perkiraan_bocor)}`, ikon: 'perisai' },
        { label: 'Tanda baru', nilai: hi.tanda_baru, ket: `${hi.rit_belum_dicek} muatan belum dicek`, ikon: 'radar', warna: hi.tanda_baru ? 'amber' : '' },
      ]} />
      <div className="dashboard-workspace">
        <div className="dashboard-primary">
          <Panel judul="Pola penjualan toko" ket="Porsi toko per kurir selama 30 hari" aksi={<Link to="/bos/radar" className="btn btn-ghost">Buka Radar<Ikon n="panah" s={16} /></Link>}>
            {kosong ? <p className="muted">Grafik muncul setelah kurir mulai mencatat penjualan.</p> : <GrafikPorsi tren={d.tren} kurir={d.kurir} />}
          </Panel>
          <KartuRingkasanAI />
          <Panel judul="Aktivitas kurir" ket="Bandingkan catatan dan risiko tiap kurir" aksi={<Link to="/bos/kurir" className="btn btn-ghost">Kelola tim</Link>}>
            {kosong ? <Link className="btn btn-primary" to="/bos/kurir"><Ikon n="tambah" />Tambah kurir pertama</Link> : <div className="courier-performance-list">{d.kurir.map((k) => <KartuKurir key={k.kurir.id} k={k} />)}</div>}
          </Panel>
        </div>
        <aside className="dashboard-secondary">
          <Panel judul="Perlu perhatian" ket="Langkah berikutnya untuk depot Anda" className="attention-panel">
            <Link to="/bos/persetujuan" className="attention-item"><span className="attention-icon"><Ikon n="setuju" /></span><div><b>{d.persetujuan_menunggu} pengajuan menunggu</b><p>Periksa harga toko dan koreksi kurir</p></div><Ikon n="kanan" s={16} /></Link>
            <Link to="/bos/rit" className="attention-item"><span className="attention-icon"><Ikon n="rit" /></span><div><b>{hi.rit_belum_dicek} muatan belum dicek</b><p>Cocokkan galon sebelum pengantaran</p></div><Ikon n="kanan" s={16} /></Link>
            {d.pengingat.map((p, i) => <Link key={`${p.komponen}-${i}`} to={p.komponen === 'SLHS' ? '/bos/kepatuhan' : '/bos/perawatan'} className={`attention-item ${p.sisa_hari < 0 ? 'urgent' : ''}`}><span className="attention-icon"><Ikon n={p.komponen === 'SLHS' ? 'perisai' : 'alat'} /></span><div><b>{p.komponen}</b><p>{p.sisa_hari < 0 ? `Terlambat ${-p.sisa_hari} hari` : `${p.sisa_hari} hari lagi`}</p></div><Ikon n="kanan" s={16} /></Link>)}
          </Panel>
          {(hi.produk_lain?.length > 0 || hi.transaksi_depot > 0) && (
            <Panel judul="Produk lain hari ini" ket="Di luar isi ulang galon" aksi={<Link to="/bos/depot" className="btn btn-ghost">Penjualan di depot</Link>}>
              <div className="leak-breakdown">
                {(hi.produk_lain || []).map((p) => <div key={p.nama}><span>{p.nama} · {p.jumlah} {p.satuan} lewat kurir</span><b>{rp(p.uang)}</b></div>)}
                {hi.transaksi_depot > 0 && <div><span>Penjualan di depot · {hi.transaksi_depot} transaksi</span><b>{rp(hi.uang_depot)}</b></div>}
              </div>
            </Panel>
          )}
          <Panel judul="Rincian perkiraan bocor" ket="30 hari terakhir"><div className="leak-breakdown">{rincian.length ? rincian.map(([k, v]) => <div key={k}><span>{LABEL_KODE[k] || k}</span><b>{rp(v)}</b><i style={{ '--porsi': `${d.perkiraan_bocor ? Math.min(100, v / d.perkiraan_bocor * 100) : 0}%` }} /></div>) : <p className="muted">Belum ada perkiraan kebocoran.</p>}</div></Panel>
          <div className="quick-links"><span className="eyebrow">AKSES CEPAT</span><Link to="/bos/pelanggan"><Ikon n="orang" />Pelanggan<Ikon n="kanan" s={16} /></Link><Link to="/bos/qr"><Ikon n="qr" />Cetak stiker QR<Ikon n="kanan" s={16} /></Link><Link to="/bos/unduh"><Ikon n="unduh" />Unduh laporan<Ikon n="kanan" s={16} /></Link></div>
        </aside>
      </div>
    </Halaman>
  );
}
