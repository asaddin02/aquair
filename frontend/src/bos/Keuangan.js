import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { angka, geserTanggal, hariIniWib, periodeTeks, rp, tglPendek } from '../format';
import Ikon from '../komponen/Ikon';
import { KotakGalat, Memuat, Modal, useData, useToast } from '../komponen/umum';
import { Catatan, Kosong, Panel, Ringkasan, TabPilihan } from '../komponen/Ruang';
import { Halaman } from './umumBos';

const PERIODE = [['hari', 'Hari ini'], ['minggu', '7 hari'], ['bulan', 'Bulan ini'], ['khusus', 'Pilih tanggal']];

function FormPengeluaran({ kategori, onSimpan }) {
  const toast = useToast();
  const hariIni = hariIniWib();
  const [f, setF] = useState({ kategori: 'bahan', keterangan: '', jumlah: '', tanggal: hariIni });
  const [kirim, setKirim] = useState(false);
  const [galat, setGalat] = useState(null);
  const angka = (v) => (v === '' ? '' : Number(String(v).replace(/\D/g, '')) || 0);
  const simpan = async () => {
    setKirim(true);
    setGalat(null);
    try {
      const r = await api('/bos/pengeluaran', { method: 'POST', body: { kategori: f.kategori, keterangan: f.keterangan.trim(), jumlah: Number(f.jumlah), tanggal: f.tanggal } });
      setF({ ...f, keterangan: '', jumlah: '' });
      toast(`Tercatat: ${r.keterangan} · ${rp(r.jumlah)}`);
      await onSimpan();
    } catch (e) {
      setGalat(e);
    } finally {
      setKirim(false);
    }
  };
  return (
    <div className="stack">
      <div className="form-grid">
        <label className="field" htmlFor="pg-kategori"><span>Untuk apa</span>
          <select id="pg-kategori" className="input" value={f.kategori} onChange={(e) => setF({ ...f, kategori: e.target.value })}>{kategori.map((k) => <option key={k.kode} value={k.kode}>{k.nama}</option>)}</select></label>
        <label className="field" htmlFor="pg-tanggal"><span>Tanggal</span>
          <input id="pg-tanggal" type="date" className="input" value={f.tanggal} max={hariIni} onChange={(e) => setF({ ...f, tanggal: e.target.value })} /></label>
      </div>
      <label className="field" htmlFor="pg-keterangan"><span>Keterangan</span>
        <input id="pg-keterangan" className="input" value={f.keterangan} onChange={(e) => setF({ ...f, keterangan: e.target.value })} placeholder="Contoh: beli air baku satu tangki" /></label>
      <label className="field" htmlFor="pg-jumlah"><span>Jumlah uang</span>
        <div className="input-unit"><span>Rp</span><input id="pg-jumlah" className="num" inputMode="numeric" value={f.jumlah} onChange={(e) => setF({ ...f, jumlah: angka(e.target.value) })} placeholder="0" /></div></label>
      <KotakGalat galat={galat} />
      <button className="btn btn-primary btn-block" onClick={simpan} disabled={kirim || f.keterangan.trim().length < 2 || !f.jumlah}><Ikon n="tambah" s={18} />{kirim ? 'Menyimpan…' : 'Catat pengeluaran'}</button>
    </div>
  );
}

function Hapus({ catatan, onTutup, onSelesai }) {
  const [galat, setGalat] = useState(null);
  const hapus = async () => {
    try {
      await api(`/bos/pengeluaran/${catatan.id}`, { method: 'DELETE' });
      onSelesai();
    } catch (e) {
      setGalat(e);
    }
  };
  return (
    <Modal judul="Hapus catatan pengeluaran?" onTutup={onTutup}>
      <div className="stack">
        <p className="small muted">{catatan.keterangan} · {rp(catatan.jumlah)} · {tglPendek(catatan.tanggal)}. Penghapusan tercatat di log audit.</p>
        <KotakGalat galat={galat} />
        <div className="row" style={{ justifyContent: 'flex-end' }}><button className="btn" onClick={onTutup}>Kembali</button>
          <button className="btn btn-danger" onClick={hapus}>Hapus catatan</button></div>
      </div>
    </Modal>
  );
}

export default function Keuangan() {
  const toast = useToast();
  const hariIni = hariIniWib();
  const [periode, setPeriode] = useState('bulan');
  const [dari, setDari] = useState(geserTanggal(hariIni, -29));
  const [sampai, setSampai] = useState(hariIni);
  const [hapus, setHapus] = useState(null);
  const { data, galat, memuat, muatUlang } = useData(
    () => api(`/bos/keuangan?periode=${periode}${periode === 'khusus' ? `&dari=${dari}&sampai=${sampai}` : ''}`), [periode, dari, sampai]);

  const pilihPeriode = (
    <div className="stack" style={{ '--gap': '12px' }}>
      <TabPilihan label="Periode" nilai={periode} onUbah={setPeriode} pilihan={PERIODE} />
      {periode === 'khusus' && (
        <div className="form-grid" style={{ maxWidth: 460 }}>
          <label className="field" htmlFor="ku-dari"><span>Dari tanggal</span><input id="ku-dari" type="date" className="input" value={dari} max={sampai} onChange={(e) => setDari(e.target.value)} /></label>
          <label className="field" htmlFor="ku-sampai"><span>Sampai tanggal</span><input id="ku-sampai" type="date" className="input" value={sampai} min={dari} max={hariIni} onChange={(e) => setSampai(e.target.value)} /></label>
        </div>
      )}
    </div>
  );

  if (memuat && !data) return <Halaman judul="Untung & pengeluaran">{pilihPeriode}<Memuat /></Halaman>;
  if (!data) return <Halaman judul="Untung & pengeluaran">{pilihPeriode}<KotakGalat galat={galat} onUlang={muatUlang} /></Halaman>;

  const { masuk, keluar, untung } = data;
  const rugi = untung < 0;
  const uangMasuk = [['Penjualan lewat kurir', masuk.penjualan_kurir], ['Penjualan di depot', masuk.penjualan_depot], ['Bon yang dilunasi', masuk.pelunasan_bon]].filter(([, v]) => v > 0);

  return (
    <Halaman judul="Untung & pengeluaran" kanan={<span className="small muted">{periodeTeks(data.rentang.dari, data.rentang.sampai)} · {data.jumlah_hari} hari</span>}>
      {pilihPeriode}
      <Ringkasan items={[
        { label: 'Uang masuk', nilai: rp(masuk.total), ket: `${data.jumlah_hari} hari`, ikon: 'uang', warna: 'green' },
        { label: 'Uang keluar', nilai: rp(keluar.total), ket: `${keluar.jumlah_catatan} catatan pengeluaran`, ikon: 'rit', warna: 'amber' },
        { label: rugi ? 'Rugi' : 'Untung', nilai: `${rugi ? '−\u00a0' : ''}${rp(Math.abs(untung))}`, ket: `Rata-rata ${rp(data.untung_per_hari)} per hari`, ikon: 'bintang', warna: rugi ? 'red' : '' },
      ]} />
      <KotakGalat galat={galat} onUlang={muatUlang} />
      <div className="dashboard-workspace">
        <div className="dashboard-primary">
          <Panel judul="Uang masuk" ket="Uang yang benar-benar diterima pada periode ini">
            <div className="leak-breakdown">
              {uangMasuk.length ? uangMasuk.map(([label, v]) => (
                <div key={label}><span>{label}</span><b>{rp(v)}</b><i style={{ '--porsi': `${masuk.total ? Math.min(100, (v / masuk.total) * 100) : 0}%` }} /></div>
              )) : <p className="muted">Belum ada uang masuk pada periode ini.</p>}
            </div>
            {data.bon_belum_lunas > 0 && <p className="small muted">Bon periode ini yang belum dibayar {rp(data.bon_belum_lunas)} belum ikut dihitung karena uangnya belum diterima. <Link to="/bos/bon">Lihat bon belum lunas</Link></p>}
          </Panel>
          <Panel judul="Uang keluar" ket="Pengeluaran depot menurut jenisnya">
            <div className="leak-breakdown">
              {keluar.per_kategori.length ? keluar.per_kategori.map((k) => (
                <div key={k.kode}><span>{k.nama}</span><b>{rp(k.jumlah)}</b><i style={{ '--porsi': `${keluar.total ? Math.min(100, (k.jumlah / keluar.total) * 100) : 0}%` }} /></div>
              )) : <p className="muted">Belum ada pengeluaran yang dicatat pada periode ini.</p>}
            </div>
          </Panel>
          {data.jumlah_hari > 1 && (
            <Panel judul="Untung per hari" ket="Hari terbaru di atas">
              <div className="table-wrap" style={{ maxHeight: 340, overflowY: 'auto' }} tabIndex={0} role="region" aria-label="Tabel untung per hari">
                <table>
                  <thead><tr><th>Tanggal</th><th className="r">Untung</th><th className="r">Masuk</th><th className="r">Keluar</th></tr></thead>
                  <tbody>{[...data.harian].reverse().map((h) => (
                    <tr key={h.tanggal}>
                      <td style={{ whiteSpace: 'nowrap' }}>{tglPendek(h.tanggal)}</td>
                      <td className="r num"><b>{h.untung < 0 ? `−\u00a0${rp(-h.untung)}` : rp(h.untung)}</b></td>
                      <td className="r num">{rp(h.masuk)}</td>
                      <td className="r num">{rp(h.keluar)}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </Panel>
          )}
          {data.produk.length > 0 && (
            <Panel judul="Untung kotor per produk" ket="Barang yang terjual pada periode ini, termasuk yang dibon">
              <div className="table-wrap" style={{ maxHeight: 340, overflowY: 'auto' }} tabIndex={0} role="region" aria-label="Tabel untung kotor per produk">
                <table>
                  <thead><tr><th>Produk</th><th className="r">Terjual</th><th className="r">Omzet</th><th className="r">Modal</th><th className="r">Untung kotor</th></tr></thead>
                  <tbody>{data.produk.map((p) => (
                    <tr key={p.produk_id}>
                      <td>{p.nama}</td>
                      <td className="r num" style={{ whiteSpace: 'nowrap' }}>{angka(p.jumlah)} {p.satuan}</td>
                      <td className="r num">{rp(p.omzet)}</td>
                      <td className="r num">{p.ada_modal ? rp(p.modal) : '—'}</td>
                      <td className="r num">{p.ada_modal ? <b>{rp(p.untung_kotor)}</b> : <span className="muted small">{p.utama ? 'produksi sendiri' : 'belum diisi'}</span>}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
              <p className="small muted">Barang dagangan menyumbang untung kotor <b>{rp(data.untung_kotor_produk)}</b> pada periode ini. Angka ini <b>tidak dijumlahkan</b> dengan untung di atas, karena modal barangnya sudah tercatat sebagai pengeluaran waktu stoknya dibeli. Isi ulang galon tidak punya harga beli karena diproduksi depot sendiri. <Link to="/bos/produk">Atur harga beli produk</Link></p>
            </Panel>
          )}
          <Panel judul="Catatan pengeluaran" ket={`${data.pengeluaran.length} catatan pada periode ini`}>
            {!data.pengeluaran.length ? (
              <Kosong ikon="uang" judul="Belum ada pengeluaran">Catat listrik, upah kurir, air baku, atau bensin supaya untungnya terlihat benar.</Kosong>
            ) : (
              <div style={{ maxHeight: 420, overflowY: 'auto' }}>
                <ul className="depot-sale-list">{data.pengeluaran.map((x) => (
                  <li key={x.id}>
                    <div className="grow"><b>{x.keterangan}</b><span className="small muted">{tglPendek(x.tanggal)} · {x.nama_kategori}</span></div>
                    <b className="num">{rp(x.jumlah)}</b>
                    <button className="btn btn-ghost" onClick={() => setHapus(x)} aria-label={`Hapus ${x.keterangan}`}>Hapus</button>
                  </li>
                ))}</ul>
              </div>
            )}
          </Panel>
        </div>
        <aside className="dashboard-secondary">
          <Panel judul="Catat pengeluaran" ket="Setiap uang yang keluar dari depot">
            <FormPengeluaran kategori={data.kategori} onSimpan={() => muatUlang({ diam: true })} />
          </Panel>
          <Catatan ikon="uang" judul="Cara angka ini dihitung">Untung = uang masuk − uang keluar. Penjualan yang dibon baru dihitung setelah Anda menandainya lunas di menu Bon, jadi angkanya sama dengan isi laci depot. Selisih setoran kurir diperiksa terpisah di Radar.</Catatan>
          <div className="quick-links"><span className="eyebrow">AKSES CEPAT</span><Link to="/bos/bon"><Ikon n="uang" />Bon belum lunas<Ikon n="kanan" s={16} /></Link><Link to="/bos/depot"><Ikon n="toko" />Penjualan di depot<Ikon n="kanan" s={16} /></Link><Link to="/bos/unduh"><Ikon n="unduh" />Unduh laporan<Ikon n="kanan" s={16} /></Link></div>
        </aside>
      </div>
      {hapus && <Hapus catatan={hapus} onTutup={() => setHapus(null)} onSelesai={async () => { setHapus(null); await muatUlang({ diam: true }); toast('Catatan pengeluaran dihapus'); }} />}
    </Halaman>
  );
}
