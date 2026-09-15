import { useState } from 'react';
import { api } from '../api';
import { hariIniWib, tglTahun } from '../format';
import { Chip, KotakGalat, Memuat, Modal, useData, useToast } from '../komponen/umum';
import Ikon from '../komponen/Ikon';
import { Catatan, Ringkasan } from '../komponen/Ruang';
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
      <Ringkasan items={[{ label: 'Komponen mesin', nilai: data?.length, ikon: 'alat' }, { label: 'Sudah lewat jadwal', nilai: (data || []).filter((k) => k.sisa_hari != null && k.sisa_hari < 0).length, ikon: 'awas', warna: 'amber' }, { label: 'Jatuh tempo 7 hari', nilai: (data || []).filter((k) => k.sisa_hari != null && k.sisa_hari >= 0 && k.sisa_hari <= 7).length, ikon: 'kalender' }]} />
      <div className="work-split"><div className="work-primary">
      <KotakGalat galat={galat} onUlang={muatUlang} />
      {memuat && !data ? <Memuat /> : (
        <div className="maintenance-list">{(data || []).map((k) => {
          const belum = k.tanggal_terakhir == null;
          const pakai = belum ? 0 : Math.min(1, Math.max(0, 1 - k.sisa_hari / k.interval_hari));
          const [kelas, teks] = belum ? ['line', 'Tanggal belum diisi'] : k.sisa_hari < 0 ? ['danger', `Terlambat ${-k.sisa_hari} hari`] : k.sisa_hari <= 7 ? ['warn', `${k.sisa_hari} hari lagi`] : ['ok', `${k.sisa_hari} hari lagi`];
          return (
            <article className={`maintenance-card ${kelas}`} key={k.id}>
              <div className="maintenance-gauge" style={{ '--pakai': `${Math.round(pakai * 100)}%` }}><span><Ikon n={k.komponen.toLowerCase().includes('uv') ? 'bintang' : 'alat'} s={27} /><b>{Math.round(pakai * 100)}%</b></span></div>
              <div className="maintenance-info"><div className="row between"><h3>{k.komponen}</h3><Chip jenis={kelas} ikon={kelas === 'ok' ? 'cek' : belum ? undefined : 'awas'}>{teks}</Chip></div><p>{belum ? 'Tanggal pemasangan belum diisi' : `Terakhir diganti ${tglTahun(k.tanggal_terakhir)}`}</p><dl><div><dt>Interval penggantian</dt><dd>{k.interval_hari} hari</dd></div><div><dt>Jadwal berikutnya</dt><dd>{k.jadwal ? tglTahun(k.jadwal) : 'Belum dijadwalkan'}</dd></div></dl><div className="row"><button className="btn btn-primary" onClick={() => ganti(k)}><Ikon n="cek" s={17} />Sudah diganti hari ini</button><button className="btn" onClick={() => setUbah(k)}>Ubah jadwal</button></div></div>
            </article>
          );
        })}</div>
      )}
      </div><div className="work-aside"><Catatan ikon="alat" judul="Perawatan yang terencana">Persentase menunjukkan bagian interval yang sudah terlewati sejak penggantian terakhir. Sesuaikan interval dengan kondisi dan pemakaian mesin.</Catatan><Catatan ikon="kalender" judul="Pengingat sebelum jatuh tempo">Jadwal muncul di dasbor 7 hari sebelum penggantian. Tekan Sudah diganti hanya setelah komponen benar-benar diganti.</Catatan></div></div>
      {ubah && <UbahJadwal k={ubah} onTutup={() => setUbah(null)} onSimpan={async (p) => { setUbah(null); await muatUlang({ diam: true }); toast(p); }} />}
    </Halaman>
  );
}
