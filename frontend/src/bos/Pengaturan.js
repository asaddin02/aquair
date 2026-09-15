import { useEffect, useState } from 'react';
import { api } from '../api';
import { rp } from '../format';
import Ikon from '../komponen/Ikon';
import { KartuPasang, KotakGalat, Memuat, Toggle, useData, useToast } from '../komponen/umum';
import { useSesi } from '../Sesi';
import { Halaman } from './umumBos';

export default function Pengaturan() {
  const toast = useToast();
  const { sesi, keluar, mulaiDemo } = useSesi();
  const { data, galat, memuat, muatUlang } = useData(() => api('/bos/pengaturan'), []);
  const [draf, setDraf] = useState(null);
  const [kirim, setKirim] = useState(false);
  const [galatSimpan, setGalatSimpan] = useState(null);
  useEffect(() => { if (data) setDraf(data); }, [data]);

  if (memuat && !data) return <Halaman judul="Pengaturan"><Memuat /></Halaman>;
  if (!data || !draf) return <Halaman judul="Pengaturan"><KotakGalat galat={galat} onUlang={muatUlang} /></Halaman>;

  const angka = (k) => (e) => setDraf({ ...draf, [k]: Number(e.target.value.replace(/\D/g, '')) || 0 });
  const salah = draf.harga_rumah <= draf.harga_toko;
  const berubah = Object.keys(draf).some((k) => draf[k] !== data[k]);

  const simpan = async () => {
    setKirim(true);
    setGalatSimpan(null);
    try {
      const { is_demo: _, ...body } = draf;
      await api('/bos/pengaturan', { method: 'PUT', body });
      await muatUlang({ diam: true });
      toast('Disimpan. Berlaku untuk penjualan berikutnya; Radar 30 hari dihitung ulang.');
    } catch (e) {
      setGalatSimpan(e);
    } finally {
      setKirim(false);
    }
  };

  const baris = (id, label, ket, depan, belakang, k) => (
    <div className="setting"><label htmlFor={id}><b>{label}</b></label><p>{ket}</p>
      <div className="ctrl input-unit">{depan && <span>{depan}</span>}<input id={id} className="num" inputMode="numeric" value={draf[k]} onChange={angka(k)} />{belakang && <span>{belakang}</span>}</div></div>
  );

  return (
    <Halaman judul="Pengaturan">
      <div className="settings-workspace"><nav className="settings-nav" aria-label="Bagian pengaturan"><a href="#set-identitas"><Ikon n="toko" />Identitas depot</a><a href="#set-harga"><Ikon n="uang" />Harga penjualan</a><a href="#set-aturan"><Ikon n="perisai" />Verifikasi & Radar</a><a href="#set-aplikasi"><Ikon n="ponsel" />Aplikasi & akun</a><p>Perubahan berlaku untuk transaksi berikutnya.</p></nav><div className="settings-content">
      <section className="card settings-section" id="set-identitas"><div className="settings-title"><span><Ikon n="toko" s={24} /></span><div><h2>Identitas depot</h2><p>Nama yang muncul pada ruang kerja dan stiker pelanggan.</p></div></div>
        <label className="field" htmlFor="set-nama"><span>Nama depot</span><input id="set-nama" className="input" value={draf.nama} onChange={(e) => setDraf({ ...draf, nama: e.target.value })} /></label>
      </section>
      <section className="card settings-section" id="set-harga"><div className="settings-title"><span><Ikon n="uang" s={24} /></span><div><h2>Harga per galon</h2><p>Atur tarif untuk toko dan pembeli rumah.</p></div></div>
        {baris('set-toko', 'Harga toko', 'Hanya berlaku untuk penjualan toko yang terverifikasi atau disetujui bos.', 'Rp', null, 'harga_toko')}
        {baris('set-rumah', 'Harga rumah', 'Berlaku untuk rumah dan untuk klaim toko tanpa bukti.', 'Rp', null, 'harga_rumah')}
        <div className="setting"><b>Selisih harga</b><p>Dipakai untuk menghitung Tagihan kembali dan Perkiraan bocor.</p>
          <span className="ctrl num" style={{ font: '800 22px/1 var(--f-head)' }}>{salah ? '—' : rp(draf.harga_rumah - draf.harga_toko)}</span></div>
        {salah && <div className="banner danger" role="alert"><Ikon n="awas" s={22} /><span>Harga rumah harus lebih tinggi dari harga toko.</span></div>}
      </section>
      <section className="card settings-section" id="set-aturan"><div className="settings-title"><span><Ikon n="perisai" s={24} /></span><div><h2>Verifikasi dan Radar</h2><p>Tentukan batas lokasi dan pemeriksaan penjualan toko.</p></div></div>
        {baris('set-radius', 'Radius verifikasi', 'Jarak maksimal HP kurir dari titik toko saat scan QR.', null, 'm', 'radius_m')}
        {baris('set-dasar', 'Garis dasar porsi toko', 'Dipakai aturan R1 sampai depot punya 14 hari data toko yang terverifikasi.', null, '%', 'garis_dasar_toko')}
        {baris('set-kosong', 'Nilai galon kosong', 'Dipakai untuk memperkirakan kerugian bila galon kosong yang dibawa pulang lebih sedikit dari catatan (R9). Isi 0 kalau tidak mau dihitung dalam Rupiah.', 'Rp', null, 'nilai_galon_kosong')}
        <div className="setting"><b>Toko tanpa bukti dihitung harga rumah</b>
          <p>{draf.kebijakan_tanpa_bukti ? 'Menyala: klaim toko tanpa QR atau dari lokasi jauh dibayar harga rumah. Rupiahnya masuk Tagihan kembali.' : 'Mati: klaim tanpa bukti tetap dibayar harga toko, dan Rupiahnya pindah ke Perkiraan bocor.'}</p>
          <span className="ctrl"><Toggle nyala={draf.kebijakan_tanpa_bukti} label="Toko tanpa bukti dihitung harga rumah" onUbah={(v) => setDraf({ ...draf, kebijakan_tanpa_bukti: v })} /></span></div>
      </section>
      <section id="set-aplikasi" className="stack"><KartuPasang />
      {sesi.demo ? (
        <section className="card flat stack" style={{ '--gap': '8px' }}><div className="row between"><h3 style={{ fontSize: 16 }}>Depot contoh</h3><span className="chip warn">Data contoh</span></div>
          <p className="small" style={{ color: 'var(--ink-2)' }}>Depot contoh ini milik browser kamu sendiri dan terhapus otomatis 24 jam setelah dibuat.</p>
          <button className="btn" style={{ alignSelf: 'start' }} onClick={async () => { await mulaiDemo('bos', { baru: true }); window.location.assign('/bos'); }}><Ikon n="ulang" s={18} />Atur ulang data demo</button></section>
      ) : <button className="btn" style={{ alignSelf: 'start' }} onClick={keluar}><Ikon n="keluar" s={18} />Keluar</button>}
      </section>
      <KotakGalat galat={galatSimpan} />
      <div className="save-dock"><button className="btn btn-primary" onClick={simpan} disabled={kirim || salah || !berubah}>{kirim ? 'Menyimpan…' : 'Simpan pengaturan'}</button>
        {berubah && <span className="chip warn">Belum disimpan</span>}
        <span className="small muted" style={{ flexBasis: '100%' }}>Perubahan berlaku untuk penjualan berikutnya; penjualan yang sudah tersimpan tetap memakai harganya. Status "Sudah dicek" dan "Terbukti" tidak hilang.</span></div>
      </div></div>
    </Halaman>
  );
}
