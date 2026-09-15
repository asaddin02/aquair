import { useState } from 'react';
import { api } from '../api';
import Ikon from '../komponen/Ikon';
import { Chip, KotakGalat, Memuat, Modal, Toggle, useData, useToast } from '../komponen/umum';
import { Cari, Kosong, Ringkasan } from '../komponen/Ruang';
import { Avatar, Halaman } from './umumBos';

function ModalPin({ hasil, onTutup }) {
  return (
    <Modal judul={`PIN untuk ${hasil.nama}`} onTutup={onTutup}>
      {hasil.contoh ? <p>Depot contoh tidak membuat akun masuk sungguhan, jadi PIN tidak ditampilkan. Di depot sungguhan, PIN 6 angka muncul di sini sekali.</p> : (
        <>
          <div className="pin" style={{ margin: '16px 0' }} aria-label={`PIN ${hasil.pin.split('').join(' ')}`}>{hasil.pin.split('').map((d, i) => <span key={i}>{d}</span>)}</div>
          <p className="small" style={{ color: 'var(--ink-2)' }}>Berikan langsung ke kurir. PIN hanya ditampilkan sekali dan disimpan dalam bentuk acak (hash), jadi pemilik depot pun tidak bisa melihatnya lagi.</p>
        </>
      )}
      <div className="row" style={{ justifyContent: 'flex-end', marginTop: 14 }}><button className="btn btn-primary" onClick={onTutup}>Sudah dicatat</button></div>
    </Modal>
  );
}

function TambahKurir({ onTutup, onSelesai }) {
  const [nama, setNama] = useState('');
  const [hp, setHp] = useState('');
  const [galat, setGalat] = useState(null);
  const simpan = async () => {
    try {
      const r = await api('/bos/kurir', { method: 'POST', body: { nama, no_hp: hp } });
      onSelesai({ nama: r.nama, pin: r.pin, contoh: r.pin == null });
    } catch (e) {
      setGalat(e);
    }
  };
  return (
    <Modal judul="Tambah kurir" onTutup={onTutup}>
      <div className="stack">
        <label className="field" htmlFor="kr-nama"><span>Nama</span><input id="kr-nama" className="input" value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Nama panggilan" /></label>
        <label className="field" htmlFor="kr-hp"><span>Nomor HP</span><input id="kr-hp" className="input" inputMode="tel" value={hp} onChange={(e) => setHp(e.target.value)} placeholder="08…" /></label>
        <p className="small muted">Kurir masuk dengan nomor HP ini. PIN 6 angka dibuat otomatis setelah disimpan.</p>
        <KotakGalat galat={galat} />
        <div className="row" style={{ justifyContent: 'flex-end' }}><button className="btn" onClick={onTutup}>Batal</button>
          <button className="btn btn-primary" onClick={simpan} disabled={nama.trim().length < 2 || hp.replace(/\D/g, '').length < 10}>Simpan dan buat PIN</button></div>
      </div>
    </Modal>
  );
}

export default function Kurir() {
  const toast = useToast();
  const [cari, setCari] = useState('');
  const [tambah, setTambah] = useState(false);
  const [pin, setPin] = useState(null);
  const { data, galat, memuat, muatUlang } = useData(() => api('/bos/kurir'), []);

  const ubahAktif = async (k, aktif) => {
    try {
      await api(`/bos/kurir/${k.id}`, { method: 'PUT', body: { aktif } });
      await muatUlang({ diam: true });
      toast(`${k.nama} ${aktif ? 'diaktifkan' : 'dinonaktifkan — tidak bisa masuk lagi'}`);
    } catch (e) {
      toast(e.message);
    }
  };
  const aturPin = async (k) => {
    try {
      const r = await api(`/bos/kurir/${k.id}/pin`, { method: 'POST' });
      setPin({ nama: k.nama, pin: r.pin, contoh: r.contoh });
      muatUlang({ diam: true });
    } catch (e) {
      toast(e.message);
    }
  };

  return (
    <Halaman judul="Kurir" kanan={<button className="btn btn-primary" onClick={() => setTambah(true)}><Ikon n="tambah" s={18} />Tambah kurir</button>}>
      <Ringkasan items={[{ label: 'Anggota tim', nilai: data?.length, ikon: 'orang' }, { label: 'Kurir aktif', nilai: (data || []).filter((k) => k.aktif).length, ikon: 'cek' }, { label: 'Sedang di jalan', nilai: (data || []).filter((k) => k.rit_hari_ini === 'aktif').length, ikon: 'rit' }]} />
      <div className="directory-toolbar"><div><h2 className="section-title">Tim pengantaran</h2><p className="muted">Kelola akses dan lihat aktivitas kurir.</p></div><Cari value={cari} onChange={setCari} placeholder="Cari kurir…" /></div>
      <KotakGalat galat={galat} onUlang={muatUlang} />
      {memuat && !data ? <Memuat /> : <div className="team-grid">{(data || []).filter((k) => k.nama.toLowerCase().includes(cari.toLowerCase())).map((k) => <article className="team-card" key={k.id}>
        <div className="team-cover"><span>ANGGOTA TIM</span><Chip jenis={k.aktif ? 'ok' : 'line'}>{k.aktif ? 'Aktif' : 'Nonaktif'}</Chip></div>
        <div className="team-content"><Avatar kurir={k} /><h3>{k.nama}</h3><p className="muted">{k.no_hp || 'Nomor HP belum diisi'}</p>
          <div className="team-activity"><span className="entity-icon"><Ikon n="rit" /></span><div><small>Aktivitas hari ini</small><b>{!k.rit_hari_ini ? 'Belum ada rit' : k.rit_hari_ini === 'aktif' ? 'Sedang mengantar' : 'Rit sudah selesai'}</b></div></div>
          {k.dikunci_sampai && <Chip jenis="danger" ikon="kunci">Terkunci sampai {k.dikunci_sampai}</Chip>}
          <div className="team-access"><span>Akses aplikasi</span><Toggle nyala={k.aktif} label={`Kurir ${k.nama} aktif`} onUbah={(v) => ubahAktif(k, v)} /></div>
          <button className="btn btn-block" onClick={() => aturPin(k)}><Ikon n="kunci" s={17} />Atur ulang PIN</button>
        </div>
      </article>)}</div>}
      {data && !(data || []).filter((k) => k.nama.toLowerCase().includes(cari.toLowerCase())).length && <Kosong ikon="orang" judul="Belum ada kurir yang cocok">Tambah anggota tim atau coba nama lain.</Kosong>}
      <div className="inline-explainer"><Ikon n="kunci" /><p>Kurir masuk dengan nomor HP dan PIN 6 angka. Setiap kurir hanya dapat melihat ritnya sendiri; 5 kali salah PIN mengunci akun 15 menit.</p></div>
      {tambah && <TambahKurir onTutup={() => setTambah(false)} onSelesai={(h) => { setTambah(false); setPin(h); muatUlang({ diam: true }); }} />}
      {pin && <ModalPin hasil={pin} onTutup={() => setPin(null)} />}
    </Halaman>
  );
}
