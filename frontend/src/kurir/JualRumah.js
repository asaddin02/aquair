import { useEffect, useState } from 'react';
import { api } from '../api';
import { jarakTeks, rp } from '../format';
import Ikon from '../komponen/Ikon';
import { KotakGalat, Memuat } from '../komponen/umum';
import FormPenjualan from './FormPenjualan';
import { KTop, useKurir } from './KurirApp';

// Jual ke rumah: tanpa bukti, lokasi diambil seadanya (spesifikasi 3.2 B).
export default function JualRumah() {
  const { beranda } = useKurir();
  const depot = beranda.data?.depot;
  const demo = depot?.is_demo;
  const adaDepot = !!depot;
  const [langkah, setLangkah] = useState('pilih');
  const [pembeli, setPembeli] = useState(null);
  const [baru, setBaru] = useState({ nama: '', no_hp: '' });
  const [posisi, setPosisi] = useState(null);
  const [daftar, setDaftar] = useState({ data: null, galat: null });

  useEffect(() => {
    if (!adaDepot) return undefined;
    let batal = false;
    const muat = (lat, lng) => api(`/kurir/pelanggan/rumah${lat != null ? `?lat=${lat}&lng=${lng}` : ''}`)
      .then((data) => !batal && setDaftar({ data, galat: null }))
      .catch((galat) => !batal && setDaftar({ data: [], galat }));
    if (demo || !navigator.geolocation) muat();
    else {
      navigator.geolocation.getCurrentPosition(
        (p) => { setPosisi({ lat: p.coords.latitude, lng: p.coords.longitude, akurasi: Math.round(p.coords.accuracy) }); muat(p.coords.latitude, p.coords.longitude); },
        () => muat(), { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 });
    }
    return () => { batal = true; };
  }, [adaDepot, demo]);

  if (!depot) return <Memuat />;
  if (beranda.data.rit?.status !== 'aktif') return <><KTop judul="Jual ke rumah" /><div className="k-body"><p>Tidak ada rit aktif. Mulai rit dulu.</p></div></>;

  if (langkah === 'baru') {
    return (
      <>
        <KTop judul="Pembeli baru" />
        <div className="k-body">
          <label className="field" htmlFor="nama-baru"><span>Nama pembeli</span>
            <input id="nama-baru" className="input" value={baru.nama} onChange={(e) => setBaru({ ...baru, nama: e.target.value })} placeholder="Contoh: Pak Joko (No. 41)" /></label>
          <label className="field" htmlFor="hp-baru"><span>Nomor HP <span className="hint">opsional</span></span>
            <input id="hp-baru" className="input" inputMode="tel" value={baru.no_hp} onChange={(e) => setBaru({ ...baru, no_hp: e.target.value })} placeholder="08…" /></label>
          <div className="banner sky"><Ikon n="rumah" s={22} /><span>Pembeli baru dari kurir selalu dicatat sebagai <b>rumah</b> dan dibayar tunai. Hanya bos yang bisa mengubahnya menjadi toko.</span></div>
          <button className="btn btn-primary btn-lg btn-block" disabled={baru.nama.trim().length < 2} onClick={() => { setPembeli({ baru: true, nama: baru.nama.trim() }); setLangkah('form'); }}>Lanjut</button>
        </div>
      </>
    );
  }

  if (langkah === 'form') {
    const bodyDasar = () => ({
      jenis: 'rumah',
      ...(pembeli.baru ? { pelanggan_baru: { nama: pembeli.nama, no_hp: baru.no_hp } } : { customer_id: pembeli.id }),
      ...(!demo && posisi ? { lat: posisi.lat, lng: posisi.lng, akurasi_m: posisi.akurasi } : {}),
    });
    return (
      <>
        <KTop judul={pembeli.nama} />
        <div className="k-body">
          <span className="chip sky" style={{ alignSelf: 'start' }}><Ikon n="rumah" s={14} />Harga rumah {rp(depot.harga_rumah)}</span>
          <FormPenjualan bodyDasar={bodyDasar} namaPelanggan={pembeli.nama} bolehBon={!pembeli.baru && pembeli.boleh_bon}
            alasanBon={pembeli.baru ? 'Pembeli baru selalu tunai.' : undefined} galonAwal={pembeli.baru ? 1 : 2} />
        </div>
      </>
    );
  }

  return (
    <>
      <KTop judul="Jual ke rumah" />
      <div className="k-body">
        <button className="btn btn-sky btn-lg btn-block" onClick={() => setLangkah('baru')}><Ikon n="tambah" />Pembeli baru</button>
        <KotakGalat galat={daftar.galat} />
        <div>
          <div className="eyebrow" style={{ marginBottom: 4 }}>{posisi || demo ? 'Terdekat dari posisimu' : 'Semua pembeli rumah'}</div>
          {!daftar.data ? <Memuat /> : daftar.data.map((p) => (
            <button key={p.id} className="list-btn" onClick={() => { setPembeli(p); setLangkah('form'); }}>
              <Ikon n="rumah" s={24} /><span className="grow"><b>{p.nama}</b><br />
                <span className="small muted">{p.jarak_m != null ? jarakTeks(p.jarak_m) : 'Lokasi belum ada'}{p.boleh_bon ? ' · boleh bon' : ''}</span></span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
