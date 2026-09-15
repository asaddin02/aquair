import { useState } from 'react';
import { api } from '../api';
import Ikon from '../komponen/Ikon';
import { Chip, KotakGalat, Memuat, Modal, Toggle, useData, useToast } from '../komponen/umum';
import { useSesi } from '../Sesi';
import { Halaman } from './umumBos';

const kosong = { nama: '', jenis: 'toko', no_wa: '', lat: null, lng: null, kapasitas: 10, laku_per_hari: 2, boleh_bon: false };
const muatan = (p) => ({ nama: p.nama, jenis: p.jenis, no_wa: p.no_wa || '', lat: p.lat ?? null, lng: p.lng ?? null,
  kapasitas: p.jenis === 'toko' ? Number(p.kapasitas) || null : null, laku_per_hari: p.jenis === 'toko' ? Number(p.laku_per_hari) : null, boleh_bon: !!p.boleh_bon });

function FormPelanggan({ awal, onTutup, onSimpan }) {
  const { sesi } = useSesi();
  const [p, setP] = useState(awal || kosong);
  const [titik, setTitik] = useState(awal?.lat != null ? `${awal.lat}, ${awal.lng}` : '');
  const [lokasi, setLokasi] = useState(null);
  const [galat, setGalat] = useState(null);
  const [kirim, setKirim] = useState(false);
  const ubah = (k) => (e) => setP({ ...p, [k]: e.target.value });

  const pakaiLokasi = () => {
    if (!navigator.geolocation) return setLokasi('HP ini tidak bisa mengambil lokasi.');
    setLokasi('Mengambil lokasi…');
    navigator.geolocation.getCurrentPosition((pos) => {
      setTitik(`${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`);
      setLokasi(`Lokasi diambil (akurasi ${Math.round(pos.coords.accuracy)} m).`);
    }, () => setLokasi('Lokasi tidak didapat. Izinkan lokasi atau ketik manual.'), { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
  };

  const simpan = async () => {
    let lat = null;
    let lng = null;
    if (titik.trim()) {
      const bagian = titik.split(',').map((x) => Number(x.trim()));
      if (bagian.length !== 2 || bagian.some((x) => Number.isNaN(x))) return setGalat({ message: 'Titik lokasi ditulis "lintang, bujur", contoh: -6.2001, 106.8166' });
      [lat, lng] = bagian;
    }
    if (p.nama.trim().length < 2) return setGalat({ message: 'Isi nama pelanggan dulu.' });
    setKirim(true);
    setGalat(null);
    try {
      const body = muatan({ ...p, lat, lng });
      await (awal?.id ? api(`/bos/pelanggan/${awal.id}`, { method: 'PUT', body }) : api('/bos/pelanggan', { method: 'POST', body }));
      onSimpan(awal?.id ? 'Perubahan disimpan dan tercatat di log audit' : 'Pelanggan ditambahkan');
    } catch (e) {
      setGalat(e);
      setKirim(false);
    }
  };

  return (
    <Modal judul={awal?.id ? 'Ubah pelanggan' : 'Tambah pelanggan'} onTutup={onTutup}>
      <div className="stack">
        <label className="field" htmlFor="pl-nama"><span>Nama</span><input id="pl-nama" className="input" value={p.nama} onChange={ubah('nama')} placeholder="Contoh: Toko Sinar Pagi" /></label>
        <label className="field" htmlFor="pl-jenis"><span>Jenis</span>
          <select id="pl-jenis" className="input" value={p.jenis} onChange={ubah('jenis')}><option value="toko">Toko</option><option value="rumah">Rumah</option></select></label>
        <label className="field" htmlFor="pl-wa"><span>Nomor WhatsApp <span className="hint">opsional, untuk konfirmasi toko</span></span>
          <input id="pl-wa" className="input" inputMode="tel" value={p.no_wa} onChange={ubah('no_wa')} placeholder="08…" /></label>
        <div className="field"><span>Titik lokasi</span>
          <button type="button" className="btn" onClick={pakaiLokasi} disabled={sesi.demo}><Ikon n="lokasi" s={18} />Pakai lokasi saya sekarang</button>
          <label className="sr" htmlFor="pl-titik">Ketik titik lokasi</label>
          <input id="pl-titik" className="input" value={titik} onChange={(e) => setTitik(e.target.value)} placeholder="atau ketik: lintang, bujur" />
          <span className="hint">{sesi.demo ? 'Depot contoh tidak memakai lokasi asli perangkat.' : lokasi || 'Tekan tombol saat berdiri di dalam toko. Tanpa titik lokasi, penjualan toko tidak bisa terverifikasi.'}</span></div>
        {p.jenis === 'toko' && (
          <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <label className="field" htmlFor="pl-kap"><span>Kapasitas simpan</span><div className="input-unit"><input id="pl-kap" inputMode="numeric" value={p.kapasitas ?? ''} onChange={ubah('kapasitas')} /><span>galon</span></div></label>
            <label className="field" htmlFor="pl-laku"><span>Laku per hari</span><div className="input-unit"><input id="pl-laku" inputMode="numeric" value={p.laku_per_hari ?? ''} onChange={ubah('laku_per_hari')} /><span>galon</span></div></label>
          </div>
        )}
        <label className="row" htmlFor="pl-bon" style={{ '--gap': '8px' }}><input id="pl-bon" type="checkbox" checked={p.boleh_bon} onChange={(e) => setP({ ...p, boleh_bon: e.target.checked })} /> Boleh bon</label>
        <KotakGalat galat={galat} />
        <div className="row" style={{ justifyContent: 'flex-end' }}><button className="btn" onClick={onTutup}>Batal</button>
          <button className="btn btn-primary" onClick={simpan} disabled={kirim}>Simpan</button></div>
      </div>
    </Modal>
  );
}

export default function Pelanggan() {
  const toast = useToast();
  const [filter, setFilter] = useState('semua');
  const [form, setForm] = useState(null);
  const [lebih, setLebih] = useState(false);
  const { data, galat, memuat, muatUlang, setData } = useData(() => api('/bos/pelanggan'), []);
  const semua = (data || []).filter((p) => filter === 'semua' || p.jenis === filter);
  const tampil = lebih ? semua : semua.slice(0, 30);
  const jumlah = (j) => (data || []).filter((p) => p.jenis === j).length;

  const ubahBon = async (p, nyala) => {
    setData((d) => d.map((x) => (x.id === p.id ? { ...x, boleh_bon: nyala } : x)));
    try {
      await api(`/bos/pelanggan/${p.id}`, { method: 'PUT', body: muatan({ ...p, boleh_bon: nyala }) });
      toast(`${p.nama}: bon ${nyala ? 'diizinkan' : 'tidak diizinkan'}`);
    } catch (e) {
      toast(e.message);
      muatUlang({ diam: true });
    }
  };

  return (
    <Halaman judul="Pelanggan" kanan={<button className="btn btn-primary" onClick={() => setForm({})}><Ikon n="tambah" s={18} />Tambah pelanggan</button>}>
      <span className="seg" role="group" aria-label="Jenis pelanggan" style={{ alignSelf: 'start' }}>
        {[['semua', `Semua ${data?.length ?? ''}`], ['toko', `Toko ${jumlah('toko')}`], ['rumah', `Rumah ${jumlah('rumah')}`]].map(([v, l]) =>
          <button key={v} aria-pressed={filter === v} onClick={() => { setFilter(v); setLebih(false); }}>{l}</button>)}
      </span>
      <KotakGalat galat={galat} onUlang={muatUlang} />
      {memuat && !data ? <Memuat /> : (
        <div className="table-wrap"><table>
          <thead><tr><th>Nama</th><th>Jenis</th><th className="r">Kapasitas simpan</th><th className="r">Laku per hari</th><th>Titik lokasi</th><th className="r">Saldo galon</th><th>Boleh bon</th><th /></tr></thead>
          <tbody>{tampil.map((p) => (
            <tr key={p.id}>
              <td><b>{p.nama}</b>{p.status === 'menunggu_persetujuan' && <div><Chip jenis="warn">Menunggu persetujuan</Chip></div>}</td>
              <td>{p.jenis === 'toko' ? <Chip jenis="brand" ikon="qr">Toko</Chip> : <Chip jenis="sky" ikon="rumah">Rumah</Chip>}</td>
              <td className="r num">{p.jenis === 'toko' ? `${p.kapasitas ?? '—'} galon` : '—'}</td>
              <td className="r num">{p.jenis === 'toko' ? `${p.laku_per_hari ?? '—'} galon` : '—'}</td>
              <td>{p.lat != null ? <Chip jenis="ok" ikon="cek">Ada</Chip> : <Chip jenis={p.jenis === 'toko' ? 'warn' : 'line'}>Belum</Chip>}</td>
              <td className="r num">{p.saldo_galon ?? 0}</td>
              <td><Toggle nyala={p.boleh_bon} label={`Boleh bon: ${p.nama}`} onUbah={(v) => ubahBon(p, v)} /></td>
              <td className="r"><button className="btn btn-ghost" onClick={() => setForm(p)}>Ubah</button></td>
            </tr>
          ))}</tbody>
        </table></div>
      )}
      {semua.length > tampil.length && <button className="btn btn-block" onClick={() => setLebih(true)}>Tampilkan {semua.length - tampil.length} pelanggan lagi</button>}
      <p className="small muted">Kapasitas dan laku per hari dipakai aturan R3 (stok toko tidak wajar). Bon mati secara bawaan, supaya penjualan tunai tidak bisa ditulis sebagai bon.</p>
      {form && <FormPelanggan awal={form.id ? form : null} onTutup={() => setForm(null)} onSimpan={async (pesan) => { setForm(null); await muatUlang({ diam: true }); toast(pesan); }} />}
    </Halaman>
  );
}
