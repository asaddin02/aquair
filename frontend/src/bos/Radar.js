import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { rp } from '../format';
import Ikon from '../komponen/Ikon';
import { KotakGalat, Memuat, Modal, useData, useToast } from '../komponen/umum';
import { GrupRadar, Halaman, tautanWa } from './umumBos';

function CekAcak({ onTutup }) {
  const { data, galat, memuat } = useData(() => api('/bos/cek-acak'), []);
  return (
    <Modal judul="Cek 3 toko hari ini" onTutup={onTutup}>
      {memuat ? <Memuat /> : galat ? <KotakGalat galat={galat} /> : (
        <>
          <p className="small muted" style={{ marginBottom: 12 }}>
            {data.is_demo ? 'Depot contoh hanya menampilkan pratinjau, karena nomor contoh bisa saja milik orang sungguhan.' : 'Tombol membuka WhatsApp di HP ini dengan pesan yang sudah terisi.'}
          </p>
          {data.toko.length === 0 && <p>Belum ada penjualan toko hari ini.</p>}
          <div className="stack">
            {data.toko.map((t) => {
              const pesan = `Halo, dari ${data.nama_depot}. Hari ini kurir kami mencatat ${t.galon} galon ke toko Bapak/Ibu. Boleh dibantu cek, benar berapa galon?`;
              const url = !data.is_demo && tautanWa(t.no_wa, pesan);
              return (
                <div className="stack" style={{ '--gap': '6px' }} key={t.customer_id}>
                  <div className="row between"><b>{t.nama}</b>{t.prioritas && <span className="chip warn">Ada tanda</span>}</div>
                  <div className="wa-bubble">{pesan}</div>
                  {!data.is_demo && (url ? <a className="btn btn-primary" href={url} target="_blank" rel="noreferrer"><Ikon n="wa" s={18} />Buka WhatsApp</a>
                    : <span className="small muted">Nomor WhatsApp toko ini belum diisi. Tambahkan di menu Pelanggan.</span>)}
                </div>
              );
            })}
          </div>
        </>
      )}
      <div className="row" style={{ justifyContent: 'flex-end', marginTop: 14 }}><button className="btn" onClick={onTutup}>Tutup</button></div>
    </Modal>
  );
}

export default function Radar() {
  const [cari, setCari] = useSearchParams();
  const hari = Number(cari.get('hari') || 30);
  const kurir = cari.get('kurir');
  const [lebih, setLebih] = useState(false);
  const [cek, setCek] = useState(false);
  const toast = useToast();
  const { data, galat, memuat, muatUlang } = useData(() => api(`/bos/radar?hari=${hari}${kurir ? `&kurir_id=${kurir}` : ''}`), [hari, kurir]);

  const atur = (k, v) => { const baru = new URLSearchParams(cari); if (v == null) baru.delete(k); else baru.set(k, v); setCari(baru, { replace: true }); setLebih(false); };
  const kelompok = data?.kelompok || [];
  const tampil = lebih ? kelompok : kelompok.slice(0, 8);
  const total = kelompok.reduce((a, g) => ({ t: a.t + g.tagihan_kembali, b: a.b + g.perkiraan_bocor }), { t: 0, b: 0 });
  const namaKurir = kurir && kelompok[0]?.kurir.nama;

  return (
    <Halaman judul="Radar Kecurangan" kanan={<button className="btn" onClick={() => setCek(true)}><Ikon n="wa" s={18} />Cek 3 toko hari ini</button>}>
      <div className="row between">
        <span className="seg" role="group" aria-label="Periode">
          {[[1, 'Hari ini'], [7, '7 hari'], [30, '30 hari']].map(([v, l]) => <button key={v} aria-pressed={hari === v} onClick={() => atur('hari', v)}>{l}</button>)}
        </span>
        {kurir && <span className="row" style={{ '--gap': '6px' }}><span className="chip line">Kurir: {namaKurir || 'dipilih'}</span><button className="btn btn-ghost" onClick={() => atur('kurir', null)}>Semua kurir</button></span>}
      </div>
      <p className="muted small">{kelompok.length} kelompok tanda · Tagihan kembali <b className="num">{rp(total.t)}</b> · Perkiraan bocor <b className="num">{rp(total.b)}</b>. Radar tidak menghukum — bos yang memutuskan.</p>
      <KotakGalat galat={galat} onUlang={muatUlang} />
      {memuat && !data ? <Memuat /> : tampil.length === 0 ? <div className="card">Tidak ada tanda pada periode ini.</div>
        : tampil.map((g) => (
          <GrupRadar key={`${g.tanggal}-${g.kurir.id}`} grup={g} onBerubah={async () => { await muatUlang({ diam: true }); toast('Status tanda disimpan'); }}
            aksiTambahan={<Link className="btn btn-ghost" to={`/bos/rit?tanggal=${g.tanggal}&kurir=${g.kurir.id}`}>Lihat rit</Link>} />
        ))}
      {kelompok.length > tampil.length && <button className="btn btn-block" onClick={() => setLebih(true)}>Tampilkan {kelompok.length - tampil.length} kelompok lagi</button>}
      {cek && <CekAcak onTutup={() => setCek(false)} />}
    </Halaman>
  );
}
