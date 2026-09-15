import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { rp } from '../format';
import Ikon from '../komponen/Ikon';
import { KotakGalat, Memuat, Stepper, useToast } from '../komponen/umum';
import { KTop, useKurir } from './KurirApp';

export default function SelesaiRit() {
  const { beranda, antrean } = useKurir();
  const pergi = useNavigate();
  const toast = useToast();
  const data = beranda.data;
  const [isi, setIsi] = useState(null);
  const [kosong, setKosong] = useState(0);
  const [setor, setSetor] = useState('');
  const [kirim, setKirim] = useState(false);
  const [galat, setGalat] = useState(null);

  useEffect(() => {
    if (data?.setoran && isi === null) {
      setIsi(data.setoran.galon_di_motor);
      setKosong(data.penjualan.reduce((a, x) => a + x.galon_kosong, 0));
      setSetor(String(data.setoran.uang_seharusnya));
    }
  }, [data, isi]);

  if (!data || isi === null) return data && data.rit?.status !== 'aktif' ? <><KTop judul="Selesai rit" /><div className="k-body"><p>Tidak ada rit aktif.</p></div></> : <Memuat />;

  const { rit, setoran } = data;
  const uang = Number(String(setor).replace(/\D/g, '')) || 0;
  const stok = rit.dibawa - isi;
  const selGalon = stok - setoran.galon_catatan;
  const selUang = uang - setoran.uang_seharusnya;
  const baris = (label, nilai, merah) => <tr><td>{label}</td><td className={`r num ${merah ? 'danger-t' : ''}`}><b>{nilai}</b></td></tr>;

  const submit = async () => {
    setKirim(true);
    setGalat(null);
    try {
      await api('/kurir/rit/selesai', { method: 'POST', body: { isi_pulang: isi, kosong_pulang: kosong, uang_disetor: uang } });
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
        <Stepper label="Galon isi dibawa pulang" nilai={isi} min={0} max={rit.dibawa} onUbah={setIsi} />
        <Stepper label="Galon kosong dibawa pulang" nilai={kosong} min={0} max={1000} onUbah={setKosong} />
        <label className="field" htmlFor="uang-setor"><span>Uang tunai disetor</span>
          <div className="input-unit" style={{ minHeight: 52 }}><span>Rp</span><input id="uang-setor" className="num" style={{ fontSize: 20 }} inputMode="numeric" value={setor} onChange={(e) => setSetor(e.target.value.replace(/\D/g, ''))} /></div></label>
        <div className="table-wrap"><table><tbody>
          {baris('Terjual menurut stok', `${rit.dibawa} − ${isi} = ${stok} galon`)}
          {baris('Terjual menurut catatan', `${setoran.galon_catatan} galon`)}
          {baris('Selisih galon', selGalon === 0 ? '0 ✓' : selGalon, selGalon !== 0)}
          {baris('Uang seharusnya (tunai)', rp(setoran.uang_seharusnya))}
          {setoran.uang_bon > 0 && baris('Penjualan bon', rp(setoran.uang_bon))}
          {baris('Selisih uang', selUang === 0 ? 'Rp0 ✓' : `${selUang < 0 ? '−' : '+'}${rp(Math.abs(selUang))}`, selUang < 0)}
        </tbody></table></div>
        {(selUang < 0 || selGalon !== 0) && <div className="banner warn"><Ikon n="awas" s={22} /><span>Selisih ini akan muncul di Radar bos.</span></div>}
        <KotakGalat galat={galat} />
        <button className="btn btn-primary btn-lg btn-block" onClick={submit} disabled={kirim || antrean.antrean.length > 0}>{kirim ? 'Mengirim…' : 'Kirim setoran ke bos'}</button>
      </div>
    </>
  );
}
