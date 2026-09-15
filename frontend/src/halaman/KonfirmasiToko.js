import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api';
import { periodeTeks, tglPanjang } from '../format';
import Ikon, { Logo } from '../komponen/Ikon';
import { KotakGalat, Memuat, Stepper, useData } from '../komponen/umum';

// Halaman tanpa login untuk pemilik toko (spesifikasi 7). Jawaban hanya bisa dikirim sekali.
export default function KonfirmasiToko() {
  const { token } = useParams();
  const { data, galat, memuat, setData } = useData(() => api(`/publik/konfirmasi/${token}`, { token: '' }), [token]);
  const [ubah, setUbah] = useState(false);
  const [galon, setGalon] = useState(0);
  const [kirim, setKirim] = useState(false);
  const [galatKirim, setGalatKirim] = useState(null);

  const jawab = async (jawaban) => {
    setKirim(true);
    setGalatKirim(null);
    try {
      setData(await api(`/publik/konfirmasi/${token}`, { method: 'POST', body: { jawaban, galon: jawaban === 'berbeda' ? galon : null }, token: '' }));
    } catch (e) {
      setGalatKirim(e);
    } finally {
      setKirim(false);
    }
  };

  let isi;
  if (memuat) isi = <Memuat />;
  else if (galat) isi = <KotakGalat galat={galat} />;
  else if (data.jawaban) {
    isi = (
      <div className={`hasil ${data.jawaban === 'benar' ? 'ok' : 'info'}`} role="status">
        <div className="ikon"><Ikon n="cek" s={30} /></div>
        <div className="judul">Terima kasih</div>
        <p>Jawaban Anda: <b>{data.galon_menurut_toko} galon</b> untuk minggu {periodeTeks(data.periode_mulai, data.periode_selesai)}.</p>
        <p style={{ fontSize: 15 }}>Jawaban sudah diterima {data.nama_depot} dan tidak bisa diubah lewat tautan ini.</p>
      </div>
    );
  } else if (ubah) {
    isi = (
      <>
        <p>Berapa galon yang benar-benar diterima <b>{data.nama_toko}</b> minggu {periodeTeks(data.periode_mulai, data.periode_selesai)}?</p>
        <Stepper label="Galon diterima" nilai={galon} onUbah={setGalon} max={2000} />
        <KotakGalat galat={galatKirim} />
        <button className="btn btn-primary btn-lg btn-block" onClick={() => jawab('berbeda')} disabled={kirim}>Kirim jawaban</button>
        <button className="btn btn-ghost btn-block" onClick={() => setUbah(false)}>Kembali</button>
      </>
    );
  } else {
    isi = (
      <>
        <div className="card" style={{ textAlign: 'center', padding: '22px 16px' }}>
          <p>Minggu {periodeTeks(data.periode_mulai, data.periode_selesai)} tercatat</p>
          <div className="num" style={{ font: '800 52px/1.1 var(--f-head)', letterSpacing: '-.02em', margin: '6px 0' }}>{data.galon_tercatat} galon</div>
          <p>diantar ke <b>{data.nama_toko}</b>.</p>
        </div>
        <p style={{ font: '800 24px/1.2 var(--f-head)', textAlign: 'center' }}>Benar?</p>
        <KotakGalat galat={galatKirim} />
        <button className="btn btn-primary btn-lg btn-block" onClick={() => jawab('benar')} disabled={kirim}><Ikon n="cek" s={22} />Ya, benar</button>
        <button className="btn btn-lg btn-block" onClick={() => { setGalon(Math.max(0, data.galon_tercatat - 1)); setUbah(true); }} disabled={kirim}>Tidak, yang benar … galon</button>
      </>
    );
  }

  return (
    <div className="layar-kurir">
      <div className="k-top">
        <span className="logo" style={{ fontSize: 16 }}><Logo s={24} />{data?.nama_depot || 'AQUAIR'}</span>
        {data?.is_demo && <span className="chip warn" style={{ marginLeft: 'auto' }}>Data contoh</span>}
      </div>
      <div className="k-body">
        {isi}
        {data && <p className="small muted" style={{ marginTop: 'auto' }}>Tautan berlaku sampai {tglPanjang(data.berlaku_sampai)}. Tidak perlu akun. Jawaban hanya bisa dikirim sekali.</p>}
      </div>
    </div>
  );
}
