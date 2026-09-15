import { useState } from 'react';
import { Link } from 'react-router-dom';
import { jam, rp } from '../format';
import Ikon from '../komponen/Ikon';
import { Cari, Kosong, TabPilihan } from '../komponen/Ruang';
import { ChipStatus, KotakGalat, Memuat } from '../komponen/umum';
import { KTop, useKurir } from './KurirApp';

export function DaftarPenjualan({ batas, cari = '', filter = 'semua' }) {
  const { beranda, antrean } = useKurir();
  const data = beranda.data;
  if (!data) return null;
  const diajukan = new Set(data.pengajuan_menunggu.map((m) => m.sale_id));
  const daftar = [...antrean.antrean.map((x) => ({ antre: true, ...x })).reverse(), ...[...data.penjualan].reverse()]
    .filter((x) => (x.antre ? x.label?.nama || '' : x.nama_pelanggan).toLowerCase().includes(cari.toLowerCase()) && (filter === 'semua' || (filter === 'antre' ? x.antre : !x.antre && x.jenis === filter)));
  if (!daftar.length) return <Kosong ikon="rit" judul={cari || filter !== 'semua' ? 'Catatan tidak ditemukan' : 'Belum ada penjualan'}>{cari || filter !== 'semua' ? 'Coba kata kunci atau pilihan lain.' : 'Penjualan yang Anda simpan akan muncul di sini.'}</Kosong>;
  return <div className="sales-timeline">{daftar.slice(0, batas || daftar.length).map((x) => x.antre ? (
    <article className="sale-entry pending" key={x.body.client_id}>
      <span className="sale-icon"><Ikon n="sinyal" s={20} /></span><div className="sale-detail"><h3>{x.label?.nama || 'Penjualan offline'}</h3><p>{x.body.galon_isi} galon · belum terkirim</p><span className="chip warn">Menunggu sinyal</span>{x.galat && <><p className="danger-t">{x.galat}</p><button className="btn" onClick={() => antrean.buang(x.body.client_id)}>Hapus dari antrean</button></>}</div>
    </article>
  ) : (
    <article className="sale-entry" key={x.id}>
      <span className={`sale-icon ${x.jenis}`}><Ikon n={x.jenis === 'rumah' ? 'rumah' : 'toko'} s={20} /></span>
      <div className="sale-detail"><div className="sale-title"><h3>{x.nama_pelanggan}</h3><strong className="num">{rp(x.galon_isi * x.harga_berlaku)}</strong></div><p>{jam(x.urutan_at || x.created_at)} · {x.galon_isi} galon × {rp(x.harga_berlaku)} · {x.bayar}{x.dicatat_offline ? ' · dari antrean offline' : ''}</p><div className="sale-footer"><ChipStatus status={x.status_verifikasi} disetujui={x.disetujui_bos} />{diajukan.has(x.id) ? <small>Menunggu keputusan bos</small> : <Link to={`/kurir/koreksi/${x.id}`}>Ajukan koreksi<Ikon n="kanan" s={14} /></Link>}</div></div>
    </article>
  ))}</div>;
}

export default function Riwayat() {
  const { beranda, antrean } = useKurir();
  const [cari, setCari] = useState('');
  const [filter, setFilter] = useState('semua');
  if (!beranda.data && beranda.memuat) return <Memuat />;
  return <><KTop judul="Riwayat penjualan" /><div className="k-body history-body"><div className="mobile-intro"><span className="eyebrow">CATATAN RIT INI</span><h2>Setiap antar, tercatat.</h2><p>{beranda.data?.penjualan.length || 0} penjualan tersimpan{antrean.antrean.length > 0 ? ` · ${antrean.antrean.length} menunggu sinyal` : ''}</p></div><KotakGalat galat={beranda.galat} onUlang={beranda.muatUlang} /><Cari value={cari} onChange={setCari} placeholder="Cari nama pelanggan…" /><TabPilihan label="Jenis penjualan" nilai={filter} onUbah={setFilter} pilihan={[["semua", "Semua"], ["toko", "Toko"], ["rumah", "Rumah"], ["antre", "Antrean", antrean.antrean.length]]} />{antrean.antrean.length > 0 && <button className="btn btn-block" onClick={antrean.kirimSekarang}><Ikon n="sinyal" s={18} />Kirim antrean sekarang</button>}<DaftarPenjualan cari={cari} filter={filter} /></div></>;
}
