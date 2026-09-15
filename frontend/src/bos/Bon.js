import { useState } from 'react';
import { Cari, Catatan, Kosong, Ringkasan } from '../komponen/Ruang';
import { api } from '../api';
import { rp, tglPanjang } from '../format';
import Ikon from '../komponen/Ikon';
import { KotakGalat, Memuat, useData, useToast } from '../komponen/umum';
import { Halaman } from './umumBos';

export default function Bon() {
  const toast = useToast();
  const [cari, setCari] = useState('');
  const { data, galat, memuat, muatUlang } = useData(() => api('/bos/bon'), []);
  const lunas = async (p) => {
    try {
      await api(`/bos/bon/${p.customer_id}/lunas`, { method: 'POST' });
      await muatUlang({ diam: true });
      toast(`Bon ${p.nama} lunas`);
    } catch (e) {
      toast(e.message);
    }
  };
  return (
    <Halaman judul="Bon belum lunas">
      <KotakGalat galat={galat} onUlang={muatUlang} />
      {memuat && !data ? <Memuat /> : data && <>
        <Ringkasan items={[{ label: 'Total bon belum lunas', nilai: rp(data.total), ikon: 'uang', warna: 'amber' }, { label: 'Pelanggan dengan bon', nilai: data.pelanggan.length, ikon: 'orang' }, { label: 'Catatan penjualan', nilai: data.pelanggan.reduce((n, p) => n + p.catatan.length, 0), ikon: 'rit' }]} />
        <div className="work-split"><div className="work-primary"><div className="directory-toolbar"><h2 className="section-title">Daftar tagihan</h2><Cari value={cari} onChange={setCari} placeholder="Cari pelanggan dengan bon…" /></div>
          {data.pelanggan.filter((p) => p.nama.toLowerCase().includes(cari.toLowerCase())).map((p) => <article className="debt-card" key={p.customer_id}>
            <header><span className="entity-icon"><Ikon n="orang" s={24} /></span><div><h3>{p.nama}</h3><p>{p.catatan.length} catatan belum dibayar</p></div><strong>{rp(p.total)}</strong></header>
            <details><summary>Lihat rincian penjualan<Ikon n="kanan" s={17} /></summary><ul className="list">{p.catatan.map((c, i) => <li key={i}><span className="grow">{tglPanjang(c.tanggal)}</span><span>{c.galon_isi} galon × {rp(c.harga)}</span></li>)}</ul></details>
            <footer><span>Tandai setelah pembayaran diterima.</span><button className="btn btn-primary" onClick={() => lunas(p)}><Ikon n="cek" s={18} />Lunas</button></footer>
          </article>)}
          {!data.pelanggan.filter((p) => p.nama.toLowerCase().includes(cari.toLowerCase())).length && <Kosong ikon="uang" judul={cari ? 'Pelanggan tidak ditemukan' : 'Semua bon sudah lunas'}>Tagihan yang belum dibayar akan tampil di sini.</Kosong>}
        </div><div className="work-aside"><Catatan ikon="uang" judul="Tagih dengan catatan yang jelas">Buka rincian untuk melihat tanggal dan jumlah galon sebelum mengonfirmasi pembayaran.</Catatan><Catatan judul="Izin bon tetap di tangan Anda">Kurir hanya dapat memilih bon untuk pelanggan yang Anda izinkan. Pengaturan izin tersedia pada halaman Pelanggan.</Catatan></div></div>
      </>}
    </Halaman>
  );
}
