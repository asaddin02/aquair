import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { jam, jarakTeks, rp } from '../format';
import Ikon from '../komponen/Ikon';
import { KotakGalat, Modal, useToast } from '../komponen/umum';
import { useKurir } from './KurirApp';

// Kurir langsung tahu harga yang berlaku. Status dan harga ditentukan server.
export default function Hasil() {
  const { state } = useLocation();
  const { beranda } = useKurir();
  const pergi = useNavigate();
  const toast = useToast();
  const [minta, setMinta] = useState(false);
  const [alasan, setAlasan] = useState('');
  const [galat, setGalat] = useState(null);
  const x = state?.penjualan;
  if (!x) return <Navigate to="/kurir" replace />;
  const semua = state.baris?.length ? state.baris : [x];
  const total = semua.reduce((a, y) => a + y.galon_isi * y.harga_berlaku, 0);
  const namaBarang = (y) => (!y.produk_id || y.produk_id === 'utama' ? 'galon' : `${y.satuan} ${y.nama_produk}`);
  const bisaMinta = semua.some((y) => y.harga_toko < y.harga_rumah && y.harga_berlaku !== y.harga_toko);

  const depot = beranda.data?.depot;
  const ok = x.status_verifikasi === 'terverifikasi';
  const rumah = x.jenis === 'rumah';
  const kelas = ok ? 'ok' : rumah ? 'info' : 'warn';
  const radius = depot?.radius_m ?? 75;
  const alasanStatus = {
    terverifikasi: `QR sah · ${jarakTeks(x.jarak_m)} dari titik toko (batas ${radius} m)`,
    lokasi_jauh: `QR sah, tetapi posisimu ${jarakTeks(x.jarak_m)} dari titik toko (batas ${radius} m).`,
    lokasi_lemah: 'Lokasi HP tidak didapat atau akurasinya lebih dari 100 m.',
    tanpa_qr: 'Stiker QR tidak dipindai.',
    rumah: 'Penjualan ke rumah.',
  }[x.status_verifikasi];
  const judul = ok ? 'Terverifikasi — harga toko' : rumah ? 'Tersimpan — harga rumah' : 'Tidak terverifikasi';
  const tetapToko = !ok && !rumah && x.harga_berlaku === x.harga_toko;

  const kirimMinta = async () => {
    setGalat(null);
    try {
      await api(`/kurir/penjualan/${x.id}/minta-harga-toko`, { method: 'POST', body: { alasan } });
      beranda.muatUlang({ diam: true });
      toast('Terkirim ke daftar Persetujuan bos');
      pergi('/kurir');
    } catch (e) {
      setGalat(e);
    }
  };

  return (
    <div className="k-body result-body">
      <div className={`hasil ${kelas}`} role="status">
        <div className="ikon"><Ikon n={ok ? 'cek' : rumah ? 'rumah' : 'awas'} s={30} /></div>
        <div className="judul">{judul}</div>
        {!ok && !rumah && <div style={{ fontWeight: 700, fontSize: 19 }}>{tetapToko ? 'Tetap harga toko (sakelar bos dimatikan)' : `Dihitung harga rumah ${rp(x.harga_rumah)}`}</div>}
        <div className="harga num">{semua.length > 1 ? `${semua.length} produk · total ${rp(total)}` : `${x.galon_isi} ${namaBarang(x)} × ${rp(x.harga_berlaku)} = ${rp(total)}`}</div>
        <p style={{ fontSize: 15 }}>{alasanStatus}</p>
      </div>
      <section className="delivery-receipt"><header><span className="eyebrow">BUKTI PENGANTARAN</span><h2>{x.nama_pelanggan}</h2></header><dl>{semua.map((y) => <div key={y.id}><dt>{!y.produk_id || y.produk_id === 'utama' ? 'Galon isi diserahkan' : y.nama_produk}</dt><dd>{y.galon_isi} {y.satuan || 'galon'} × {rp(y.harga_berlaku)}{y.galon_kosong ? ` · ${y.galon_kosong} kosong` : ''}</dd></div>)}<div><dt>Pembayaran</dt><dd>{x.bayar === 'bon' ? 'Bon' : 'Tunai'}</dd></div><div><dt>Waktu tercatat</dt><dd>{jam(x.created_at)}</dd></div><div className="receipt-total"><dt>Total penjualan</dt><dd>{rp(total)}</dd></div></dl><footer><Ikon n="perisai" s={17} />Tersimpan di depot. Koreksi diajukan melalui bos.</footer></section>
      {!ok && !rumah && bisaMinta && <button className="btn btn-lg btn-block" onClick={() => setMinta(true)}>Minta bos setujui harga toko</button>}
      <button className="btn btn-primary btn-lg btn-block" onClick={() => pergi('/kurir')}>Kembali ke rit</button>
      {minta && (
        <Modal judul="Minta harga toko" onTutup={() => setMinta(false)}>
          <p className="small muted" style={{ marginBottom: 10 }}>Bos akan melihat status, jarak, dan alasanmu, lalu memutuskan.</p>
          <label className="field" htmlFor="alasan-harga"><span>Alasan</span>
            <textarea id="alasan-harga" className="input" rows={3} value={alasan} onChange={(e) => setAlasan(e.target.value)} placeholder='Contoh: "Stiker QR basah, tidak terbaca."' /></label>
          <KotakGalat galat={galat} />
          <div className="row" style={{ justifyContent: 'flex-end', marginTop: 12 }}>
            <button className="btn" onClick={() => setMinta(false)}>Batal</button>
            <button className="btn btn-primary" onClick={kirimMinta} disabled={alasan.trim().length < 3}>Kirim ke bos</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
