import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../api';
import { rp, tglPanjang } from '../format';
import { Chip, ChipRisiko, KotakGalat } from '../komponen/umum';

export const KonteksBos = createContext(null);
export const useBos = () => useContext(KonteksBos);

export function Halaman({ judul, kanan, children }) {
  useEffect(() => { document.title = `${judul} · AQUAIR`; }, [judul]);
  return (
    <div className="app-main">
      <div className="app-top no-print"><h2>{judul}</h2>{kanan && <div className="row" style={{ '--gap': '8px' }}>{kanan}</div>}</div>
      <div className="app-body">{children}</div>
    </div>
  );
}

export const warnaKurir = (k) => (k?.warna === 'rudi' ? 'var(--s-rudi)' : k?.warna === 'dimas' ? 'var(--s-dimas)' : 'var(--ink-3)');

export function Avatar({ kurir }) {
  return <span className="avatar" style={{ background: warnaKurir(kurir) }} aria-hidden="true">{(kurir?.nama || '?')[0]}</span>;
}

export function nomorWa(noHp) {
  const angka = (noHp || '').replace(/\D/g, '');
  if (!angka) return null;
  return angka.startsWith('0') ? `62${angka.slice(1)}` : angka;
}

export const tautanWa = (noHp, pesan) => (nomorWa(noHp) ? `https://wa.me/${nomorWa(noHp)}?text=${encodeURIComponent(pesan)}` : null);

const STATUS_GRUP = {
  sudah_dicek_aman: <Chip jenis="ok" ikon="cek">Sudah dicek — aman</Chip>,
  terbukti: <Chip jenis="danger">Terbukti</Chip>,
  baru: <Chip jenis="line">Baru</Chip>,
};

// Satu kelompok tanda Radar: satu kurir, satu hari (spesifikasi 5).
export function GrupRadar({ grup, onBerubah, aksiTambahan }) {
  const [galat, setGalat] = useState(null);
  const [kirim, setKirim] = useState(false);
  const tandai = async (status) => {
    setKirim(true);
    setGalat(null);
    try {
      await api('/bos/radar/status', { method: 'POST', body: { kurir_id: grup.kurir.id, tanggal: grup.tanggal, status } });
      await onBerubah?.();
    } catch (e) {
      setGalat(e);
    } finally {
      setKirim(false);
    }
  };
  const aman = grup.status === 'sudah_dicek_aman';
  return (
    <article className={`flag-group ${aman ? '' : grup.risiko}`}>
      <header>
        <Avatar kurir={grup.kurir} />
        <b>{grup.kurir.nama} — {tglPanjang(grup.tanggal)}</b>
        {!aman && <ChipRisiko risiko={grup.risiko} />}
        {STATUS_GRUP[grup.status]}
      </header>
      {grup.tanda.map((f) => (
        <div className="flag-row" key={f.id}>
          <span className="code">{f.kode}</span>
          <span>{f.penjelasan}{f.status === 'sudah_dicek_aman' && !aman && <span className="small muted"> · sudah dicek aman</span>}</span>
          <span className="rp">
            {f.perkiraan_rupiah == null ? <small>{f.kode === 'R4' ? 'termasuk R2' : 'sinyal saja'}</small>
              : f.perkiraan_rupiah === 0 ? <>Rp0<small>sinyal saja</small></>
                : <>{rp(f.perkiraan_rupiah)}<small>{f.masuk_ke === 'tagihan_kembali' ? 'Tagihan kembali' : 'Perkiraan bocor'}</small></>}
          </span>
        </div>
      ))}
      <footer>
        <span className="small">Tagihan kembali <b className="num">{rp(grup.tagihan_kembali)}</b> · Perkiraan bocor <b className="num">{rp(grup.perkiraan_bocor)}</b></span>
        <span className="row" style={{ '--gap': '8px' }}>
          {aksiTambahan}
          <button className="btn" onClick={() => tandai(aman ? 'baru' : 'sudah_dicek_aman')} disabled={kirim}>{aman ? 'Buka lagi' : 'Sudah dicek — aman'}</button>
          {grup.status !== 'terbukti' && <button className="btn btn-danger" onClick={() => tandai('terbukti')} disabled={kirim}>Terbukti</button>}
        </span>
      </footer>
      {galat && <div style={{ padding: '0 16px 12px' }}><KotakGalat galat={galat} /></div>}
    </article>
  );
}
