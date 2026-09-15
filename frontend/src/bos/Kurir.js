import { useState } from 'react';
import { api } from '../api';
import Ikon from '../komponen/Ikon';
import { Chip, KotakGalat, Memuat, Modal, Toggle, useData, useToast } from '../komponen/umum';
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
      <p className="small muted" style={{ maxWidth: '65ch' }}>Kurir masuk dengan nomor HP dan PIN 6 angka, dan hanya melihat rit miliknya sendiri. 5 kali salah PIN mengunci akun 15 menit.</p>
      <KotakGalat galat={galat} onUlang={muatUlang} />
      {memuat && !data ? <Memuat /> : (
        <div className="table-wrap"><table>
          <thead><tr><th>Kurir</th><th>Nomor HP</th><th>Hari ini</th><th>Status</th><th /></tr></thead>
          <tbody>{data.map((k) => (
            <tr key={k.id}>
              <td><div className="row" style={{ '--gap': '10px' }}><Avatar kurir={k} /><b>{k.nama}</b></div></td>
              <td className="num">{k.no_hp || '—'}</td>
              <td>{!k.rit_hari_ini ? <span className="muted">Tidak ada rit</span> : k.rit_hari_ini === 'aktif' ? <Chip jenis="sky">Di jalan</Chip> : <Chip jenis="ok" ikon="cek">Rit selesai</Chip>}
                {k.dikunci_sampai && <div><Chip jenis="danger" ikon="kunci">Terkunci sampai {k.dikunci_sampai}</Chip></div>}</td>
              <td><div className="row" style={{ '--gap': '8px', flexWrap: 'nowrap' }}><Toggle nyala={k.aktif} label={`Kurir ${k.nama} aktif`} onUbah={(v) => ubahAktif(k, v)} /><span className="small">{k.aktif ? 'Aktif' : 'Nonaktif'}</span></div></td>
              <td className="r"><button className="btn" onClick={() => aturPin(k)}><Ikon n="kunci" s={16} />Atur ulang PIN</button></td>
            </tr>
          ))}</tbody>
        </table></div>
      )}
      {tambah && <TambahKurir onTutup={() => setTambah(false)} onSelesai={(h) => { setTambah(false); setPin(h); muatUlang({ diam: true }); }} />}
      {pin && <ModalPin hasil={pin} onTutup={() => setPin(null)} />}
    </Halaman>
  );
}
