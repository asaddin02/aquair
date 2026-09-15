import QRCode from 'qrcode';
import { useEffect, useState } from 'react';
import { api } from '../api';
import Ikon from '../komponen/Ikon';
import { KotakGalat, Memuat, Modal, useData, useToast } from '../komponen/umum';
import { Halaman } from './umumBos';

function Stiker({ toko, namaDepot, onGanti }) {
  const [gambar, setGambar] = useState(null);
  useEffect(() => {
    QRCode.toDataURL(`aquair:${toko.qr_token}`, { margin: 1, width: 320, errorCorrectionLevel: 'M', color: { dark: '#0F2524', light: '#FFFFFF' } }).then(setGambar);
  }, [toko.qr_token]);
  return (
    <div className="sticker">
      <span className="brand-mark">AQUAIR · {namaDepot.toUpperCase()}</span>
      {gambar ? <img src={gambar} alt={`Kode QR ${toko.nama}`} width="150" height="150" /> : <div style={{ width: 150, height: 150 }} />}
      <b>{toko.nama}</b>
      <span style={{ fontSize: 13 }}>Tempel di dalam toko</span>
      {!toko.punya_titik && <span className="chip warn no-print">Titik lokasi belum diisi</span>}
      <button className="btn no-print" style={{ minHeight: 34, background: '#fff', color: '#0F2524', borderColor: '#B9CBC9' }} onClick={() => onGanti(toko)}><Ikon n="ulang" s={16} />Ganti QR</button>
    </div>
  );
}

export default function StikerQR() {
  const toast = useToast();
  const [ganti, setGanti] = useState(null);
  const [galatGanti, setGalatGanti] = useState(null);
  const { data, galat, memuat, muatUlang } = useData(() => api('/bos/qr'), []);

  const konfirmasiGanti = async () => {
    setGalatGanti(null);
    try {
      await api(`/bos/pelanggan/${ganti.id}/ganti-qr`, { method: 'POST' });
      setGanti(null);
      await muatUlang({ diam: true });
      toast(`QR baru untuk ${ganti.nama}. Stiker lama tidak berlaku lagi.`);
    } catch (e) {
      setGalatGanti(e);
    }
  };

  return (
    <Halaman judul="Stiker QR" kanan={<button className="btn btn-primary" onClick={() => window.print()} disabled={!data?.toko.length}><Ikon n="cetak" s={18} />Cetak A4</button>}>
      <div className="banner sky no-print"><Ikon n="kunci" s={22} /><span>Isi QR adalah token acak yang panjang. Token hanya tampil di layar bos; HP kurir tidak pernah menerimanya. Kalau stiker difoto atau dicopot, tekan <b>Ganti QR</b>: token lama langsung tidak berlaku.</span></div>
      <KotakGalat galat={galat} onUlang={muatUlang} />
      {memuat && !data ? <Memuat /> : data.toko.length === 0 ? <div className="card no-print">Belum ada toko. Tambahkan toko di menu Pelanggan.</div> : (
        <>
          <p className="small muted no-print">{data.toko.length} stiker · kertas A4, 3 kolom. Lapisi selotip bening supaya tahan air.</p>
          <div className="qr-sheet">{data.toko.map((t) => <Stiker key={t.id} toko={t} namaDepot={data.nama_depot} onGanti={setGanti} />)}</div>
        </>
      )}
      {ganti && (
        <Modal judul={`Ganti QR ${ganti.nama}?`} onTutup={() => setGanti(null)}>
          <p>Stiker yang sekarang tertempel langsung tidak berlaku. Cetak dan tempel stiker baru di toko ini.</p>
          <KotakGalat galat={galatGanti} />
          <div className="row" style={{ justifyContent: 'flex-end', marginTop: 14 }}><button className="btn" onClick={() => setGanti(null)}>Batal</button>
            <button className="btn btn-danger" onClick={konfirmasiGanti}>Ganti QR</button></div>
        </Modal>
      )}
    </Halaman>
  );
}
