import { useState } from 'react';
import { api } from '../api';
import { hariIniWib, tglTahun } from '../format';
import { Chip, KotakGalat, Memuat, Modal, useData, useToast } from '../komponen/umum';
import { Halaman } from './umumBos';

function UbahJadwal({ k, onTutup, onSimpan }) {
  const [jeda, setJeda] = useState(String(k.interval_hari));
  const [terakhir, setTerakhir] = useState(k.tanggal_terakhir || '');
  const [galat, setGalat] = useState(null);
  const simpan = async () => {
    try {
      await api(`/bos/perawatan/${k.id}`, { method: 'PUT', body: { interval_hari: Number(jeda), tanggal_terakhir: terakhir || null } });
      onSimpan(`Jadwal ${k.komponen} disimpan`);
    } catch (e) {
      setGalat(e);
    }
  };
  return (
    <Modal judul={`Jadwal ${k.komponen}`} onTutup={onTutup}>
      <div className="stack">
        <label className="field" htmlFor="rw-terakhir"><span>Tanggal ganti terakhir</span>
          <input id="rw-terakhir" type="date" className="input" value={terakhir} max={hariIniWib()} onChange={(e) => setTerakhir(e.target.value)} /></label>
        <label className="field" htmlFor="rw-interval"><span>Ganti setiap</span>
          <div className="input-unit"><input id="rw-interval" inputMode="numeric" value={jeda} onChange={(e) => setJeda(e.target.value.replace(/\D/g, ''))} /><span>hari</span></div></label>
        <KotakGalat galat={galat} />
        <div className="row" style={{ justifyContent: 'flex-end' }}><button className="btn" onClick={onTutup}>Batal</button>
          <button className="btn btn-primary" onClick={simpan} disabled={!Number(jeda)}>Simpan</button></div>
      </div>
    </Modal>
  );
}

export default function Perawatan() {
  const toast = useToast();
  const [ubah, setUbah] = useState(null);
  const { data, galat, memuat, muatUlang } = useData(() => api('/bos/perawatan'), []);
  const ganti = async (k) => {
    try {
      await api(`/bos/perawatan/${k.id}/ganti`, { method: 'POST' });
      await muatUlang({ diam: true });
      toast(`${k.komponen} dicatat diganti hari ini`);
    } catch (e) {
      toast(e.message);
    }
  };
  return (
    <Halaman judul="Perawatan mesin">
      <p className="muted small" style={{ maxWidth: '70ch' }}>Interval bawaan mengikuti umur pakai umum tiap komponen dan bisa diubah. Pengingat muncul di dasbor 7 hari sebelum jadwal.</p>
      <KotakGalat galat={galat} onUlang={muatUlang} />
      {memuat && !data ? <Memuat /> : (
        <div className="grid-2">{data.map((k) => {
          const belum = k.tanggal_terakhir == null;
          const pakai = belum ? 0 : Math.min(1, Math.max(0, 1 - k.sisa_hari / k.interval_hari));
          const [kelas, teks] = belum ? ['line', 'Tanggal belum diisi'] : k.sisa_hari < 0 ? ['danger', `Terlambat ${-k.sisa_hari} hari`] : k.sisa_hari <= 7 ? ['warn', `${k.sisa_hari} hari lagi`] : ['ok', `${k.sisa_hari} hari lagi`];
          return (
            <article className="card stack" style={{ '--gap': '10px' }} key={k.id}>
              <div className="row between"><b style={{ fontSize: 16 }}>{k.komponen}</b><Chip jenis={kelas} ikon={kelas === 'ok' ? 'cek' : belum ? undefined : 'awas'}>{teks}</Chip></div>
              <div className="meter" role="img" aria-label={`${Math.round(pakai * 100)}% masa pakai terlewati`}><i className={kelas} style={{ width: `${Math.round(pakai * 100)}%` }} /></div>
              <div className="row between small muted"><span>{belum ? 'Isi tanggal ganti terakhir' : `Diganti ${tglTahun(k.tanggal_terakhir)}`} · tiap {k.interval_hari} hari</span>{k.jadwal && <span>Jadwal {tglTahun(k.jadwal)}</span>}</div>
              <div className="row"><button className="btn" onClick={() => ganti(k)}>Sudah diganti hari ini</button><button className="btn btn-ghost" onClick={() => setUbah(k)}>Ubah jadwal</button></div>
            </article>
          );
        })}</div>
      )}
      {ubah && <UbahJadwal k={ubah} onTutup={() => setUbah(null)} onSimpan={async (p) => { setUbah(null); await muatUlang({ diam: true }); toast(p); }} />}
    </Halaman>
  );
}
