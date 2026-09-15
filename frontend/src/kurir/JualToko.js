import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api';
import { rp } from '../format';
import Ikon from '../komponen/Ikon';
import { KotakGalat, Memuat, useData } from '../komponen/umum';
import { Cari, Kosong } from '../komponen/Ruang';
import FormPenjualan from './FormPenjualan';
import { KTop, useKurir } from './KurirApp';

// Lokasi HP untuk penjualan toko di depot sungguhan: akurasi tinggi, batas tunggu 10 detik (spesifikasi 3.2).
function useLokasi(aktif) {
  const [lokasi, setLokasi] = useState({ status: 'diam' });
  const ambil = useCallback(() => {
    if (!navigator.geolocation) return setLokasi({ status: 'gagal', pesan: 'HP ini tidak bisa mengambil lokasi.' });
    setLokasi({ status: 'mencari' });
    navigator.geolocation.getCurrentPosition(
      (p) => setLokasi({ status: 'ada', lat: p.coords.latitude, lng: p.coords.longitude, akurasi: Math.round(p.coords.accuracy) }),
      (e) => setLokasi({ status: 'gagal', pesan: e.code === 1 ? 'Izin lokasi ditolak. Izinkan lokasi di pengaturan browser.' : 'Lokasi belum didapat. Coba di tempat terbuka.' }),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  }, []);
  useEffect(() => { if (aktif) ambil(); }, [aktif, ambil]);
  return { lokasi, ambil };
}

function PemindaiQR({ onHasil }) {
  const [galat, setGalat] = useState(null);
  const selesai = useRef(false);
  useEffect(() => {
    let pemindai;
    let hidup = true;
    import('html5-qrcode').then(({ Html5Qrcode }) => {
      if (!hidup) return;
      pemindai = new Html5Qrcode('pemindai-qr');
      pemindai.start({ facingMode: 'environment' }, { fps: 10, qrbox: { width: 230, height: 230 } }, (teks) => {
        if (selesai.current) return;
        selesai.current = true;
        pemindai.stop().catch(() => {}).finally(() => onHasil(teks));
      }, () => {}).catch(() => setGalat('Kamera tidak bisa dibuka. Izinkan kamera di pengaturan browser, atau pilih "Toko tanpa QR".'));
    });
    return () => {
      hidup = false;
      try { if (pemindai && !selesai.current) pemindai.stop().catch(() => {}); } catch { /* pemindai belum berjalan */ }
    };
  }, [onHasil]);
  return (
    <>
      <div id="pemindai-qr" className="scan-kamera" />
      {galat ? <div className="banner warn" role="alert"><Ikon n="kamera" s={22} /><span>{galat}</span></div>
        : <p className="small muted">Arahkan kamera ke stiker QR yang ditempel di dalam toko.</p>}
    </>
  );
}

export default function JualToko() {
  const { beranda } = useKurir();
  const depot = beranda.data?.depot;
  const demo = depot?.is_demo;
  const [cari, setCari] = useState('');
  const [langkah, setLangkah] = useState('pindai');
  const [toko, setToko] = useState(null);
  const [posisi, setPosisi] = useState(null);
  const [galat, setGalat] = useState(null);
  const pakaiLokasi = !demo && langkah === 'form' && toko && !toko.tanpaQr;
  const { lokasi, ambil } = useLokasi(pakaiLokasi);

  const simulasi = useData(() => (demo ? api('/kurir/demo/toko-simulasi') : Promise.resolve([])), [demo]);
  const semuaToko = useData(() => (langkah === 'tanpa' ? api('/kurir/pelanggan/toko') : Promise.resolve([])), [langkah]);

  const hasilScan = useCallback(async (teks) => {
    const token = teks.startsWith('aquair:') ? teks.slice(7) : teks;
    try {
      const t = await api('/kurir/qr/cek', { method: 'POST', body: { qr_token: token } });
      setToko({ ...t, qr_token: token });
      setLangkah('form');
    } catch (e) {
      setGalat(e);
      setLangkah('pindai-ulang');
    }
  }, []);

  if (!depot) return <Memuat />;
  if (beranda.data.rit?.status !== 'aktif') return <><KTop judul="Jual ke toko" /><div className="k-body"><p>Tidak ada rit aktif. Mulai rit dulu.</p></div></>;

  if (langkah === 'pindai' || langkah === 'pindai-ulang') {
    return (
      <>
        <KTop judul={demo ? 'Simulasi scan QR toko' : 'Scan QR toko'} />
        <div className="k-body">
<div className="mobile-intro"><span className="eyebrow">LANGKAH 1 · VERIFIKASI TOKO</span><h2>Scan. Cocokkan. Antar.</h2><p>QR dan lokasi memastikan harga toko yang tepat.</p></div>
          <KotakGalat galat={galat} />
          {demo ? (
            <>
              <div className="scan-view" aria-hidden="true"><div className="frame" /><p>Di depot sungguhan, kamera terbuka di sini</p></div>
              <p className="small muted">Depot contoh tidak memakai kamera. Pilih toko untuk menyimulasikan hasil scan.</p>
              <Cari value={cari} onChange={setCari} placeholder="Cari toko untuk simulasi…" />
              <KotakGalat galat={simulasi.galat} onUlang={simulasi.muatUlang} />
              {simulasi.memuat ? <Memuat /> : (simulasi.data || []).filter((t) => t.nama.toLowerCase().includes(cari.toLowerCase())).map((t) => (
                <button key={t.id} className="list-btn customer-pick" onClick={() => { setToko(t); setLangkah('posisi'); }}>
                  <Ikon n="qr" s={24} /><span className="grow"><b>{t.nama}</b><br /><span className="small muted">Stiker QR terpasang</span></span>
                </button>
              ))}
            </>
          ) : langkah === 'pindai' ? <PemindaiQR onHasil={hasilScan} /> : <button className="btn btn-lg btn-block" onClick={() => { setGalat(null); setLangkah('pindai'); }}><Ikon n="kamera" />Scan ulang</button>}
          {demo && !simulasi.memuat && !(simulasi.data || []).some((t) => t.nama.toLowerCase().includes(cari.toLowerCase())) && <Kosong judul="Toko tidak ditemukan">Coba kata kunci lain.</Kosong>}
          <button className="btn btn-block" onClick={() => { setGalat(null); setCari(''); setLangkah('tanpa'); }}><Ikon n="awas" s={18} />Toko tanpa QR (stiker rusak/hilang)</button>
        </div>
      </>
    );
  }

  if (langkah === 'tanpa') {
    return (
      <>
        <KTop judul="Toko tanpa QR" />
        <div className="k-body">
          <div className="banner warn"><Ikon n="awas" s={22} /><span>Tanpa scan QR, penjualan <b>dihitung harga rumah {rp(depot.harga_rumah)}</b>. Kalau stikernya rusak, minta bos menyetujui harga toko.</span></div>
          <KotakGalat galat={semuaToko.galat} onUlang={semuaToko.muatUlang} />
          <Cari value={cari} onChange={setCari} placeholder="Cari nama toko…" />
          {semuaToko.memuat ? <Memuat /> : (semuaToko.data || []).filter((t) => t.nama.toLowerCase().includes(cari.toLowerCase())).map((t) => (
            <button key={t.id} className="list-btn customer-pick" onClick={() => { setToko({ ...t, tanpaQr: true }); setLangkah('form'); }}>
              <Ikon n="awas" s={24} /><span className="grow"><b>{t.nama}</b></span>
            </button>
          ))}
        </div>
      </>
    );
  }

  if (langkah === 'posisi') {
    return (
      <>
        <KTop judul="Posisi kamu" />
        <div className="k-body">
          <div className="card flat"><span className="chip ok"><Ikon n="qr" s={14} />QR sah</span><h3 style={{ marginTop: 8 }}>{toko.nama}</h3></div>
          <p>Di depot sungguhan, lokasi HP diambil otomatis. Di depot contoh, pilih posisi:</p>
          <button className="choice" onClick={() => { setPosisi('dekat'); setLangkah('form'); }}><Ikon n="lokasi" s={26} /><b>Di lokasi toko</b><small>±10 m dari titik toko, akurasi 15 m</small></button>
          <button className="choice" onClick={() => { setPosisi('jauh'); setLangkah('form'); }}><Ikon n="awas" s={26} /><b>1,2 km dari toko</b><small>Seperti QR yang difoto lalu dipindai di tempat lain</small></button>
        </div>
      </>
    );
  }

  const bodyDasar = () => toko.tanpaQr
    ? { jenis: 'toko', tanpa_qr_customer_id: toko.id }
    : demo ? { jenis: 'toko', qr_token: toko.qr_token, posisi_simulasi: posisi }
      : { jenis: 'toko', qr_token: toko.qr_token, lat: lokasi.lat ?? null, lng: lokasi.lng ?? null, akurasi_m: lokasi.akurasi ?? null };

  return (
    <>
      <KTop judul={toko.nama} />
      <div className="k-body">
<div className="mobile-step-label">LANGKAH 2 · CATAT PENJUALAN</div>
        <div className="row" style={{ '--gap': '6px' }}>
          {toko.tanpaQr ? <span className="chip warn">Tanpa QR — harga rumah</span> : <span className="chip ok"><Ikon n="qr" s={14} />QR sah</span>}
          {demo && !toko.tanpaQr && <span className={`chip ${posisi === 'jauh' ? 'warn' : 'ok'}`}><Ikon n="lokasi" s={14} />{posisi === 'jauh' ? '1,2 km dari toko (simulasi)' : 'Di lokasi toko (simulasi)'}</span>}
          {pakaiLokasi && lokasi.status === 'mencari' && <span className="chip sky"><Ikon n="lokasi" s={14} />Mengambil lokasi…</span>}
          {pakaiLokasi && lokasi.status === 'ada' && <span className={`chip ${lokasi.akurasi <= 100 ? 'ok' : 'warn'}`}><Ikon n="lokasi" s={14} />Akurasi {lokasi.akurasi} m</span>}
        </div>
        {pakaiLokasi && lokasi.status === 'gagal' && <div className="banner warn"><Ikon n="lokasi" s={22} /><span>{lokasi.pesan} Tanpa lokasi, penjualan dihitung harga rumah.</span></div>}
        {pakaiLokasi && lokasi.status === 'ada' && lokasi.akurasi > 100 && <div className="banner warn"><Ikon n="lokasi" s={22} /><span>Akurasi lokasi masih buruk. Tekan Ambil ulang lokasi.</span></div>}
        <FormPenjualan bodyDasar={bodyDasar} namaPelanggan={toko.nama} bolehBon={toko.boleh_bon} galonAwal={3}
          sebelumSimpan={() => (pakaiLokasi && lokasi.status === 'mencari' ? 'Tunggu sebentar, lokasi sedang diambil.' : null)} />
        {pakaiLokasi && <button className="btn btn-ghost btn-block" onClick={ambil} disabled={lokasi.status === 'mencari'}>Ambil ulang lokasi</button>}
      </div>
    </>
  );
}
