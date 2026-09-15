import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { idUnik } from '../api';
import { rp } from '../format';
import Ikon from '../komponen/Ikon';
import { LangkahForm } from '../komponen/Ruang';
import { KotakGalat, Stepper, useToast } from '../komponen/umum';
import { useSesi } from '../Sesi';
import { simpanPenjualan, tambahKeAntrean } from './antrean';
import { useKurir } from './KurirApp';

const UTAMA = 'utama';
const PRODUK_UTAMA = { id: UTAMA, nama: 'Isi ulang galon', satuan: 'galon', pakai_kosong: true, utama: true };

const hargaTeks = (p) => (p.harga_rumah == null ? '' : p.harga_toko != null && p.harga_toko < p.harga_rumah
  ? `${rp(p.harga_rumah)} rumah · ${rp(p.harga_toko)} toko terverifikasi` : `${rp(p.harga_rumah)} per ${p.satuan}`);

// Formulir barang + cara bayar yang dipakai jual ke toko dan jual ke rumah. Satu kunjungan bisa berisi beberapa produk
// yang ada di muatan rit. Gagal karena sinyal tidak pernah tampak tersimpan: kurir memilih coba lagi atau simpan di HP.
export default function FormPenjualan({ bodyDasar, namaPelanggan, bolehBon, alasanBon, galonAwal = 2, sebelumSimpan }) {
  const { beranda, antrean, produk } = useKurir();
  const { sesi } = useSesi();
  const pergi = useNavigate();
  const toast = useToast();
  const rit = beranda.data?.rit;
  const tersedia = useMemo(() => {
    const dimuat = new Set((rit?.muatan_lain || []).map((m) => m.produk_id));
    const daftar = produk.data || [{ ...PRODUK_UTAMA, harga_rumah: beranda.data?.depot.harga_rumah, harga_toko: beranda.data?.depot.harga_toko }];
    return daftar.filter((p) => (p.utama ? (rit?.dibawa ?? 1) > 0 : dimuat.has(p.id)));
  }, [produk.data, rit, beranda.data]);
  const cari = (id) => tersedia.find((p) => p.id === id) || (id === UTAMA ? PRODUK_UTAMA : { id, nama: 'Produk', satuan: 'pcs', pakai_kosong: false });
  const [baris, setBaris] = useState([{ id: null, isi: galonAwal, kosong: galonAwal, kosongDiubah: false }]);
  const [pilihProduk, setPilihProduk] = useState(false);
  const [bayar, setBayar] = useState('tunai');
  const [kirim, setKirim] = useState(false);
  const [galat, setGalat] = useState(null);
  const clientId = useRef(idUnik());

  const daftar = baris.map((x) => ({ ...x, id: x.id ?? (tersedia[0]?.id || UTAMA) }));
  const sisaProduk = tersedia.filter((p) => !daftar.some((x) => x.id === p.id));
  const ubah = (i, perubahan) => setBaris((b) => b.map((x, j) => (j === i ? { ...x, id: daftar[i].id, ...perubahan } : x)));
  const tambahBaris = (p) => { setBaris((b) => [...b.map((x, j) => ({ ...x, id: daftar[j].id })), { id: p.id, isi: 1, kosong: p.pakai_kosong ? 1 : 0, kosongDiubah: false }]); setPilihProduk(false); };
  const hapus = (i) => setBaris((b) => b.filter((_, j) => j !== i).map((x) => ({ ...x, id: x.id ?? daftar[0].id })));
  const utama = daftar.find((x) => x.id === UTAMA);
  const kosongTotal = daftar.reduce((a, x) => a + (cari(x.id).pakai_kosong ? x.kosong : 0), 0);
  const ringkas = daftar.map((x) => { const p = cari(x.id); return p.utama ? `${x.isi} galon isi` : `${x.isi} ${p.satuan} ${p.nama}`; }).join(' · ');

  const body = () => ({
    ...bodyDasar(), client_id: clientId.current, bayar,
    baris: daftar.map((x) => ({ produk_id: x.id, galon_isi: x.isi, galon_kosong: cari(x.id).pakai_kosong ? x.kosong : 0 })),
  });

  const simpan = async () => {
    const cegah = sebelumSimpan?.();
    if (cegah) return setGalat({ message: cegah });
    setKirim(true);
    setGalat(null);
    try {
      const r = await simpanPenjualan(body());
      beranda.muatUlang({ diam: true });
      pergi('/kurir/hasil', { state: { penjualan: r.penjualan, baris: r.baris } });
    } catch (e) {
      setGalat(e);
      setKirim(false);
    }
  };

  const antrekan = () => {
    tambahKeAntrean(sesi.depot.id, body(), { nama: namaPelanggan, barang: ringkas });
    antrean.muatUlang();
    toast('Disimpan di HP — dikirim otomatis saat sinyal kembali');
    pergi('/kurir');
  };

  return (
    <>
      <LangkahForm nomor="1" judul="Barang yang diantar" ket="Hitung isi yang diserahkan dan kosong yang diambil.">
        {daftar.map((x, i) => {
          const p = cari(x.id);
          return (
            <div className="sale-line" key={x.id}>
              {(daftar.length > 1 || !p.utama) && (
                <div className="sale-line-head"><b>{p.nama}</b><span className="small muted">{hargaTeks(p)}</span>
                  {daftar.length > 1 && <button type="button" className="btn btn-ghost" onClick={() => hapus(i)} aria-label={`Hapus ${p.nama}`}><Ikon n="silang" s={16} />Hapus</button>}</div>
              )}
              <Stepper label={p.utama ? 'Galon isi diserahkan' : `${p.nama} diserahkan (${p.satuan})`} nilai={x.isi} min={1} max={200}
                onUbah={(v) => ubah(i, { isi: v, ...(x.kosongDiubah ? {} : { kosong: v }) })} />
              {p.pakai_kosong && <Stepper label={p.utama ? 'Galon kosong diambil' : `${p.nama} kosong diambil`} nilai={x.kosong} min={0} max={200}
                onUbah={(v) => ubah(i, { kosong: v, kosongDiubah: true })} />}
            </div>
          );
        })}
        {utama && <div className="loan-impact"><Ikon n="galon" s={20} /><span>{utama.isi === utama.kosong ? 'Galon isi dan kosong seimbang.' : utama.isi > utama.kosong ? `Pinjaman pelanggan bertambah ${utama.isi - utama.kosong} galon.` : `Pinjaman pelanggan berkurang ${utama.kosong - utama.isi} galon.`}</span></div>}
        {sisaProduk.length > 0 && (pilihProduk
          ? <div className="product-picker" role="group" aria-label="Pilih produk tambahan">{sisaProduk.map((p) => <button type="button" key={p.id} onClick={() => tambahBaris(p)}><Ikon n="tambah" s={16} />{p.nama}</button>)}</div>
          : <button type="button" className="btn btn-block" onClick={() => setPilihProduk(true)}><Ikon n="tambah" s={18} />Tambah produk lain</button>)}
      </LangkahForm>
      <LangkahForm nomor="2" judul="Cara pembayaran" ket="Pilih sesuai pembayaran pelanggan."><div className="field"><span className="sr">Bayar</span>
        <div className="grid-2" style={{ gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <button type="button" className="choice" style={{ gridTemplateColumns: '1fr' }} aria-pressed={bayar === 'tunai'} onClick={() => setBayar('tunai')}><Ikon n="uang" s={23} /><b>Tunai</b><small>Dibayar sekarang</small></button>
          <button type="button" className="choice" style={{ gridTemplateColumns: '1fr' }} aria-pressed={bayar === 'bon'} onClick={() => setBayar('bon')} disabled={!bolehBon}><Ikon n="rit" s={23} /><b>Bon</b><small>Dibayar kemudian</small></button>
        </div>
        {!bolehBon && <span className="hint">{alasanBon || 'Bon belum diizinkan bos untuk pelanggan ini.'}</span>}
      </div>
      </LangkahForm><section className="sale-review"><div><span>Ringkasan penjualan</span><b>{namaPelanggan}</b></div><p><strong>{ringkas}</strong><span>{kosongTotal} kosong diambil · {bayar}</span></p></section>
      {galat?.jaringan ? (
        <div className="banner danger" role="alert"><Ikon n="sinyal" s={22} />
          <div className="stack" style={{ '--gap': '8px' }}><b>Belum tersimpan — tidak ada sinyal</b>
            <div className="row" style={{ '--gap': '8px' }}>
              <button className="btn" onClick={simpan}>Coba lagi</button>
              <button className="btn" onClick={antrekan}>Simpan di HP, kirim nanti</button>
            </div>
          </div>
        </div>
      ) : <KotakGalat galat={galat} />}
      <button className="btn btn-primary btn-lg btn-block" onClick={simpan} disabled={kirim}>{kirim ? 'Menyimpan…' : 'Simpan penjualan'}</button>
    </>
  );
}
