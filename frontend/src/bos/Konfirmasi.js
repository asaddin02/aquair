import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { periodeTeks } from '../format';
import Ikon from '../komponen/Ikon';
import { Chip, KotakGalat, Memuat, Modal, useData, useToast } from '../komponen/umum';
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
          <div className="grid-4">{['belum', 'menunggu', 'benar', 'berbeda'].map((s) => (
            <div className="card mini" key={s}><span className="ket">{LABEL[s][0]}</span><span className="angka" style={s === 'berbeda' && hitung(s) ? { color: 'var(--danger-text)' } : undefined}>{hitung(s)} toko</span></div>
          ))}</div>
          <div className="table-wrap"><table>
            <thead><tr><th>Toko</th><th className="r">Tercatat</th><th>Status</th><th className="r">Menurut toko</th><th /></tr></thead>
            <tbody>{data.toko.map((t) => (
              <tr key={t.customer_id}>
                <td><b>{t.nama}</b>{!t.no_wa && !data.is_demo && <div className="small muted">WA belum diisi</div>}</td>
                <td className="r num">{t.galon_tercatat} galon</td>
                <td><Chip jenis={LABEL[t.status][1]}>{LABEL[t.status][0]}</Chip></td>
                <td className="r num">{t.galon_menurut_toko == null ? '—' : <>{t.galon_menurut_toko} galon{t.status === 'berbeda' && <span className="danger-t"> ({t.galon_menurut_toko - t.galon_tercatat > 0 ? '+' : '−'}{Math.abs(t.galon_menurut_toko - t.galon_tercatat)})</span>}</>}</td>
                <td className="r">{t.status === 'berbeda' ? <Link className="btn btn-ghost" to="/bos/radar">Lihat R8 di Radar</Link>
                  : t.status === 'benar' ? null : t.galon_tercatat === 0 ? <span className="small muted">Tidak ada antaran</span>
                    : <button className="btn" onClick={() => kirim(t)}><Ikon n="wa" s={16} />{t.status === 'belum' ? 'Kirim lewat WhatsApp' : 'Kirim ulang'}</button>}</td>
              </tr>
            ))}</tbody>
          </table></div>
        </>
      )}
      {hasil && <Kirim hasil={hasil} onTutup={() => setHasil(null)} />}
    </Halaman>
  );
}
