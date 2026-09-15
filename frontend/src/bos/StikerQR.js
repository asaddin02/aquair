import QRCode from 'qrcode';
import { useEffect, useState } from 'react';
import { api } from '../api';
import Ikon, { Logo } from '../komponen/Ikon';
import { KotakGalat, Memuat, Modal, useData, useToast } from '../komponen/umum';
import { Cari, Kosong, Ringkasan } from '../komponen/Ruang';
import { Halaman } from './umumBos';

function Stiker({ toko, namaDepot, onGanti }) {
  const [gambar, setGambar] = useState(null);
  useEffect(() => {
    QRCode.toDataURL(`aquair:${toko.qr_token}`, { margin: 1, width: 320, errorCorrectionLevel: 'M', color: { dark: '#0F2524', light: '#FFFFFF' } }).then(setGambar);
  }, [toko.qr_token]);
  return (
    <div className="sticker">
      <div className="sticker-brand"><Logo s={25} /><span>AQUAIR<small>{namaDepot}</small></span></div>
      {gambar ? <img src={gambar} alt={`Kode QR ${toko.nama}`} width="150" height="150" /> : <div style={{ width: 150, height: 150 }} />}
      <b>{toko.nama}</b>
      <span className="sticker-instruction">Scan di lokasi toko<br /><small>Tempel di dalam toko · jaga tetap terbaca</small></span>
      {!toko.punya_titik && <span className="chip warn no-print">Titik lokasi belum diisi</span>}
      <button className="btn no-print" style={{ minHeight: 34, background: '#fff', color: '#0F2524', borderColor: '#B9CBC9' }} onClick={() => onGanti(toko)}><Ikon n="ulang" s={16} />Ganti QR</button>
    </div>
  );
}

export default function StikerQR() {
  const toast = useToast();
  const [cari, setCari] = useState('');
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
    <Halaman judul="Stiker QR" kanan={<button className="btn btn-primary" onClick={() => window.print()} disabled={!data?.toko.filter((t) => t.nama.toLowerCase().includes(cari.toLowerCase())).length}><Ikon n="cetak" s={18} />Cetak A4</button>}>
      <div className="no-print"><Ringkasan items={[{ label: 'Stiker toko', nilai: data?.toko.length, ikon: 'qr' }, { label: 'Lokasi terdaftar', nilai: data?.toko.filter((t) => t.punya_titik).length, ikon: 'lokasi' }, { label: 'Lokasi belum diisi', nilai: data?.toko.filter((t) => !t.punya_titik).length, ikon: 'awas', warna: 'amber' }]} /></div>
      <div className="print-guide no-print"><div><span>01</span><b>Cetak stiker</b><p>Gunakan kertas A4, tiga kolom.</p></div><div><span>02</span><b>Tempel di dalam toko</b><p>Lapisi selotip bening supaya tahan air.</p></div><div><span>03</span><b>Siap diverifikasi</b><p>QR dan lokasi diperiksa saat penjualan.</p></div></div>
      <div className="directory-toolbar no-print"><h2 className="section-title">Galeri stiker toko</h2><Cari value={cari} onChange={setCari} placeholder="Cari stiker toko…" /></div>
      <KotakGalat galat={galat} onUlang={muatUlang} />
      {memuat && !data ? <Memuat /> : (data?.toko || []).length === 0 ? <div className="card no-print">Belum ada toko. Tambahkan toko di menu Pelanggan.</div> : (
        <>
          <p className="small muted no-print">{data.toko.filter((t) => t.nama.toLowerCase().includes(cari.toLowerCase())).length} stiker ditampilkan. Cetak A4 mencetak semua stiker yang sesuai pencarian.</p>
          {!data.toko.some((t) => t.nama.toLowerCase().includes(cari.toLowerCase())) && <Kosong ikon="qr" judul="Stiker tidak ditemukan">Coba nama toko lain.</Kosong>}
          <div className="qr-sheet">{data.toko.filter((t) => t.nama.toLowerCase().includes(cari.toLowerCase())).map((t) => <Stiker key={t.id} toko={t} namaDepot={data.nama_depot} onGanti={setGanti} />)}</div>
        </>
      )}
      <div className="inline-explainer no-print"><Ikon n="kunci" /><p>Jika stiker dicopot atau perlu diganti, gunakan Ganti QR. Stiker lama langsung tidak berlaku; cetak dan tempel stiker barunya.</p></div>
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
