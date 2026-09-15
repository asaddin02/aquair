import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { idUnik } from '../api';
import Ikon from '../komponen/Ikon';
import { KotakGalat, Stepper, useToast } from '../komponen/umum';
import { useSesi } from '../Sesi';
import { simpanPenjualan, tambahKeAntrean } from './antrean';
import { useKurir } from './KurirApp';

// Formulir galon + cara bayar yang dipakai jual ke toko dan jual ke rumah.
// Gagal karena sinyal tidak pernah tampak tersimpan: kurir memilih coba lagi atau simpan di HP.
export default function FormPenjualan({ bodyDasar, namaPelanggan, bolehBon, alasanBon, galonAwal = 2, sebelumSimpan }) {
  const { beranda, antrean } = useKurir();
  const { sesi } = useSesi();
  const pergi = useNavigate();
  const toast = useToast();
  const [isi, setIsi] = useState(galonAwal);
  const [kosong, setKosong] = useState(galonAwal);
  const [kosongDiubah, setKosongDiubah] = useState(false);
  const [bayar, setBayar] = useState('tunai');
  const [kirim, setKirim] = useState(false);
  const [galat, setGalat] = useState(null);
  const clientId = useRef(idUnik());

  const body = () => ({ ...bodyDasar(), client_id: clientId.current, galon_isi: isi, galon_kosong: kosong, bayar });

  const simpan = async () => {
    const cegah = sebelumSimpan?.();
    if (cegah) return setGalat({ message: cegah });
    setKirim(true);
    setGalat(null);
    try {
      const r = await simpanPenjualan(body());
      beranda.muatUlang({ diam: true });
      pergi('/kurir/hasil', { state: { penjualan: r.penjualan } });
    } catch (e) {
      setGalat(e);
      setKirim(false);
    }
  };

  const antrekan = () => {
    tambahKeAntrean(sesi.depot.id, body(), { nama: namaPelanggan });
    antrean.muatUlang();
    toast('Disimpan di HP — dikirim otomatis saat sinyal kembali');
    pergi('/kurir');
  };

  return (
    <>
      <Stepper label="Galon isi diserahkan" nilai={isi} min={1} max={200} onUbah={(v) => { setIsi(v); if (!kosongDiubah) setKosong(v); }} />
      <Stepper label="Galon kosong diambil" nilai={kosong} min={0} max={200} onUbah={(v) => { setKosong(v); setKosongDiubah(true); }} />
      <div className="field"><span>Bayar</span>
        <div className="grid-2" style={{ gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <button type="button" className="choice" style={{ gridTemplateColumns: '1fr' }} aria-pressed={bayar === 'tunai'} onClick={() => setBayar('tunai')}><b>Tunai</b></button>
          <button type="button" className="choice" style={{ gridTemplateColumns: '1fr' }} aria-pressed={bayar === 'bon'} onClick={() => setBayar('bon')} disabled={!bolehBon}><b>Bon</b></button>
        </div>
        {!bolehBon && <span className="hint">{alasanBon || 'Bon belum diizinkan bos untuk pelanggan ini.'}</span>}
      </div>
      {galat?.jaringan ? (
        <div className="banner danger" role="alert"><Ikon n="sinyal" s={22} />
          <div className="stack" style={{ '--gap': '8px' }}><b>Belum tersimpan — tidak ada sinyal</b>
            <div className="row" style={{ '--gap': '8px' }}>
              <button className="btn" onClick={simpan}>Coba lagi</button>
              <button className="btn" onClick={antrekan}>Simpan di HP, kirim nanti</button>
            </div>
          </div>
        </div>
      ) : <KotakGalat galat={galat} />}
      <button className="btn btn-primary btn-lg btn-block" onClick={simpan} disabled={kirim}>{kirim ? 'Menyimpan…' : 'Simpan penjualan'}</button>
    </>
  );
}
