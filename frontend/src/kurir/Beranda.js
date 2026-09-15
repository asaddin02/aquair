import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { penyimpanan } from '../api';
import { jam, rp } from '../format';
import Ikon from '../komponen/Ikon';
import { ChipStatus, KartuPasang, KotakGalat, Memuat, useToast } from '../komponen/umum';
import { useSesi } from '../Sesi';
import { useKurir } from './KurirApp';

export default function Beranda() {
  const { beranda, antrean } = useKurir();
  const { sesi, keluar, mulaiDemo } = useSesi();
  const pergi = useNavigate();
  const toast = useToast();
  const [tutupPasang, setTutupPasang] = useState(() => !!penyimpanan.baca('aquair.pasang.tutup'));
  const { data, galat, memuat, muatUlang } = beranda;

  if (memuat && !data) return <Memuat />;
  if (galat && !data) return <div className="k-body"><KotakGalat galat={galat} onUlang={muatUlang} /></div>;

  const { rit, penjualan, setoran, kurir, depot, pengajuan_menunggu: menunggu } = data;
  const aktif = rit?.status === 'aktif';
  const galonAntre = antrean.antrean.reduce((a, x) => a + x.body.galon_isi, 0);
  const diajukan = new Set(menunggu.map((m) => m.sale_id));
  const daftar = [...antrean.antrean.map((x) => ({ antre: true, ...x })).reverse(), ...[...penjualan].reverse()];

  const aturUlang = async () => {
    await mulaiDemo('kurir', { baru: true });
    await muatUlang();
    toast('Depot contoh baru sudah siap');
  };

  return (
    <>
      <div className="k-top">
        <div className="grow"><h2>Halo, {kurir.nama}</h2><p className="small muted">{depot.nama}{rit ? ` · berangkat ${jam(rit.berangkat_at)}` : ''}</p></div>
        {!sesi.demo && <button className="btn btn-ghost" onClick={keluar} aria-label="Keluar"><Ikon n="keluar" s={20} />Keluar</button>}
      </div>
      <div className="k-body">
        {!tutupPasang && <KartuPasang onTutup={() => { penyimpanan.tulis('aquair.pasang.tutup', true); setTutupPasang(true); }} />}
        {antrean.antrean.length > 0 && (
          <div className="banner warn" role="status"><Ikon n="sinyal" s={22} />
            <div className="stack grow" style={{ '--gap': '8px' }}>
              <span><b>Menunggu sinyal ({antrean.antrean.length})</b> — dikirim otomatis saat sinyal kembali.</span>
              <button className="btn" style={{ alignSelf: 'start' }} onClick={antrean.kirimSekarang}>Kirim sekarang</button>
            </div>
          </div>
        )}
        <KotakGalat galat={galat} onUlang={muatUlang} />

        {!rit && (
          <div className="stack">
            <p>Belum ada rit hari ini. Hitung galon isi di motor, lalu mulai rit.</p>
            <Link className="btn btn-primary btn-lg btn-block" to="/kurir/mulai">Mulai rit</Link>
          </div>
        )}

        {rit && (
          <div className="card">
            <div className="k-load">
              <div><div className="eyebrow">Di motor</div><div className="big num">{setoran.galon_di_motor - galonAntre}</div><div className="small muted">galon isi</div></div>
              <div><div className="eyebrow">Terjual</div><div className="big num">{setoran.galon_catatan + galonAntre}</div><div className="small muted">dari {rit.dibawa} galon</div></div>
            </div>
            <div style={{ marginTop: 10 }}>
              {rit.muatan_dicek ? <span className="chip ok"><Ikon n="cek" s={14} />Muatan dicek bos</span> : <span className="chip warn"><Ikon n="awas" s={14} />Muatan belum dicek bos</span>}
            </div>
          </div>
        )}

        {rit && !aktif && (
          <>
            <div className="hasil info"><div className="judul">Rit selesai</div>
              <p>Setoran {rp(rit.uang_disetor)} {rit.status === 'diterima' ? 'sudah diterima bos.' : 'menunggu dihitung ulang bos.'}</p></div>
            <Link className="btn btn-lg btn-block" to="/kurir/mulai">Mulai rit baru</Link>
            {sesi.demo && <button className="btn btn-ghost btn-block" onClick={aturUlang}>Atur ulang data demo</button>}
          </>
        )}

        {aktif && (
          <>
            <button className="btn btn-primary btn-kurir" onClick={() => pergi('/kurir/toko')}><Ikon n="qr" s={38} /><span>JUAL KE TOKO<small>{depot.is_demo ? 'Simulasi scan stiker QR toko' : 'Scan stiker QR di dalam toko'}</small></span></button>
            <button className="btn btn-kurir rumah" onClick={() => pergi('/kurir/rumah')}><Ikon n="rumah" s={38} /><span>JUAL KE RUMAH<small>Pilih pembeli</small></span></button>
          </>
        )}

        {rit && (
          <div>
            <div className="row between"><h3 style={{ fontSize: 17 }}>Penjualan rit ini</h3><span className="small muted">{daftar.length} catatan</span></div>
            {daftar.length === 0 && <p className="muted small" style={{ padding: '10px 0' }}>Belum ada penjualan.</p>}
            {daftar.map((x) => x.antre ? (
              <div className="k-sale" key={x.body.client_id}>
                <div><b>{x.label?.nama}</b><div className="t">{x.body.galon_isi} galon · {x.galat ? <span className="danger-t">{x.galat}</span> : 'belum terkirim'}</div></div>
                <div style={{ textAlign: 'right' }}><span className="chip warn"><Ikon n="sinyal" s={14} />Menunggu sinyal</span>
                  {x.galat && <div><button className="btn btn-ghost small" onClick={() => antrean.buang(x.body.client_id)}>Hapus dari antrean</button></div>}</div>
              </div>
            ) : (
              <div className="k-sale" key={x.id}>
                <div><b>{x.nama_pelanggan}</b>
                  <div className="t">{jam(x.urutan_at || x.created_at)} · {x.galon_isi} galon × {rp(x.harga_berlaku)}{x.bayar === 'bon' ? ' · bon' : ''}{x.dicatat_offline ? ' · dicatat tanpa sinyal' : ''}</div></div>
                <div style={{ textAlign: 'right' }}>
                  <ChipStatus status={x.status_verifikasi} disetujui={x.disetujui_bos} />
                  <div>{diajukan.has(x.id) ? <span className="small muted">Menunggu keputusan bos</span>
                    : <Link className="btn btn-ghost small" style={{ minHeight: 30, padding: '2px 6px' }} to={`/kurir/koreksi/${x.id}`}>Ajukan koreksi</Link>}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {aktif && <Link className="btn btn-lg btn-block" to="/kurir/selesai">Selesai rit & setor</Link>}
        {sesi.demo && <p className="small muted">Depot contoh tidak memakai kamera dan lokasi asli HP. Semua lokasi disimulasikan.</p>}
      </div>
    </>
  );
}
