import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { penyimpanan } from '../api';
import { jam, rp } from '../format';
import Ikon from '../komponen/Ikon';
import { KartuPasang, KotakGalat, Memuat, useToast } from '../komponen/umum';
import { useSesi } from '../Sesi';
import { galonUtama } from './antrean';
import { useKurir } from './KurirApp';
import { DaftarPenjualan } from './Riwayat';

export default function Beranda() {
  const { beranda, antrean } = useKurir();
  const { sesi, keluar, mulaiDemo } = useSesi();
  const pergi = useNavigate();
  const toast = useToast();
  const [tutupPasang, setTutupPasang] = useState(() => !!penyimpanan.baca('aquair.pasang.tutup'));
  const { data, galat, memuat, muatUlang } = beranda;

  if (memuat && !data) return <Memuat />;
  if (galat && !data) return <div className="k-body"><KotakGalat galat={galat} onUlang={muatUlang} /></div>;

  const { rit, penjualan, setoran, kurir, depot } = data;
  const aktif = rit?.status === 'aktif';
  const galonAntre = antrean.antrean.reduce((a, x) => a + galonUtama(x.body), 0);
  const perluDitutup = data.rit_perlu_ditutup;
  const produkLain = (setoran?.produk_lain || []).filter((p) => p.dibawa != null);
  const terjual = (setoran?.galon_catatan || 0) + galonAntre;
  const sisa = (setoran?.galon_di_motor || 0) - galonAntre;
  const persen = rit ? Math.max(0, Math.min(100, terjual / rit.dibawa * 100)) : 0;

  const aturUlang = async () => {
    await mulaiDemo('kurir', { baru: true });
    await muatUlang();
    toast('Depot contoh baru sudah siap');
  };

  return (
    <>
      <div className="k-top courier-greeting">
        <div className="grow"><span className="eyebrow">SELAMAT BERTUGAS</span><h2>Halo, {kurir.nama}<span className="greeting-dot">.</span></h2><p className="small muted">{depot.nama}{rit ? ` · berangkat ${jam(rit.berangkat_at)}` : ''}</p></div>
        {!sesi.demo && <button className="btn btn-ghost" onClick={keluar} aria-label="Keluar"><Ikon n="keluar" s={20} />Keluar</button>}
      </div>
      <div className="k-body">
        {antrean.antrean.length > 0 && (
          <div className="banner warn" role="status"><Ikon n="sinyal" s={22} />
            <div className="stack grow" style={{ '--gap': '8px' }}>
              <span><b>Menunggu sinyal ({antrean.antrean.length})</b> — dikirim otomatis saat sinyal kembali.</span>
              <button className="btn" style={{ alignSelf: 'start' }} onClick={antrean.kirimSekarang}>Kirim sekarang</button>
            </div>
          </div>
        )}
        <KotakGalat galat={galat} onUlang={muatUlang} />
        {perluDitutup && (
          <div className="banner danger" role="alert"><Ikon n="awas" s={22} />
            <div className="stack grow" style={{ '--gap': '8px' }}>
              <span><b>Rit kemarin belum ditutup.</b> Selesaikan rit & setor dulu sebelum mencatat penjualan baru.</span>
              <Link className="btn" style={{ alignSelf: 'start' }} to="/kurir/selesai">Selesai rit & setor</Link>
            </div>
          </div>
        )}

        {!rit && <div className="start-trip-card"><span className="start-trip-icon"><Ikon n="rit" s={40} /></span><span className="eyebrow">SIAP BERANGKAT?</span><h2>Hari baru.<br />Pengantaran baru.</h2><p>Hitung galon isi di motor. Semua catatan perjalanan dimulai dari sini.</p><Link className="btn btn-primary btn-lg btn-block" to="/kurir/mulai">Mulai rit<Ikon n="panah" s={20} /></Link></div>}

        {rit && <section className="cargo-dashboard" aria-label="Ringkasan muatan"><div className="cargo-header"><span><Ikon n="rit" s={18} />Muatan hari ini</span><span className="cargo-status"><span className="status-dot" />{aktif ? 'Rit aktif' : 'Rit selesai'}</span></div><div className="cargo-center"><div><span>Sisa di motor</span><strong className="num">{sisa}<small>galon isi</small></strong></div><div className="cargo-ring" style={{ '--progress': `${persen}%` }}><div><b className="num">{terjual}</b><span>terjual</span></div></div></div><div className="cargo-bottom"><span>Dari <b>{rit.dibawa} galon</b> yang dibawa</span><span><Ikon n={rit.muatan_dicek ? 'cek' : 'awas'} s={15} />{rit.muatan_dicek ? 'Dicek bos' : 'Belum dicek bos'}</span></div>{produkLain.length > 0 && <div className="cargo-extra">{produkLain.map((p) => <span key={p.produk_id}>{p.nama}: sisa {p.di_motor} {p.satuan}</span>)}</div>}</section>}

        {rit && !aktif && (
          <>
            <div className="hasil info"><div className="judul">Rit selesai</div>
              <p>Setoran {rp(rit.uang_disetor)} {rit.status === 'diterima' ? 'sudah diterima bos.' : 'menunggu dihitung ulang bos.'}</p></div>
            <Link className="btn btn-lg btn-block" to="/kurir/mulai">Mulai rit baru</Link>
            {sesi.demo && <button className="btn btn-ghost btn-block" onClick={aturUlang}>Atur ulang data demo</button>}
          </>
        )}

        {aktif && !perluDitutup && <section className="sell-section"><div className="mobile-section-head"><h2>Catat pengantaran</h2><span>Pilih tujuan</span></div><div className="sell-actions"><button className="sell-action store" onClick={() => pergi('/kurir/toko')}><span className="sell-action-icon"><Ikon n="qr" s={30} /></span><b>Jual ke toko</b><small>Scan QR toko</small><Ikon n="panah" s={19} /></button><button className="sell-action home" onClick={() => pergi('/kurir/rumah')}><span className="sell-action-icon"><Ikon n="rumah" s={30} /></span><b>Jual ke rumah</b><small>Pilih pelanggan</small><Ikon n="panah" s={19} /></button></div></section>}
        {rit && <><Link to={aktif ? '/kurir/selesai' : '/kurir/riwayat'} className="deposit-preview"><span className="deposit-icon"><Ikon n="uang" s={23} /></span><div><span>Tunai yang perlu disetor</span><strong className="num">{rp(setoran.uang_seharusnya)}</strong>{galonAntre > 0 && <small>Belum termasuk antrean offline</small>}</div><Ikon n="kanan" s={21} /></Link><section className="recent-sales"><div className="mobile-section-head"><h2>Penjualan terbaru</h2><Link to="/kurir/riwayat">Lihat semua <span>{penjualan.length + antrean.antrean.length}</span></Link></div><DaftarPenjualan batas={3} /></section></>}
        {aktif && <Link className="btn btn-lg btn-block" to="/kurir/selesai"><Ikon n="cek" s={19} />Selesai rit & setor</Link>}
        {!tutupPasang && <KartuPasang onTutup={() => { penyimpanan.tulis('aquair.pasang.tutup', true); setTutupPasang(true); }} />}
        {sesi.demo && <p className="small muted">Depot contoh tidak memakai kamera dan lokasi asli HP. Semua lokasi disimulasikan.</p>}
      </div>
    </>
  );
}
