import { useEffect, useState } from 'react';
import { api } from '../api';
import { tglTahun } from '../format';
import Ikon from '../komponen/Ikon';
import { Chip, KotakGalat, Memuat, Toggle, useData, useToast } from '../komponen/umum';
import { Catatan, Ringkasan } from '../komponen/Ruang';
import { Halaman } from './umumBos';

function ChipSisa({ hari }) {
  if (hari == null) return <Chip jenis="line">Belum diisi</Chip>;
  if (hari < 0) return <Chip jenis="danger" ikon="awas">Lewat {-hari} hari</Chip>;
  if (hari <= 30) return <Chip jenis="warn" ikon="awas">{hari} hari lagi</Chip>;
  return <Chip jenis="ok" ikon="cek">{hari} hari lagi</Chip>;
}

export default function Kepatuhan() {
  const toast = useToast();
  const { data, galat, memuat, muatUlang } = useData(() => api('/bos/kepatuhan'), []);
  const [draf, setDraf] = useState(null);
  const [kirim, setKirim] = useState(false);
  const [galatSimpan, setGalatSimpan] = useState(null);
  useEffect(() => { if (data) setDraf({ ...data, periksa: data.periksa.map((p) => ({ ...p })) }); }, [data]);

  if (memuat && !data) return <Halaman judul="Kepatuhan"><Memuat /></Halaman>;
  if (!data || !draf) return <Halaman judul="Kepatuhan"><KotakGalat galat={galat} onUlang={muatUlang} /></Halaman>;

  const ubah = (k) => (e) => setDraf({ ...draf, [k]: e.target.value });
  const simpan = async () => {
    setKirim(true);
    setGalatSimpan(null);
    try {
      await api('/bos/kepatuhan', { method: 'PUT', body: {
        uji_lab_terakhir: draf.uji_lab_terakhir || null, uji_lab_interval_hari: Number(draf.uji_lab_interval_hari) || 180,
        slhs_berlaku_sampai: draf.slhs_berlaku_sampai || null, nib: draf.nib || '', periksa: draf.periksa.map(({ kode, ok }) => ({ kode, ok })),
      } });
      await muatUlang({ diam: true });
      toast('Data kepatuhan disimpan');
    } catch (e) {
      setGalatSimpan(e);
    } finally {
      setKirim(false);
    }
  };

  return (
    <Halaman judul="Kepatuhan" kanan={<button className="btn btn-primary" onClick={simpan} disabled={kirim}>{kirim ? 'Menyimpan…' : 'Simpan'}</button>}>
      <Ringkasan items={[{ label: 'Daftar periksa sesuai', nilai: `${draf.periksa.filter((c) => c.ok).length} / ${draf.periksa.length}`, ikon: 'cek' }, { label: 'Jadwal uji berikutnya', nilai: tglTahun(data.uji_lab_berikutnya), ikon: 'lab' }, { label: 'Masa berlaku SLHS', nilai: tglTahun(draf.slhs_berlaku_sampai), ikon: 'perisai' }]} />
      <KotakGalat galat={galatSimpan} />
      <div className="work-split"><div className="work-primary">
      <div className="compliance-documents">
        <article className="card stack document-card">
          <div className="row between"><div className="row" style={{ '--gap': '8px' }}><Ikon n="lab" s={20} /><b style={{ fontSize: 16 }}>Uji lab kualitas air</b></div><ChipSisa hari={data.uji_lab_sisa_hari} /></div>
          <div className="form-grid">
            <label className="field" htmlFor="kp-uji"><span>Uji terakhir</span><input id="kp-uji" type="date" className="input" value={draf.uji_lab_terakhir || ''} onChange={ubah('uji_lab_terakhir')} /></label>
            <label className="field" htmlFor="kp-interval"><span>Uji setiap</span><div className="input-unit"><input id="kp-interval" inputMode="numeric" value={draf.uji_lab_interval_hari} onChange={ubah('uji_lab_interval_hari')} /><span>hari</span></div></label>
          </div>
          <p className="small muted">Uji berikutnya: <b>{tglTahun(data.uji_lab_berikutnya)}</b>. Isi interval sesuai ketentuan dinas kesehatan setempat.</p>
        </article>
        <article className="card stack document-card">
          <div className="row between"><div className="row" style={{ '--gap': '8px' }}><Ikon n="perisai" s={20} /><b style={{ fontSize: 16 }}>Sertifikat laik higiene (SLHS)</b></div><ChipSisa hari={data.slhs_sisa_hari} /></div>
          <div className="form-grid">
            <label className="field" htmlFor="kp-slhs"><span>Berlaku sampai</span><input id="kp-slhs" type="date" className="input" value={draf.slhs_berlaku_sampai || ''} onChange={ubah('slhs_berlaku_sampai')} /></label>
            <label className="field" htmlFor="kp-nib"><span>NIB</span><input id="kp-nib" className="input mono" value={draf.nib} onChange={ubah('nib')} /></label>
          </div>
          <p className="small muted">Urus perpanjangan sebelum masa berlaku habis. Pengingat muncul di dasbor 30 hari sebelumnya.</p>
        </article>
      </div>
      <section className="card">
        <div className="sec-head"><h3>Daftar periksa aturan Kemendag 2026</h3><span className="small muted">galon dan tutup bermerek</span></div>
        <ul className="list" style={{ marginTop: 6 }}>{draf.periksa.map((c, i) => (
          <li key={c.kode}>
            <Toggle nyala={c.ok} label={c.teks} onUbah={(v) => setDraf({ ...draf, periksa: draf.periksa.map((x, j) => (j === i ? { ...x, ok: v } : x)) })} />
            <span className="grow">{c.teks}</span>
            {c.ok ? <Chip jenis="ok" ikon="cek">Sesuai</Chip> : <Chip jenis="danger" ikon="awas">Perlu tindakan</Chip>}
          </li>
        ))}</ul>
      </section>
      </div><div className="work-aside"><Catatan ikon="lab" judul="Catatan kualitas air">Simpan tanggal uji terakhir dan interval yang sesuai ketentuan dinas kesehatan setempat. Jadwal berikutnya dihitung dari catatan Anda.</Catatan><Catatan ikon="perisai" judul="Siapkan perpanjangan lebih awal">Pengingat SLHS muncul di dasbor 30 hari sebelum masa berlaku berakhir.</Catatan><button className="btn btn-primary btn-block" onClick={simpan} disabled={kirim}>{kirim ? 'Menyimpan…' : 'Simpan perubahan'}</button></div></div>
    </Halaman>
  );
}
