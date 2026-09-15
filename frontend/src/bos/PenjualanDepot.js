import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { hariIniWib, rp, tglPanjang } from '../format';
import Ikon from '../komponen/Ikon';
import { Chip, KotakGalat, Memuat, Modal, Stepper, useData, useToast } from '../komponen/umum';
import { Kosong, Panel, Ringkasan } from '../komponen/Ruang';
import { Halaman } from './umumBos';

function Batalkan({ jual, onTutup, onSelesai }) {
  const [alasan, setAlasan] = useState('');
  const [galat, setGalat] = useState(null);
  const simpan = async () => {
    try {
      await api(`/bos/penjualan-depot/${jual.id}/batal`, { method: 'POST', body: { alasan } });
      onSelesai();
    } catch (e) {
      setGalat(e);
    }
  };
  return (
    <Modal judul="Batalkan penjualan" onTutup={onTutup}>
      <div className="stack">
        <p className="small muted">{jual.jumlah} {jual.satuan} {jual.nama_produk} · {rp(jual.total)} · {jual.jam}. Catatan tetap disimpan dengan tanda batal.</p>
        <label className="field" htmlFor="batal-alasan"><span>Alasan</span><input id="batal-alasan" className="input" value={alasan} onChange={(e) => setAlasan(e.target.value)} placeholder="Contoh: salah pilih jumlah" /></label>
        <KotakGalat galat={galat} />
        <div className="row" style={{ justifyContent: 'flex-end' }}><button className="btn" onClick={onTutup}>Kembali</button>
          <button className="btn btn-danger" onClick={simpan} disabled={alasan.trim().length < 3}>Batalkan penjualan</button></div>
      </div>
    </Modal>
  );
}

export default function PenjualanDepot() {
  const toast = useToast();
  const tanggal = hariIniWib();
  const [pilih, setPilih] = useState(null);
  const [jumlah, setJumlah] = useState(1);
  const [kirim, setKirim] = useState(false);
  const [galat, setGalat] = useState(null);
  const [batal, setBatal] = useState(null);
  const { data, galat: galatMuat, memuat, muatUlang } = useData(() => api(`/bos/penjualan-depot?tanggal=${tanggal}`), [tanggal]);
  const produk = data?.produk || [];
  const dipilih = produk.find((p) => p.id === pilih) || produk[0];

  const catat = async () => {
    setKirim(true);
    setGalat(null);
    try {
      const r = await api('/bos/penjualan-depot', { method: 'POST', body: { produk_id: dipilih.id, jumlah } });
      await muatUlang({ diam: true });
      toast(`Tercatat: ${r.jumlah} ${r.satuan} ${r.nama_produk} · ${rp(r.total)}`);
      setJumlah(1);
    } catch (e) {
      setGalat(e);
    } finally {
      setKirim(false);
    }
  };

  return (
    <Halaman judul="Penjualan di depot">
      <Ringkasan items={[{ label: 'Uang hari ini', nilai: rp(data?.total), ket: tglPanjang(tanggal), ikon: 'uang' }, { label: 'Transaksi', nilai: data?.jumlah_transaksi, ikon: 'toko' }, { label: 'Produk terlaris', nilai: data?.per_produk[0]?.nama || '—', ket: data?.per_produk[0] ? `${data.per_produk[0].jumlah} ${data.per_produk[0].satuan}` : null, ikon: 'galon' }]} />
      <KotakGalat galat={galatMuat} onUlang={muatUlang} />
      {memuat && !data ? <Memuat /> : !produk.length ? (
        <Kosong ikon="toko" judul="Belum ada produk yang dijual di depot" aksi={<Link className="btn btn-primary" to="/bos/produk"><Ikon n="tambah" s={18} />Atur produk</Link>}>Tambahkan produk dengan pilihan "Dijual di depot", misalnya isi wadah kecil Rp2.000.</Kosong>
      ) : (
        <div className="dashboard-workspace">
          <div className="dashboard-primary">
            <Panel judul="Catat cepat" ket="Pilih produk, isi jumlah, lalu simpan. Harga mengikuti Produk & harga.">
              <div className="stack">
                <div className="quick-sale-grid" role="group" aria-label="Pilih produk">{produk.map((p) => <button key={p.id} type="button" aria-pressed={dipilih?.id === p.id} onClick={() => setPilih(p.id)}><b>{p.nama}</b><small>{rp(p.harga_rumah)} per {p.satuan}</small></button>)}</div>
                {dipilih && <Stepper label={`Jumlah ${dipilih.satuan}`} nilai={jumlah} min={1} max={500} onUbah={setJumlah} />}
                {dipilih && <div className="row between"><span className="small muted">Total</span><b className="num" style={{ font: '800 24px/1.2 var(--f-head)' }}>{rp(jumlah * dipilih.harga_rumah)}</b></div>}
                <KotakGalat galat={galat} />
                <button className="btn btn-primary btn-lg btn-block" onClick={catat} disabled={kirim || !dipilih}>{kirim ? 'Menyimpan…' : 'Catat penjualan'}</button>
              </div>
            </Panel>
          </div>
          <aside className="dashboard-secondary">
            <Panel judul="Catatan hari ini" ket={`${data.baris.length} catatan`}>
              {!data.baris.length ? <p className="muted">Belum ada penjualan di depot hari ini.</p> : (
                <ul className="depot-sale-list">{data.baris.map((x) => (
                  <li key={x.id} className={x.batal ? 'batal' : ''}>
                    <div className="grow"><b>{x.jumlah} {x.satuan} {x.nama_produk}</b><span className="small muted">{x.jam} · {x.nama_pengguna}</span>{x.batal && <Chip jenis="line">Dibatalkan</Chip>}</div>
                    <b className="num">{rp(x.total)}</b>
                    {!x.batal && <button className="btn btn-ghost" onClick={() => setBatal(x)} aria-label={`Batalkan ${x.nama_produk} ${x.jam}`}>Batal</button>}
                  </li>
                ))}</ul>
              )}
            </Panel>
          </aside>
        </div>
      )}
      {batal && <Batalkan jual={batal} onTutup={() => setBatal(null)} onSelesai={async () => { setBatal(null); await muatUlang({ diam: true }); toast('Penjualan dibatalkan dan tercatat di log audit'); }} />}
    </Halaman>
  );
}
