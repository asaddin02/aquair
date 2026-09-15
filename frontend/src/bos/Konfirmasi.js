import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { periodeTeks } from '../format';
import Ikon from '../komponen/Ikon';
import { Chip, KotakGalat, Memuat, Modal, useData, useToast } from '../komponen/umum';
import { Cari, Kosong, Ringkasan, TabPilihan } from '../komponen/Ruang';
import { Halaman, tautanWa } from './umumBos';

const LABEL = { belum: ['Belum dikirim', 'line'], menunggu: ['Menunggu jawaban', 'sky'], benar: ['Benar', 'ok'], berbeda: ['Berbeda', 'danger'] };

function Kirim({ hasil, onTutup }) {
  const toast = useToast();
  const tautan = `${window.location.origin}/k/${hasil.token}`;
  const pesan = `Halo ${hasil.nama_toko}, dari ${hasil.nama_depot}. Minggu ${periodeTeks(hasil.periode_mulai, hasil.periode_selesai)} kami mencatat ${hasil.galon_tercatat} galon diantar ke toko Bapak/Ibu. Mohon dibantu cek lewat tautan ini, cukup satu ketukan:\n${tautan}`;
  const wa = !hasil.is_demo && tautanWa(hasil.no_wa, pesan);
  const salin = async () => {
    try { await navigator.clipboard.writeText(pesan); toast('Pesan disalin'); } catch { toast('Tidak bisa menyalin otomatis. Tahan teks untuk menyalin.'); }
  };
  return (
    <Modal judul={hasil.is_demo ? 'Pratinjau pesan WhatsApp' : 'Kirim lewat WhatsApp'} onTutup={onTutup}>
      <p className="small muted" style={{ marginBottom: 12 }}>
        {hasil.is_demo ? 'Depot contoh tidak membuka WhatsApp, karena nomor contoh bisa saja milik orang sungguhan. Coba buka tautannya untuk melihat halaman yang diterima pemilik toko.'
          : 'Tautan ini baru dibuat; tautan sebelumnya untuk toko ini tidak berlaku lagi.'}
      </p>
      <div className="wa-bubble">{pesan}</div>
      <div className="row" style={{ justifyContent: 'flex-end', marginTop: 14 }}>
        <button className="btn" onClick={salin}>Salin pesan</button>
        {hasil.is_demo ? <a className="btn btn-primary" href={`/k/${hasil.token}`} target="_blank" rel="noreferrer">Buka halaman toko</a>
          : wa ? <a className="btn btn-primary" href={wa} target="_blank" rel="noreferrer"><Ikon n="wa" s={18} />Buka WhatsApp</a>
            : <span className="small muted">Nomor WhatsApp toko belum diisi. Salin pesan lalu kirim manual.</span>}
      </div>
    </Modal>
  );
}

export default function Konfirmasi() {
  const [cari, setCari] = useState('');
  const [status, setStatus] = useState('semua');
  const [hasil, setHasil] = useState(null);
  const [galatKirim, setGalatKirim] = useState(null);
  const { data, galat, memuat, muatUlang } = useData(() => api('/bos/konfirmasi'), []);
  const hitung = (s) => (data?.toko || []).filter((t) => t.status === s).length;

  const kirim = async (t) => {
    setGalatKirim(null);
    try {
      setHasil(await api(`/bos/konfirmasi/${t.customer_id}/kirim`, { method: 'POST' }));
      muatUlang({ diam: true });
    } catch (e) {
      setGalatKirim(e);
    }
  };

  return (
    <Halaman judul="Konfirmasi toko">
      <KotakGalat galat={galat || galatKirim} onUlang={galat ? muatUlang : undefined} />
      {memuat && !data ? <Memuat /> : (
        <>
          <div><h3 style={{ fontSize: 17 }}>Minggu {periodeTeks(data.periode_mulai, data.periode_selesai)}</h3>
            <p className="small muted">Pemilik toko menjawab jumlah galon lewat tautan tanpa akun. Jawaban lebih sedikit dari catatan memunculkan tanda R8 di Radar.</p></div>
          <Ringkasan items={['belum', 'menunggu', 'benar', 'berbeda'].map((s) => ({ label: LABEL[s][0], nilai: hitung(s), ket: 'toko', ikon: s === 'benar' ? 'cek' : s === 'berbeda' ? 'awas' : 'wa', warna: s === 'berbeda' ? 'amber' : '' }))} />
          <div className="directory-toolbar"><TabPilihan label="Status konfirmasi" nilai={status} onUbah={setStatus} pilihan={[["semua", 'Semua'], ['belum', 'Belum dikirim'], ['menunggu', 'Menunggu'], ['berbeda', 'Berbeda'], ['benar', 'Sesuai']]} /><Cari value={cari} onChange={setCari} placeholder="Cari toko…" /></div>
          <div className="confirmation-grid">{data.toko.filter((t) => (status === 'semua' || t.status === status) && t.nama.toLowerCase().includes(cari.toLowerCase())).map((t) => <article key={t.customer_id} className={`confirmation-card ${t.status}`}><header><span className="entity-icon"><Ikon n="toko" s={24} /></span><Chip jenis={LABEL[t.status][1]}>{LABEL[t.status][0]}</Chip></header><h3>{t.nama}</h3>{!t.no_wa && !data.is_demo && <p className="muted small">Nomor WhatsApp belum diisi</p>}<div className="confirmation-compare"><div><span>Catatan kurir</span><strong>{t.galon_tercatat}<small> galon</small></strong></div><Ikon n="ulang" s={20} /><div><span>Jawaban toko</span><strong>{t.galon_menurut_toko ?? '—'}<small>{t.galon_menurut_toko != null ? ' galon' : ''}</small></strong></div></div>{t.status === 'berbeda' && <p className="danger-t">Selisih {t.galon_menurut_toko - t.galon_tercatat > 0 ? '+' : '−'}{Math.abs(t.galon_menurut_toko - t.galon_tercatat)} galon</p>}<footer>{t.status === 'berbeda' ? <Link className="btn btn-block" to="/bos/radar">Lihat R8 di Radar<Ikon n="panah" s={17} /></Link> : t.status === 'benar' ? <span className="confirmed-label"><Ikon n="cek" s={18} />Catatan sudah sesuai</span> : t.galon_tercatat === 0 ? <span className="muted">Tidak ada antaran pada periode ini</span> : <button className="btn btn-block" onClick={() => kirim(t)}><Ikon n="wa" s={18} />{t.status === 'belum' ? 'Kirim lewat WhatsApp' : 'Kirim ulang'}</button>}</footer></article>)}</div>
          {!data.toko.some((t) => (status === 'semua' || t.status === status) && t.nama.toLowerCase().includes(cari.toLowerCase())) && <Kosong ikon="wa" judul="Tidak ada toko pada pilihan ini">Ubah filter atau nama yang dicari.</Kosong>}
        </>
      )}
      {hasil && <Kirim hasil={hasil} onTutup={() => setHasil(null)} />}
    </Halaman>
  );
}
