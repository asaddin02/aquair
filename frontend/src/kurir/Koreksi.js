import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { jam } from '../format';
import Ikon from '../komponen/Ikon';
import { LangkahForm } from '../komponen/Ruang';
import { KotakGalat, Memuat, Stepper, useToast } from '../komponen/umum';
import { KTop, useKurir } from './KurirApp';

// Satu-satunya jalan mengubah catatan: pengajuan ke bos, dan semuanya tercatat (spesifikasi 3.2).
export default function Koreksi() {
  const { id } = useParams();
  const { beranda } = useKurir();
  const pergi = useNavigate();
  const toast = useToast();
  const x = beranda.data?.penjualan.find((s) => s.id === id);
  const [isi, setIsi] = useState(x?.galon_isi ?? 1);
  const [kosong, setKosong] = useState(x?.galon_kosong ?? 0);
  const [alasan, setAlasan] = useState('');
  const [galat, setGalat] = useState(null);
  const [kirim, setKirim] = useState(false);

  if (!beranda.data) return <Memuat />;
  if (!x) return <><KTop judul="Ajukan koreksi" /><div className="k-body"><p>Penjualan tidak ditemukan di rit ini.</p></div></>;
  const utama = !x.produk_id || x.produk_id === 'utama';

  const submit = async () => {
    setKirim(true);
    setGalat(null);
    try {
      await api(`/kurir/penjualan/${x.id}/koreksi`, { method: 'POST', body: { galon_isi: isi, galon_kosong: kosong, alasan } });
      beranda.muatUlang({ diam: true });
      toast('Pengajuan koreksi terkirim ke bos');
      pergi('/kurir');
    } catch (e) {
      setGalat(e);
      setKirim(false);
    }
  };

  return (
    <>
      <KTop judul="Ajukan koreksi" />
      <div className="k-body">
        <div className="original-receipt"><span className="eyebrow">CATATAN TERSIMPAN</span><b>{x.nama_pelanggan}</b><br /><span className="small">{jam(x.created_at)} · {x.galon_isi} {utama ? 'galon isi' : `${x.satuan} ${x.nama_produk}`} · {x.galon_kosong} kosong · {x.bayar}</span></div>
        <div className="banner sky"><Ikon n="perisai" s={22} /><span>Penjualan yang sudah tersimpan tidak bisa diubah atau dihapus kurir. Bos yang memutuskan koreksinya, dan semuanya tercatat.</span></div>
<LangkahForm nomor="1" judul="Jumlah yang benar" ket="Catatan asli tetap disimpan untuk diperiksa bos.">
        <Stepper label={utama ? 'Galon isi yang benar' : `${x.nama_produk} isi yang benar`} nilai={isi} min={1} max={200} onUbah={setIsi} />
        <Stepper label={utama ? 'Galon kosong yang benar' : `${x.nama_produk} kosong yang benar`} nilai={kosong} min={0} max={200} onUbah={setKosong} />
</LangkahForm><LangkahForm nomor="2" judul="Jelaskan koreksinya">
        <label className="field" htmlFor="alasan-koreksi"><span>Alasan</span>
          <textarea id="alasan-koreksi" className="input" rows={3} value={alasan} onChange={(e) => setAlasan(e.target.value)} placeholder="Contoh: salah pencet jumlah galon" /></label>
</LangkahForm>
        <KotakGalat galat={galat} />
        <button className="btn btn-primary btn-lg btn-block" onClick={submit} disabled={kirim || alasan.trim().length < 3 || (isi === x.galon_isi && kosong === x.galon_kosong)}>Kirim ke bos</button>
      </div>
    </>
  );
}
