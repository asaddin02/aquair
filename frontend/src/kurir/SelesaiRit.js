import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { rp } from '../format';
import Ikon from '../komponen/Ikon';
import { LangkahForm } from '../komponen/Ruang';
import { KotakGalat, Memuat, Stepper, useToast } from '../komponen/umum';
import { KTop, useKurir } from './KurirApp';

export default function SelesaiRit() {
  const { beranda, antrean } = useKurir();
  const pergi = useNavigate();
  const toast = useToast();
  const data = beranda.data;
  const [isi, setIsi] = useState(null);
  const [kosong, setKosong] = useState(0);
  const [lain, setLain] = useState({});
  const [setor, setSetor] = useState('');
  const [kirim, setKirim] = useState(false);
  const [galat, setGalat] = useState(null);

  useEffect(() => {
    if (data?.setoran && isi === null) {
      setIsi(data.setoran.galon_di_motor);
      setKosong(data.setoran.kosong_catatan ?? 0);
      setLain(Object.fromEntries((data.setoran.produk_lain || []).filter((p) => p.dibawa != null)
        .map((p) => [p.produk_id, { isi: Math.max(0, p.di_motor), kosong: p.kosong_catatan }])));
      setSetor(String(data.setoran.uang_seharusnya));
    }
  }, [data, isi]);

  if (data && data.rit?.status !== 'aktif') return <><KTop judul="Selesai rit" /><div className="k-body"><div className="start-trip-card"><Ikon n="cek" s={36} /><h2>Tidak ada rit aktif</h2><p>Mulai rit baru untuk mencatat pengantaran berikutnya.</p><Link className="btn btn-primary btn-lg btn-block" to="/kurir/mulai">Mulai rit</Link></div></div></>;
  if (!data || isi === null) return <Memuat />;

  const { rit, setoran } = data;
  const uang = Number(String(setor).replace(/\D/g, '')) || 0;
  const stok = rit.dibawa - isi;
  const selGalon = stok - setoran.galon_catatan;
  const selUang = uang - setoran.uang_seharusnya;
  const selKosong = kosong - (setoran.kosong_catatan ?? 0);
  const produkLain = (setoran.produk_lain || []).filter((p) => p.dibawa != null && lain[p.produk_id]).map((p) => {
    const x = lain[p.produk_id];
    return { ...p, pulang: x, stok: p.dibawa - x.isi, sel: p.dibawa - x.isi - p.terjual_catatan, selK: p.pakai_kosong ? x.kosong - p.kosong_catatan : 0 };
  });
  const ubahLain = (id, perubahan) => setLain({ ...lain, [id]: { ...lain[id], ...perubahan } });
  const adaSelisih = selUang < 0 || selGalon !== 0 || selKosong < 0 || produkLain.some((p) => p.sel !== 0 || p.selK < 0);
  const baris = (label, nilai, merah) => <tr><td>{label}</td><td className={`r num ${merah ? 'danger-t' : ''}`}><b>{nilai}</b></td></tr>;

  const submit = async () => {
    setKirim(true);
    setGalat(null);
    try {
      await api('/kurir/rit/selesai', { method: 'POST', body: { isi_pulang: isi, kosong_pulang: kosong, uang_disetor: uang,
        lain: produkLain.map((p) => ({ produk_id: p.produk_id, isi_pulang: p.pulang.isi, kosong_pulang: p.pakai_kosong ? p.pulang.kosong : 0 })) } });
      await beranda.muatUlang({ diam: true });
      toast('Setoran terkirim. Bos akan menghitung ulang uang dan galon.');
      pergi('/kurir');
    } catch (e) {
      setGalat(e);
      setKirim(false);
    }
  };

  return (
    <>
      <KTop judul="Selesai rit & setor" />
      <div className="k-body">
        {antrean.antrean.length > 0 && <div className="banner warn"><Ikon n="sinyal" s={22} /><span>Masih ada {antrean.antrean.length} penjualan menunggu sinyal. Kirim dulu supaya hitungan setoran lengkap.</span></div>}
<div className="mobile-intro"><span className="eyebrow">AKHIR PERJALANAN</span><h2>Mari cocokkan<br />hasil rit Anda.</h2><p>Hitung fisik galon dan uang yang dibawa kembali.</p></div>
        <LangkahForm nomor="1" judul="Galon dibawa pulang" ket="Isi sesuai jumlah yang ada di motor.">
        <Stepper label="Galon isi dibawa pulang" nilai={isi} min={0} max={rit.dibawa} onUbah={setIsi} />
        <Stepper label="Galon kosong dibawa pulang" nilai={kosong} min={0} max={1000} onUbah={setKosong} />
        {produkLain.map((p) => (
          <div className="sale-line" key={p.produk_id}><div className="sale-line-head"><b>{p.nama}</b><span className="small muted">dibawa {p.dibawa} {p.satuan}, tercatat terjual {p.terjual_catatan}</span></div>
            <Stepper label={`${p.nama} isi dibawa pulang`} nilai={p.pulang.isi} min={0} max={p.dibawa} onUbah={(v) => ubahLain(p.produk_id, { isi: v })} />
            {p.pakai_kosong && <Stepper label={`${p.nama} kosong dibawa pulang`} nilai={p.pulang.kosong} min={0} max={1000} onUbah={(v) => ubahLain(p.produk_id, { kosong: v })} />}
          </div>
        ))}
</LangkahForm><LangkahForm nomor="2" judul="Setoran tunai" ket={`Seharusnya ${rp(setoran.uang_seharusnya)} dari penjualan tunai.`}>
        <label className="field" htmlFor="uang-setor"><span>Uang tunai disetor</span>
          <div className="input-unit" style={{ minHeight: 52 }}><span>Rp</span><input id="uang-setor" className="num" style={{ fontSize: 20 }} inputMode="numeric" value={setor} onChange={(e) => setSetor(e.target.value.replace(/\D/g, ''))} /></div></label>
</LangkahForm>
        <section className="settlement-receipt"><header><Ikon n="perisai" s={22} /><div><h3>Pencocokan setoran</h3><p>Bandingkan stok, catatan, dan uang.</p></div></header><div className="table-wrap"><table><tbody>
          {baris('Terjual menurut stok', `${rit.dibawa} − ${isi} = ${stok} galon`)}
          {baris('Terjual menurut catatan', `${setoran.galon_catatan} galon`)}
          {baris('Selisih galon', selGalon === 0 ? '0 ✓' : selGalon, selGalon !== 0)}
          {baris('Galon kosong: catatan → dibawa pulang', `${setoran.kosong_catatan ?? 0} → ${kosong}${selKosong >= 0 ? ' ✓' : ''}`, selKosong < 0)}
          {produkLain.map((p) => <tr key={p.produk_id}><td>{p.nama}: terjual menurut stok → catatan{p.pakai_kosong ? ', kosong' : ''}</td>
            <td className={`r num ${p.sel !== 0 || p.selK < 0 ? 'danger-t' : ''}`}><b>{p.stok} → {p.terjual_catatan} {p.satuan}{p.pakai_kosong ? ` · kosong ${p.kosong_catatan} → ${p.pulang.kosong}` : ''}</b></td></tr>)}
          {baris('Uang seharusnya (tunai)', rp(setoran.uang_seharusnya))}
          {setoran.uang_bon > 0 && baris('Penjualan bon', rp(setoran.uang_bon))}
          {baris('Selisih uang', selUang === 0 ? 'Rp0 ✓' : `${selUang < 0 ? '−' : '+'}${rp(Math.abs(selUang))}`, selUang < 0)}
        </tbody></table></div></section>
        {adaSelisih && <div className="banner warn"><Ikon n="awas" s={22} /><span>Selisih ini akan muncul di Radar bos.</span></div>}
        <KotakGalat galat={galat} />
        <button className="btn btn-primary btn-lg btn-block" onClick={submit} disabled={kirim || antrean.antrean.length > 0}>{kirim ? 'Mengirim…' : 'Kirim setoran ke bos'}</button>
      </div>
    </>
  );
}
