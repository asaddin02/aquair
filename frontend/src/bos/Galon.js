import { useState } from 'react';
import { api } from '../api';
import Ikon from '../komponen/Ikon';
import { Chip, KotakGalat, Memuat, Modal, useData, useToast } from '../komponen/umum';
import { Halaman } from './umumBos';

function KoreksiSaldo({ p, onTutup, onSimpan }) {
  const [saldo, setSaldo] = useState(String(p.saldo_galon));
  const [alasan, setAlasan] = useState('');
  const [galat, setGalat] = useState(null);
  const simpan = async () => {
    try {
      await api(`/bos/galon/${p.id}/koreksi`, { method: 'POST', body: { saldo: Number(saldo), alasan } });
      onSimpan(`Saldo ${p.nama} menjadi ${saldo} galon`);
    } catch (e) {
      setGalat(e);
    }
  };
  return (
    <Modal judul="Koreksi saldo galon" onTutup={onTutup}>
      <div className="stack">
        <p className="small muted">{p.nama} · saldo sekarang {p.saldo_galon} galon</p>
        <label className="field" htmlFor="saldo-baru"><span>Saldo yang benar</span>
          <div className="input-unit"><input id="saldo-baru" inputMode="numeric" value={saldo} onChange={(e) => setSaldo(e.target.value.replace(/\D/g, ''))} /><span>galon</span></div></label>
        <label className="field" htmlFor="saldo-alasan"><span>Alasan</span>
          <input id="saldo-alasan" className="input" value={alasan} onChange={(e) => setAlasan(e.target.value)} placeholder="Contoh: 2 galon dikembalikan langsung ke depot" /></label>
        <KotakGalat galat={galat} />
        <div className="row" style={{ justifyContent: 'flex-end' }}><button className="btn" onClick={onTutup}>Batal</button>
          <button className="btn btn-primary" onClick={simpan} disabled={saldo === '' || alasan.trim().length < 3}>Simpan koreksi</button></div>
      </div>
    </Modal>
  );
}

export default function Galon() {
  const toast = useToast();
  const [koreksi, setKoreksi] = useState(null);
  const [lebih, setLebih] = useState(false);
  const { data, galat, memuat, muatUlang } = useData(() => api('/bos/galon'), []);
  const baris = (p, lama) => (
    <tr key={p.id}>
      <td><b>{p.nama}</b></td>
      <td>{p.jenis === 'toko' ? <Chip jenis="brand">Toko</Chip> : <Chip jenis="sky">Rumah</Chip>}</td>
      <td className="r num"><b>{p.saldo_galon}</b> galon</td>
      {lama && <td className="r"><Chip jenis="warn" ikon="awas">{p.pernah_kembali ? `${p.hari_tanpa_kosong} hari lalu` : `belum pernah (${p.hari_tanpa_kosong} hari)`}</Chip></td>}
      <td className="r"><button className="btn btn-ghost" onClick={() => setKoreksi(p)}>Koreksi saldo</button></td>
    </tr>
  );
  const tampil = data ? (lebih ? data.pelanggan : data.pelanggan.slice(0, 15)) : [];
  return (
    <Halaman judul="Galon di luar">
      <KotakGalat galat={galat} onUlang={muatUlang} />
      {memuat && !data ? <Memuat /> : (
        <>
          <div className="grid-2">
            <div className="hero-tile"><div className="eyebrow">Galon depot di pelanggan</div><div className="angka">{data.total} galon</div>
              <p>di {data.pelanggan.length} pelanggan. Setiap penjualan menambah saldo sebanyak galon isi diserahkan dikurangi galon kosong diambil.</p></div>
            <div className="hero-tile"><div className="eyebrow">Tidak ada galon kosong kembali &gt; 14 hari</div>
              <div className="angka" style={{ color: 'var(--warn-text)' }}>{data.total_tidak_kembali} galon</div>
              <p>di {data.tidak_kembali.length} pelanggan. Minta kurir menanyakannya di rit berikutnya sebelum galonnya hilang.</p></div>
          </div>
          <section className="stack"><div className="sec-head"><h3>Perlu ditanyakan</h3></div>
            {data.tidak_kembali.length === 0 ? <div className="card"><Ikon n="cek" s={18} /> Semua pelanggan mengembalikan galon kosong dalam 14 hari terakhir.</div> : (
              <div className="table-wrap"><table><thead><tr><th>Pelanggan</th><th>Jenis</th><th className="r">Saldo</th><th className="r">Galon kosong terakhir kembali</th><th /></tr></thead>
                <tbody>{data.tidak_kembali.map((p) => baris(p, true))}</tbody></table></div>
            )}</section>
          <section className="stack"><div className="sec-head"><h3>Semua pelanggan</h3><span className="small muted">saldo terbesar dulu</span></div>
            <div className="table-wrap"><table><thead><tr><th>Pelanggan</th><th>Jenis</th><th className="r">Saldo</th><th /></tr></thead>
              <tbody>{tampil.map((p) => baris(p, false))}</tbody></table></div>
            {data.pelanggan.length > tampil.length && <button className="btn btn-block" onClick={() => setLebih(true)}>Tampilkan {data.pelanggan.length - tampil.length} pelanggan lagi</button>}
          </section>
        </>
      )}
      {koreksi && <KoreksiSaldo p={koreksi} onTutup={() => setKoreksi(null)} onSimpan={async (pesan) => { setKoreksi(null); await muatUlang({ diam: true }); toast(pesan); }} />}
    </Halaman>
  );
}
