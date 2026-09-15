import { useState } from 'react';
import { api } from '../api';
import Ikon from '../komponen/Ikon';
import { Chip, KotakGalat, Memuat, Modal, useData, useToast } from '../komponen/umum';
import { Cari, Catatan, Kosong, Ringkasan, TabPilihan } from '../komponen/Ruang';
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
  const [cari, setCari] = useState('');
  const [tab, setTab] = useState('perhatian');
  const [lebih, setLebih] = useState(false);
  const { data, galat, memuat, muatUlang } = useData(() => api('/bos/galon'), []);
  const daftar = (data ? tab === 'perhatian' ? data.tidak_kembali : data.pelanggan : []).filter((p) => p.nama.toLowerCase().includes(cari.toLowerCase()));
  const tampil = lebih ? daftar : daftar.slice(0, 15);
  return (
    <Halaman judul="Galon di luar">
      <KotakGalat galat={galat} onUlang={muatUlang} />
      {memuat && !data ? <Memuat /> : data && <>
        <Ringkasan items={[{ label: 'Galon di pelanggan', nilai: data.total, ket: `${data.pelanggan.length} pelanggan`, ikon: 'galon' }, { label: 'Belum kembali > 14 hari', nilai: data.total_tidak_kembali, ket: `${data.tidak_kembali.length} pelanggan perlu ditanya`, ikon: 'ulang', warna: 'amber' }]} />
        <div className="work-split"><div className="work-primary"><div className="directory-toolbar"><TabPilihan label="Daftar galon" nilai={tab} onUbah={(v) => { setTab(v); setLebih(false); }} pilihan={[["perhatian", 'Perlu ditanyakan', data.tidak_kembali.length], ['semua', 'Semua pelanggan', data.pelanggan.length]]} /><Cari value={cari} onChange={(v) => { setCari(v); setLebih(false); }} placeholder="Cari peminjam galon…" /></div>
          <div className="loan-list">{tampil.map((p) => <article key={p.id} className="loan-row"><span className="entity-icon"><Ikon n={p.jenis === 'toko' ? 'toko' : 'rumah'} s={25} /></span><div className="loan-person"><h3>{p.nama}</h3><Chip jenis={p.jenis === 'toko' ? 'brand' : 'sky'}>{p.jenis === 'toko' ? 'Toko' : 'Rumah'}</Chip>{tab === 'perhatian' && <span className="loan-age">{p.pernah_kembali ? `Terakhir kembali ${p.hari_tanpa_kosong} hari lalu` : `Belum pernah kembali · ${p.hari_tanpa_kosong} hari`}</span>}</div><div className="loan-count"><strong>{p.saldo_galon}</strong><span>galon pinjaman</span></div><button className="btn" onClick={() => setKoreksi(p)}>Koreksi saldo</button></article>)}</div>
          {!tampil.length && <Kosong ikon="galon" judul="Tidak ada galon pada pilihan ini">Coba tab Semua pelanggan atau ubah pencarian.</Kosong>}
          {daftar.length > tampil.length && <button className="btn btn-block" onClick={() => setLebih(true)}>Tampilkan {daftar.length - tampil.length} pelanggan lagi</button>}
        </div><div className="work-aside"><Catatan ikon="galon" judul="Jangan biarkan galon terlupa">Tanyakan galon yang belum kembali lebih dari 14 hari pada pengantaran berikutnya.</Catatan><div className="balance-formula"><span>Galon isi diserahkan</span><b>−</b><span>Galon kosong diambil</span><hr /><strong>Perubahan saldo pinjaman</strong><p>Koreksi manual membutuhkan alasan agar riwayatnya tetap jelas.</p></div></div></div>
      </>}
      {koreksi && <KoreksiSaldo p={koreksi} onTutup={() => setKoreksi(null)} onSimpan={async (pesan) => { setKoreksi(null); await muatUlang({ diam: true }); toast(pesan); }} />}
    </Halaman>
  );
}
