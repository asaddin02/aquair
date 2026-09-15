import { useState } from 'react';
import { api } from '../api';
import { jarakTeks, NAMA_STATUS, tglPendek } from '../format';
import { Chip, KotakGalat, Memuat, useData, useToast } from '../komponen/umum';
import { Catatan, Kosong, Panel, Ringkasan, TabPilihan } from '../komponen/Ruang';
import { Halaman, useBos } from './umumBos';

const JENIS = { pelanggan: ['Pelanggan baru', 'sky'], harga: ['Minta harga toko', 'warn'], koreksi: ['Koreksi penjualan', 'brand'] };
const HASIL = { rumah: ['ok', 'Disetujui sebagai rumah'], toko: ['ok', 'Dijadikan toko'], setuju: ['ok', 'Disetujui'], tolak: ['danger', 'Ditolak'] };

function Kartu({ a, onSelesai }) {
  const [alasan, setAlasan] = useState('');
  const [galat, setGalat] = useState(null);
  const [kirim, setKirim] = useState(false);
  const [label, kelas] = JENIS[a.jenis];
  const x = a.penjualan;
  const putuskan = async (keputusan) => {
    if (a.jenis !== 'pelanggan' && alasan.trim().length < 3) return setGalat({ message: 'Tulis alasan dulu. Alasan disimpan di log audit.' });
    setKirim(true);
    setGalat(null);
    try {
      await api(`/bos/persetujuan/${a.id}`, { method: 'POST', body: { keputusan, alasan } });
      onSelesai(keputusan === 'tolak' ? 'Ditolak dan tercatat di log audit' : 'Disetujui dan tercatat di log audit');
    } catch (e) {
      setGalat(e);
      setKirim(false);
    }
  };
  let isi;
  if (a.jenis === 'pelanggan') isi = <>{a.pelanggan} · dicatat {a.kurir.nama} sebagai rumah{x ? ` · ${x.galon_isi} galon pada ${tglPendek(x.tanggal)}` : ''}</>;
  else if (a.jenis === 'harga') isi = <>{a.pelanggan} · {x?.galon_isi} {x?.satuan || 'galon'}{x?.nama_produk && x.nama_produk !== 'Isi ulang galon' ? ` ${x.nama_produk} (dan produk lain di kunjungan yang sama)` : ''} · {NAMA_STATUS[x?.status_verifikasi]}{x?.jarak_m != null ? ` · ${jarakTeks(x.jarak_m)} dari titik toko` : ''}{x?.akurasi_m ? ` · akurasi ${Math.round(x.akurasi_m)} m` : ''}. Alasan kurir: "{a.alasan_kurir}"</>;
  else isi = <>{a.pelanggan} · {tglPendek(x?.tanggal)} {x?.jam} · galon isi {x?.galon_isi} → <b>{a.data.galon_isi}</b>, kosong {x?.galon_kosong} → <b>{a.data.galon_kosong}</b>. Alasan kurir: "{a.alasan_kurir}"</>;
  return (
    <article className="card approval">
      <div className="row between"><Chip jenis={kelas}>{label}</Chip><span className="small muted">dari {a.kurir.nama}</span></div>
      <p style={{ color: 'var(--ink-2)' }}>{isi}</p>
      <div className="aksi">
        {a.jenis !== 'pelanggan' && <><label className="sr" htmlFor={`alasan-${a.id}`}>Alasan keputusan</label>
          <input id={`alasan-${a.id}`} className="input" value={alasan} onChange={(e) => setAlasan(e.target.value)} placeholder="Alasan (wajib, masuk log audit)" /></>}
        {a.jenis === 'pelanggan' ? (
          <><button className="btn btn-primary" onClick={() => putuskan('rumah')} disabled={kirim}>Setujui sebagai rumah</button>
            <button className="btn" onClick={() => putuskan('toko')} disabled={kirim}>Jadikan toko</button></>
        ) : <button className="btn btn-primary" onClick={() => putuskan('setuju')} disabled={kirim}>{a.jenis === 'harga' ? 'Setujui harga toko' : 'Setujui koreksi'}</button>}
        <button className="btn btn-danger" onClick={() => putuskan('tolak')} disabled={kirim}>Tolak</button>
      </div>
      <KotakGalat galat={galat} />
    </article>
  );
}

export default function Persetujuan() {
  const toast = useToast();
  const [jenis, setJenis] = useState('semua');
  const { muatLencana } = useBos();
  const { data, galat, memuat, muatUlang } = useData(() => api('/bos/persetujuan'), []);
  const selesai = async (pesan) => { await muatUlang({ diam: true }); muatLencana(); toast(pesan); };
  return (
    <Halaman judul="Persetujuan">
      <Ringkasan items={[{ label: 'Menunggu keputusan', nilai: data?.menunggu.length, ikon: 'setuju', warna: 'amber' }, { label: 'Sudah diputuskan', nilai: data?.sudah.length, ikon: 'cek' }, { label: 'Permintaan harga toko', nilai: data?.menunggu.filter((a) => a.jenis === 'harga').length, ikon: 'toko' }]} />
      <div className="work-split"><div className="work-primary">
      <TabPilihan label="Jenis pengajuan" nilai={jenis} onUbah={setJenis} pilihan={[["semua", 'Semua'], ['harga', 'Harga toko'], ['koreksi', 'Koreksi'], ['pelanggan', 'Pelanggan baru']]} />
      <KotakGalat galat={galat} onUlang={muatUlang} />
      {memuat && !data ? <Memuat /> : (
        <>
          {data?.menunggu.filter((a) => jenis === 'semua' || a.jenis === jenis).length ? <div className="stack">{data.menunggu.filter((a) => jenis === 'semua' || a.jenis === jenis).map((a) => <Kartu key={a.id} a={a} onSelesai={selesai} />)}</div>
            : <Kosong ikon="setuju" judul="Tidak ada pengajuan menunggu">Pengajuan kurir yang sesuai pilihan akan tampil di sini.</Kosong>}
        </>
      )}
      </div><div className="work-aside"><Catatan judul="Keputusan Anda, tercatat jelas">Baca alasan kurir dan bukti yang tersedia. Setiap keputusan beserta alasannya tersimpan dalam log audit.</Catatan>
      <Panel judul="Riwayat keputusan" ket="Pengajuan yang sudah ditindaklanjuti">{data?.sudah.length > 0 && (
  <section className="decision-history">
    <ul className="list">{data.sudah.map((a) => (
      <li key={a.id}><span className="grow"><b>{JENIS[a.jenis][0]} · {a.pelanggan}</b><br />
        <span className="small muted">dari {a.kurir.nama}{a.alasan_keputusan ? ` · Alasan: ${a.alasan_keputusan}` : ''}</span></span>
        <Chip jenis={HASIL[a.status][0]}>{HASIL[a.status][1]}</Chip></li>
    ))}</ul>
  </section>
)}
</Panel></div></div>
    </Halaman>
  );
}
