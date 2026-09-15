import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { hariIniWib, jam, jarakTeks, rp, tglPanjang } from '../format';
import Ikon from '../komponen/Ikon';
import { Chip, ChipStatus, KotakGalat, Memuat, Modal, useData, useToast } from '../komponen/umum';
import { Kosong, Ringkasan } from '../komponen/Ruang';
import { Avatar, GrupRadar, Halaman } from './umumBos';

const WARNA_STATUS = { terverifikasi: '#15803D', rumah: '#0284C7', lokasi_jauh: '#D97706', tanpa_qr: '#D97706', lokasi_lemah: '#D97706' };

function ChipRit({ rit }) {
  if (rit.status === 'aktif') return <Chip jenis="sky">Di jalan</Chip>;
  if (rit.status === 'diterima') return <Chip jenis="ok" ikon="cek">Setoran diterima</Chip>;
  return <Chip jenis="warn">Menunggu setoran diterima</Chip>;
}

export function DaftarRit() {
  const [cari, setCari] = useSearchParams();
  const pergi = useNavigate();
  const tanggal = cari.get('tanggal') || hariIniWib();
  const kurir = cari.get('kurir');
  const { data, galat, memuat, muatUlang } = useData(() => api(`/bos/rit?tanggal=${tanggal}`), [tanggal]);

  useEffect(() => {
    if (!kurir || !data) return;
    const cocok = data.rit.filter((r) => r.kurir.id === kurir);
    if (cocok.length === 1) pergi(`/bos/rit/${cocok[0].id}`, { replace: true });
  }, [data, kurir, pergi]);

  return (
    <Halaman judul="Rit & setoran" kanan={
      <label className="row" htmlFor="tanggal-rit" style={{ '--gap': '8px' }}><span className="small">Tanggal</span>
        <input id="tanggal-rit" type="date" className="input" style={{ minHeight: 40 }} value={tanggal} max={hariIniWib()}
          onChange={(e) => setCari(e.target.value ? { tanggal: e.target.value } : {})} /></label>}>
      <Ringkasan items={[{ label: 'Rit hari ini', nilai: data?.rit.length, ket: tglPanjang(tanggal), ikon: 'rit' }, { label: 'Sedang di jalan', nilai: data?.rit.filter((r) => r.status === 'aktif').length, ikon: 'lokasi' }, { label: 'Menunggu penerimaan', nilai: data?.rit.filter((r) => r.status === 'selesai').length, ikon: 'uang', warna: 'amber' }]} />
      <div className="section-label"><h2>Perjalanan pengantaran</h2><span>Pilih rit untuk memeriksa muatan, penjualan, dan setoran.</span></div>
      <KotakGalat galat={galat} onUlang={muatUlang} />
      {memuat && !data ? <Memuat /> : data?.rit.length === 0 ? <Kosong ikon="rit" judul="Belum ada perjalanan">Rit yang dimulai kurir pada tanggal ini akan tampil di sini.</Kosong> : (
        <div className="trip-list">
          {data?.rit.map((r, i) => <Link key={r.id} to={`/bos/rit/${r.id}`} className="trip-card"><div className="trip-index">{String(i + 1).padStart(2, '0')}</div><div className="trip-driver"><Avatar kurir={r.kurir} /><div><h3>{r.kurir.nama}</h3><span>Berangkat {r.jam_berangkat}</span></div></div><div className="trip-load"><span>Muatan awal</span><b>{r.dibawa} galon</b><small>{r.muatan_dicek ? `Dicek ${r.jam_dicek}` : 'Belum dicek bos'}</small></div><div className="trip-progress"><span>{r.setoran.galon_catatan} galon tercatat</span><div className="meter"><i style={{ width: `${r.dibawa ? Math.min(100, r.setoran.galon_catatan / r.dibawa * 100) : 0}%` }} /></div><ChipRit rit={r} /></div><div className="trip-money"><span>Seharusnya disetor</span><b>{rp(r.setoran.uang_seharusnya)}</b>{r.status !== 'aktif' && <small>Disetor {rp(r.uang_disetor)}</small>}</div><span className="trip-arrow"><Ikon n="panah" /></span></Link>)}
        </div>
      )}
    </Halaman>
  );
}

function PetaRit({ penjualan, titikToko }) {
  const wadah = useRef(null);
  useEffect(() => {
    if (!wadah.current) return undefined;
    const peta = L.map(wadah.current, { scrollWheelZoom: false });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(peta);
    const batas = [];
    titikToko.forEach((t) => {
      L.circleMarker([t.lat, t.lng], { radius: 6, color: '#2563EB', weight: 2, fillColor: '#FFFFFF', fillOpacity: 1 }).bindTooltip(t.nama).addTo(peta);
      batas.push([t.lat, t.lng]);
    });
    const titik = penjualan.filter((x) => x.lat != null);
    if (titik.length > 1) L.polyline(titik.map((x) => [x.lat, x.lng]), { color: '#5F7775', weight: 2, dashArray: '4 4' }).addTo(peta);
    penjualan.forEach((x, i) => {
      if (x.lat == null) return;
      const peringatan = ['R4', 'R5'].includes(x.tanda);
      const ikon = L.divIcon({
        className: '',
        html: `<div style="width:24px;height:24px;border-radius:50%;background:${x.disetujui_bos ? '#15803D' : WARNA_STATUS[x.status_verifikasi]};color:#fff;font:700 11px/24px sans-serif;text-align:center;border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.4)">${i + 1}</div>${peringatan ? '<div style="position:absolute;top:-10px;left:18px;font-size:14px">⚠️</div>' : ''}`,
        iconSize: [24, 24], iconAnchor: [12, 12],
      });
      L.marker([x.lat, x.lng], { icon: ikon }).bindTooltip(`${i + 1}. ${x.nama_pelanggan} — ${x.status_verifikasi}`).addTo(peta);
      batas.push([x.lat, x.lng]);
    });
    if (batas.length) peta.fitBounds(batas, { padding: [24, 24], maxZoom: 16 });
    else peta.setView([-6.2, 106.8], 12);
    return () => peta.remove();
  }, [penjualan, titikToko]);
  return (
    <>
      <div ref={wadah} className="peta-leaflet" role="img" aria-label="Peta titik penjualan rit" />
      <div className="legend"><span><i style={{ background: 'var(--ok)' }} />Terverifikasi</span><span><i style={{ background: 'var(--sky)' }} />Rumah</span>
        <span><i style={{ background: 'var(--warn)' }} />Tidak terverifikasi</span><span><i style={{ background: 'var(--surface)', outline: '2px solid var(--brand)' }} />Titik toko</span><span>⚠️ QR jauh atau lompatan lokasi</span></div>
    </>
  );
}

function BetulkanMuatan({ rit, onTutup, onSimpan }) {
  const [dibawa, setDibawa] = useState(String(rit.dibawa));
  const [alasan, setAlasan] = useState('');
  const [galat, setGalat] = useState(null);
  const simpan = async () => {
    try {
      await api(`/bos/rit/${rit.id}/muatan`, { method: 'POST', body: { dibawa: Number(dibawa), alasan } });
      onSimpan(`Muatan ${rit.kurir.nama}: ${rit.dibawa} → ${dibawa} galon`);
    } catch (e) {
      setGalat(e);
    }
  };
  return (
    <Modal judul={`Betulkan muatan ${rit.kurir.nama}`} onTutup={onTutup}>
      <div className="stack">
        <p className="small muted">Kurir menulis {rit.dibawa} galon.</p>
        <label className="field" htmlFor="muatan-baru"><span>Jumlah hasil hitungan bos</span>
          <div className="input-unit"><input id="muatan-baru" inputMode="numeric" value={dibawa} onChange={(e) => setDibawa(e.target.value.replace(/\D/g, ''))} /><span>galon</span></div></label>
        <label className="field" htmlFor="muatan-alasan"><span>Alasan</span>
          <input id="muatan-alasan" className="input" value={alasan} onChange={(e) => setAlasan(e.target.value)} placeholder="Contoh: dihitung ulang di motor, ada 45 galon" /></label>
        <KotakGalat galat={galat} />
        <div className="row" style={{ justifyContent: 'flex-end' }}><button className="btn" onClick={onTutup}>Batal</button>
          <button className="btn btn-primary" onClick={simpan} disabled={!Number(dibawa) || alasan.trim().length < 3}>Simpan</button></div>
      </div>
    </Modal>
  );
}

export function DetailRit() {
  const { id } = useParams();
  const toast = useToast();
  const [betulkan, setBetulkan] = useState(false);
  const [galatAksi, setGalatAksi] = useState(null);
  const { data, galat, memuat, muatUlang } = useData(() => api(`/bos/rit/${id}`), [id]);
  if (memuat && !data) return <Halaman judul="Detail rit"><Memuat /></Halaman>;
  if (!data) return <Halaman judul="Detail rit"><KotakGalat galat={galat} onUlang={muatUlang} /></Halaman>;
  const { rit, penjualan, tanda, titik_toko: titikToko } = data;
  const st = rit.setoran;

  const aksi = async (jalur, body, pesan) => {
    setGalatAksi(null);
    try {
      await api(jalur, { method: 'POST', body });
      await muatUlang({ diam: true });
      toast(pesan);
    } catch (e) {
      setGalatAksi(e);
    }
  };

  return (
    <Halaman judul={`Rit ${rit.kurir.nama} · ${tglPanjang(rit.tanggal)}`} kanan={<Link className="btn btn-ghost" to={`/bos/rit?tanggal=${rit.tanggal}`}><Ikon n="kiri" s={18} />Semua rit</Link>}>
      <div className="row"><ChipRit rit={rit} /><span className="small muted">Berangkat {rit.jam_berangkat} · muatan {rit.dibawa} galon{rit.muatan_dicek ? ` · dicek ${rit.jam_dicek}` : ''}</span></div>
      <Ringkasan items={[{ label: 'Muatan berangkat', nilai: `${rit.dibawa} galon`, ikon: 'galon' }, { label: 'Penjualan tercatat', nilai: `${st.galon_catatan} galon`, ikon: 'rit' }, { label: 'Seharusnya disetor', nilai: rp(st.uang_seharusnya), ikon: 'uang' }]} />
      <nav className="section-nav no-print" aria-label="Bagian detail rit"><a href="#rit-penjualan">Penjualan</a><a href="#rit-setoran">Setoran</a><a href="#rit-peta">Peta pengantaran</a></nav>
      <KotakGalat galat={galatAksi} />
      {!rit.muatan_dicek && (
        <div className="banner warn" role="status"><Ikon n="awas" s={22} />
          <span className="grow"><b>Muatan belum dicek.</b> {rit.kurir.nama} menulis {rit.dibawa} galon. Hitung galon di motor, lalu pilih:</span>
          <span className="row" style={{ '--gap': '8px' }}>
            <button className="btn btn-primary" onClick={() => aksi(`/bos/rit/${rit.id}/muatan`, {}, 'Muatan dicek dan tercatat di log audit')}>Muatan cocok</button>
            <button className="btn" onClick={() => setBetulkan(true)}>Betulkan jumlah</button>
          </span>
        </div>
      )}
      <section id="rit-penjualan" className="stack">
        <div className="sec-head"><h3>Penjualan</h3><span className="small muted">{penjualan.length} catatan</span></div>
        <div className="table-wrap"><table>
          <thead><tr><th>#</th><th>Jam</th><th>Pelanggan</th><th>Jenis</th><th className="r">Galon</th><th>Status</th><th className="r">Jarak ke titik</th><th className="r">Harga</th><th className="r">Total</th></tr></thead>
          <tbody>{penjualan.map((x, i) => (
            <tr key={x.id}><td className="num">{i + 1}</td><td className="num">{jam(x.urutan_at || x.created_at)}</td><td>{x.nama_pelanggan}</td><td>{x.jenis}</td>
              <td className="r num">{x.galon_isi}</td>
              <td><ChipStatus status={x.status_verifikasi} disetujui={x.disetujui_bos} />{x.dicatat_offline && <> <Chip jenis="line">tanpa sinyal</Chip></>}</td>
              <td className="r num">{x.jenis === 'toko' ? jarakTeks(x.jarak_m) : '—'}</td><td className="r num">{rp(x.harga_berlaku)}</td>
              <td className="r num">{x.bayar === 'bon' ? `bon ${rp(x.galon_isi * x.harga_berlaku)}` : rp(x.galon_isi * x.harga_berlaku)}</td></tr>
          ))}</tbody>
        </table></div>
      </section>
      <section id="rit-setoran" className="card stack"><h3>Setoran</h3>
        {rit.status === 'aktif' ? <p className="muted">Rit masih berjalan. Hitungan setoran muncul setelah kurir menekan Selesai rit. Uang seharusnya sejauh ini {rp(st.uang_seharusnya)}.</p> : (
          <>
            <div className="table-wrap"><table><tbody>
              <tr><td>Terjual menurut stok</td><td className="r num">{rit.dibawa} − {rit.isi_pulang} = <b>{st.galon_stok}</b> galon</td></tr>
              <tr><td>Terjual menurut catatan</td><td className="r num"><b>{st.galon_catatan}</b> galon</td></tr>
              <tr><td>Selisih galon</td><td className={`r num ${st.selisih_galon ? 'danger-t' : ''}`}><b>{st.selisih_galon}</b></td></tr>
              <tr><td>Uang seharusnya (tunai)</td><td className="r num"><b>{rp(st.uang_seharusnya)}</b></td></tr>
              {st.uang_bon > 0 && <tr><td>Penjualan bon</td><td className="r num">{rp(st.uang_bon)}</td></tr>}
              <tr><td>Uang disetor</td><td className="r num"><b>{rp(rit.uang_disetor)}</b></td></tr>
              <tr><td>Selisih uang</td><td className={`r num ${st.selisih_uang < 0 ? 'danger-t' : ''}`}><b>{st.selisih_uang < 0 ? '−' : ''}{rp(Math.abs(st.selisih_uang))}</b></td></tr>
            </tbody></table></div>
            {rit.status === 'selesai' && <div className="row"><button className="btn btn-primary" onClick={() => aksi(`/bos/rit/${rit.id}/terima`, undefined, 'Setoran diterima')}>Setoran diterima</button>
              <span className="small muted">Tekan setelah menghitung ulang uang dan galon.</span></div>}
          </>
        )}
      </section>
      {tanda && <section className="stack"><div className="sec-head"><h3>Tanda Radar hari itu</h3></div><GrupRadar grup={tanda} onBerubah={() => muatUlang({ diam: true })} /></section>}
      <section id="rit-peta" className="card stack"><div className="sec-head"><h3>Peta rit</h3><span className="small muted">Titik penjualan berurutan</span></div>
        <PetaRit penjualan={penjualan} titikToko={titikToko} /></section>
      {betulkan && <BetulkanMuatan rit={rit} onTutup={() => setBetulkan(false)} onSimpan={async (p) => { setBetulkan(false); await muatUlang({ diam: true }); toast(p); }} />}
    </Halaman>
  );
}
