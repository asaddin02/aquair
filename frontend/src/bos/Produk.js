import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { rp } from '../format';
import Ikon from '../komponen/Ikon';
import { Chip, KotakGalat, Memuat, Modal, Toggle, useData, useToast } from '../komponen/umum';
import { Catatan, Kosong, Ringkasan } from '../komponen/Ruang';
import { Halaman } from './umumBos';

const KATEGORI = [['isi_ulang', 'Isi ulang lain'], ['wadah_kecil', 'Isi wadah kecil'], ['galon_baru', 'Galon baru'], ['air_kemasan', 'Air kemasan bermerek'], ['lpg', 'LPG'], ['lainnya', 'Lainnya']];
const NAMA_KATEGORI = Object.fromEntries(KATEGORI);
const KOSONG = { nama: '', kategori: 'lpg', satuan: 'tabung', harga_rumah: '', harga_toko: '', harga_beli: '', dijual_kurir: true, dijual_depot: false, pakai_kosong: true, aktif: true };

function FormProduk({ awal, onTutup, onSimpan }) {
  const [f, setF] = useState(awal ? { ...awal, harga_toko: awal.harga_toko ?? '', harga_beli: awal.harga_beli ?? '' } : KOSONG);
  const [galat, setGalat] = useState(null);
  const [kirim, setKirim] = useState(false);
  const angka = (v) => (v === '' ? '' : Number(String(v).replace(/\D/g, '')) || 0);
  const salahToko = f.harga_toko !== '' && f.harga_rumah !== '' && Number(f.harga_toko) >= Number(f.harga_rumah);
  const salahBeli = f.harga_beli !== '' && f.harga_rumah !== '' && Number(f.harga_beli) >= Number(f.harga_rumah);
  const simpan = async () => {
    setKirim(true);
    setGalat(null);
    try {
      const body = { nama: f.nama, kategori: f.kategori, satuan: f.satuan, harga_rumah: Number(f.harga_rumah), harga_toko: f.harga_toko === '' ? null : Number(f.harga_toko),
        harga_beli: f.harga_beli === '' ? null : Number(f.harga_beli), dijual_kurir: f.dijual_kurir, dijual_depot: f.dijual_depot, pakai_kosong: f.pakai_kosong, aktif: f.aktif };
      const r = await api(awal ? `/bos/produk/${awal.id}` : '/bos/produk', { method: awal ? 'PUT' : 'POST', body });
      onSimpan(r);
    } catch (e) {
      setGalat(e);
      setKirim(false);
    }
  };
  const sakelar = (k, label, ket) => <div className="setting"><b>{label}</b><p>{ket}</p><span className="ctrl"><Toggle nyala={f[k]} label={label} onUbah={(v) => setF({ ...f, [k]: v })} /></span></div>;
  return (
    <Modal judul={awal ? `Ubah ${awal.nama}` : 'Tambah produk'} onTutup={onTutup}>
      <div className="stack">
        <label className="field" htmlFor="pr-nama"><span>Nama produk</span><input id="pr-nama" className="input" value={f.nama} onChange={(e) => setF({ ...f, nama: e.target.value })} placeholder="Contoh: LPG 3 kg" /></label>
        <div className="form-grid">
          <label className="field" htmlFor="pr-kategori"><span>Jenis</span>
            <select id="pr-kategori" className="input" value={f.kategori} onChange={(e) => setF({ ...f, kategori: e.target.value })}>{KATEGORI.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
          <label className="field" htmlFor="pr-satuan"><span>Satuan</span><input id="pr-satuan" className="input" value={f.satuan} onChange={(e) => setF({ ...f, satuan: e.target.value })} placeholder="tabung, galon, wadah" /></label>
          <label className="field" htmlFor="pr-rumah"><span>Harga rumah / eceran</span><div className="input-unit"><span>Rp</span><input id="pr-rumah" className="num" inputMode="numeric" value={f.harga_rumah} onChange={(e) => setF({ ...f, harga_rumah: angka(e.target.value) })} /></div></label>
          <label className="field" htmlFor="pr-toko"><span>Harga toko (opsional)</span><div className="input-unit"><span>Rp</span><input id="pr-toko" className="num" inputMode="numeric" value={f.harga_toko} onChange={(e) => setF({ ...f, harga_toko: angka(e.target.value) })} placeholder="kosong" /></div></label>
          <label className="field" htmlFor="pr-beli"><span>Harga beli / modal (opsional)</span><div className="input-unit"><span>Rp</span><input id="pr-beli" className="num" inputMode="numeric" value={f.harga_beli} onChange={(e) => setF({ ...f, harga_beli: angka(e.target.value) })} placeholder="kosong" /></div></label>
        </div>
        <p className="small muted">Harga toko hanya berlaku bila penjualan toko terbukti lewat scan QR dan lokasi, sama seperti isi ulang galon. Kosongkan kalau produk ini hanya punya satu harga.</p>
        <p className="small muted">Isi <b>harga beli</b> untuk barang dagangan seperti LPG atau air kemasan, supaya untung per produk terlihat di menu Untung & pengeluaran. Kosongkan untuk produk yang diproduksi depot sendiri.{f.harga_beli !== '' && f.harga_rumah !== '' && !salahBeli && <> Untung <b>{rp(Number(f.harga_rumah) - Number(f.harga_beli))}</b> per {f.satuan || 'satuan'} di harga rumah{f.harga_toko !== '' && !salahToko ? `, ${rp(Number(f.harga_toko) - Number(f.harga_beli))} di harga toko` : ''}.</>}</p>
        {salahToko && <div className="banner danger" role="alert"><Ikon n="awas" s={20} /><span>Harga toko harus lebih murah dari harga rumah.</span></div>}
        {salahBeli && <div className="banner danger" role="alert"><Ikon n="awas" s={20} /><span>Harga beli harus lebih murah dari harga jual.</span></div>}
        {sakelar('dijual_kurir', 'Dijual lewat kurir', 'Kurir bisa membawanya di muatan rit dan mencatat penjualannya.')}
        {sakelar('dijual_depot', 'Dijual di depot', 'Bisa dicatat cepat di menu Penjualan di depot, misalnya tetangga yang mengisi wadah kecil.')}
        {sakelar('pakai_kosong', 'Ada tukar kosong', 'Pembeli menyerahkan wadah kosong, misalnya tabung LPG atau galon bermerek. Jumlahnya ikut dicocokkan saat setor.')}
        {awal && sakelar('aktif', 'Aktif', 'Produk nonaktif tidak bisa dipilih lagi, tetapi catatan lamanya tetap tersimpan.')}
        <KotakGalat galat={galat} />
        <div className="row" style={{ justifyContent: 'flex-end' }}><button className="btn" onClick={onTutup}>Batal</button>
          <button className="btn btn-primary" onClick={simpan} disabled={kirim || f.nama.trim().length < 2 || !f.satuan.trim() || f.harga_rumah === '' || salahToko || salahBeli || (!f.dijual_kurir && !f.dijual_depot)}>{kirim ? 'Menyimpan…' : 'Simpan produk'}</button></div>
      </div>
    </Modal>
  );
}

export default function Produk() {
  const toast = useToast();
  const [form, setForm] = useState(null);
  const { data, galat, memuat, muatUlang } = useData(() => api('/bos/produk'), []);
  const daftar = data?.produk || [];
  const lain = daftar.filter((p) => !p.utama);

  return (
    <Halaman judul="Produk & harga" kanan={<button className="btn btn-primary" onClick={() => setForm('baru')}><Ikon n="tambah" s={18} />Tambah produk</button>}>
      <Ringkasan items={[{ label: 'Produk aktif', nilai: daftar.filter((p) => p.aktif).length, ikon: 'galon' }, { label: 'Dijual lewat kurir', nilai: daftar.filter((p) => p.aktif && p.dijual_kurir).length, ikon: 'rit' }, { label: 'Dijual di depot', nilai: daftar.filter((p) => p.aktif && p.dijual_depot).length, ikon: 'toko' }]} />
      <KotakGalat galat={galat} onUlang={muatUlang} />
      {memuat && !data ? <Memuat /> : (
        <div className="work-split"><div className="work-primary"><div className="product-grid">
          {daftar.map((p) => (
            <article className={`card product-card ${p.aktif ? '' : 'muted'}`} key={p.id}>
              <header><span className="entity-icon"><Ikon n={p.kategori === 'lpg' ? 'alat' : p.kategori === 'wadah_kecil' ? 'toko' : 'galon'} s={22} /></span>
                <div className="grow"><h3>{p.nama}</h3><span className="small muted">{p.utama ? 'Produk utama' : NAMA_KATEGORI[p.kategori]} · per {p.satuan}</span></div>
                {!p.aktif && <Chip jenis="line">Nonaktif</Chip>}</header>
              <div className="product-price"><div><small>Harga rumah</small><b className="num">{rp(p.harga_rumah)}</b></div>
                <div><small>Harga toko</small><b className="num">{p.harga_toko != null && p.harga_toko < p.harga_rumah ? rp(p.harga_toko) : '—'}</b></div>
                <div><small>Modal</small><b className="num">{p.harga_beli != null ? rp(p.harga_beli) : '—'}</b></div></div>
              {p.harga_beli != null
                ? <span className="small muted">Untung {rp(p.harga_rumah - p.harga_beli)} per {p.satuan}{p.harga_toko != null && p.harga_toko < p.harga_rumah ? ` · ${rp(p.harga_toko - p.harga_beli)} di harga toko` : ''}</span>
                : <span className="small muted">{p.utama ? 'Diproduksi sendiri, modalnya masuk pengeluaran depot' : 'Isi harga beli supaya untung per produk terlihat'}</span>}
              <div className="row" style={{ '--gap': '6px' }}>
                {p.dijual_kurir && <Chip jenis="sky" ikon="rit">Lewat kurir</Chip>}
                {p.dijual_depot && <Chip jenis="sky" ikon="toko">Di depot</Chip>}
                {p.pakai_kosong && <Chip jenis="line">Tukar kosong</Chip>}
              </div>
              {p.utama ? <Link className="btn btn-block" to="/bos/pengaturan"><Ikon n="gerigi" s={17} />Ubah harga di Pengaturan</Link>
                : <button className="btn btn-block" onClick={() => setForm(p)}><Ikon n="gerigi" s={17} />Ubah produk</button>}
            </article>
          ))}
        </div></div>
        <div className="work-aside"><Catatan ikon="perisai" judul="Harga toko wajib punya bukti">Untuk produk apa pun, harga toko yang lebih murah hanya berlaku bila kurir memindai QR di dalam toko. Tanpa bukti, dihitung harga rumah dan selisihnya muncul di Radar.</Catatan>
          {!lain.length && <Kosong ikon="galon" judul="Belum ada produk lain">Tambahkan LPG, galon bermerek, galon baru, atau isi wadah kecil supaya setoran kurir dan penjualan di depot tercatat lengkap.</Kosong>}</div></div>
      )}
      {form && <FormProduk awal={form === 'baru' ? null : form} onTutup={() => setForm(null)} onSimpan={async (r) => { setForm(null); await muatUlang({ diam: true }); toast(`${r.nama} tersimpan. Harga berlaku untuk penjualan berikutnya.`); }} />}
    </Halaman>
  );
}
