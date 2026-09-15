import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Ikon, { Logo } from '../komponen/Ikon';
import { KotakGalat, Modal, usePasang } from '../komponen/umum';
import { useSesi } from '../Sesi';

export function useCobaDemo() {
  const { mulaiDemo } = useSesi();
  const pergi = useNavigate();
  const [menyiapkan, setMenyiapkan] = useState(false);
  const [galat, setGalat] = useState(null);
  const coba = async (peran) => {
    setGalat(null);
    setMenyiapkan(true);
    try {
      await mulaiDemo(peran);
      pergi(peran === 'bos' ? '/bos' : '/kurir');
    } catch (e) {
      setGalat(e);
    } finally {
      setMenyiapkan(false);
    }
  };
  const tampilan = (
    <>
      {menyiapkan && (
        <Modal judul="Menyiapkan depot contoh" onTutup={() => {}}>
          <div className="stack" style={{ alignItems: 'center', textAlign: 'center', '--gap': '10px', padding: '8px 0' }}>
            <div className="putar" aria-hidden="true" />
            <b>Menyiapkan depot contoh…</b>
            <p className="small muted">Depot Tirta Sejahtera · 2 kurir · 20 toko · 60 rumah · riwayat 30 hari yang berakhir hari ini</p>
          </div>
        </Modal>
      )}
      <KotakGalat galat={galat} />
    </>
  );
  return { coba, menyiapkan, tampilan };
}

function BukuKurir() {
  return (
    <figure className="ledger" style={{ margin: 0 }}>
      <figcaption className="eyebrow">Contoh hitungan · satu rit, 40 galon</figcaption>
      <div className="ledger-paper" role="img" aria-label="Catatan tulisan tangan kurir: toko 36 kali 3.000, rumah 4 kali 4.000, setor 124.000">
        Rit Senin — Rudi<br />Toko 36 × 3.000 = 108.000<br />Rumah 4 × 4.000 = 16.000<br /><u>Setor 124.000</u>
      </div>
      <div className="card hitung">
        <span className="small muted" style={{ gridColumn: '1 / -1' }}>AQUAIR menghitung dari bukti:</span>
        <span>15 toko terverifikasi × Rp3.000</span><span className="num">Rp45.000</span>
        <span>21 toko tanpa bukti × Rp4.000</span><span className="num">Rp84.000</span>
        <span>4 rumah × Rp4.000</span><span className="num">Rp16.000</span>
        <span className="total">Seharusnya disetor</span><span className="total num">Rp145.000</span>
      </div>
      <div className="row between">
        <span className="chip danger"><Ikon n="awas" s={14} />Kurang setor Rp21.000</span>
        <span className="small muted">Ilustrasi, bukan data depot sungguhan</span>
      </div>
    </figure>
  );
}

export default function Landing() {
  const { coba, menyiapkan, tampilan } = useCobaDemo();
  const { bisa, terpasang, pasang } = usePasang();
  return (
    <div className="site penuh">
      <nav className="site-nav" aria-label="Situs">
        <span className="logo"><Logo s={28} />AQUAIR</span>
        <span className="row" style={{ '--gap': '6px' }}>
          {bisa && !terpasang && <button className="btn btn-ghost" onClick={pasang}><Ikon n="unduh" s={18} />Pasang</button>}
          <Link className="btn btn-ghost" to="/masuk">Masuk</Link>
          <Link className="btn" to="/daftar">Daftarkan depot</Link>
        </span>
      </nav>
      <section className="hero">
        <div>
          <div className="eyebrow">Untuk Depot Air Minum Isi Ulang</div>
          <h1 style={{ marginTop: 10 }}>Kurir jujur, <em>setoran utuh.</em></h1>
          <p className="lead">Kurir yang mencatat pembeli rumah sebagai toko mengantongi Rp1.000 per galon, dan catatan "36 toko, 4 rumah" tetap tampak wajar setiap hari. AQUAIR hanya memberi harga toko kalau ada bukti dari toko itu.</p>
          <div className="cta">
            <button className="btn btn-primary btn-lg" onClick={() => coba('bos')} disabled={menyiapkan}><Ikon n="dasbor" />Coba sebagai Bos</button>
            <button className="btn btn-lg" style={{ border: '2px solid var(--sky)' }} onClick={() => coba('kurir')} disabled={menyiapkan}><Ikon n="rit" />Coba sebagai Kurir</button>
            <Link className="btn btn-ghost btn-lg" to="/daftar">Daftarkan depot saya</Link>
          </div>
          <p className="small muted" style={{ marginTop: 12 }}>Tanpa daftar. Setiap pengunjung mendapat depot contoh sendiri, terhapus otomatis setelah 24 jam.</p>
          <div style={{ marginTop: 12 }}>{tampilan}</div>
        </div>
        <BukuKurir />
      </section>
      <section className="band">
        <div className="eyebrow">Kuncinya</div>
        <h2>Bukti hanya diminta untuk harga yang lebih murah.</h2>
        <p>Kurir tidak pernah untung menulis penjualan toko sebagai rumah. Jadi penjualan rumah dicatat tanpa hambatan, dan hanya harga toko yang perlu dibuktikan. Tidak ada yang dituduh: klaim toko tanpa bukti otomatis dihitung harga rumah.</p>
        <div className="grid-2">
          <div className="tarif rumah"><span className="chip sky"><Ikon n="rumah" s={14} />Rumah</span><div className="angka">Rp4.000 <small>per galon</small></div>
            <p>Pilih pembeli, isi jumlah galon, simpan. Tanpa bukti apa pun.</p></div>
          <div className="tarif toko"><span className="chip brand"><Ikon n="qr" s={14} />Toko</span><div className="angka">Rp3.000 <small>per galon</small></div>
            <p>Wajib scan stiker QR di dalam toko, dengan HP kurir paling jauh 75 m dari titik toko. Tanpa bukti, dihitung Rp4.000.</p></div>
        </div>
      </section>
      <section className="band">
        <h2>Cara kerjanya di setiap titik antar</h2>
        <div className="steps">
          <div className="card"><Ikon n="qr" s={28} /><h3>Scan QR toko</h3><p>Stiker ditempel di dalam toko, bukan di luar. Isinya token acak yang bisa diganti bos kapan saja.</p></div>
          <div className="card"><Ikon n="lokasi" s={28} /><h3>Lokasi dicocokkan</h3><p>Server membandingkan lokasi HP dengan titik toko. QR yang difoto lalu dipindai di tempat lain langsung ketahuan.</p></div>
          <div className="card"><Ikon n="radar" s={28} /><h3>Radar Kecurangan</h3><p>Bos melihat kejanggalan per kurir per hari: porsi toko terlalu tinggi, stok toko tidak masuk akal, setoran kurang. Lengkap dengan perkiraan Rupiah.</p></div>
        </div>
      </section>
      <section className="band">
        <h2>Masalah depot lain ikut terjaga</h2>
        <div className="steps">
          <div className="card"><Ikon n="galon" s={24} /><h3>Galon pinjaman</h3><p>Saldo galon di setiap pelanggan, dan siapa yang tidak mengembalikan galon kosong lebih dari 14 hari.</p></div>
          <div className="card"><Ikon n="wa" s={24} /><h3>Konfirmasi pemilik toko</h3><p>Pemilik toko menjawab jumlah galon mingguan lewat tautan WhatsApp, tanpa akun.</p></div>
          <div className="card"><Ikon n="alat" s={24} /><h3>Mesin dan uji air</h3><p>Pengingat ganti filter, lampu UV, dan membran RO, plus jadwal uji lab dan masa berlaku SLHS.</p></div>
        </div>
      </section>
      <footer className="site-foot">AQUAIR · aplikasi web untuk Depot Air Minum Isi Ulang. Bisa dipasang dari Chrome ke layar utama HP.</footer>
    </div>
  );
}
