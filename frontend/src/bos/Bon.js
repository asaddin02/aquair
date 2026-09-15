import { api } from '../api';
import { rp, tglPanjang } from '../format';
import Ikon from '../komponen/Ikon';
import { KotakGalat, Memuat, useData, useToast } from '../komponen/umum';
import { Halaman } from './umumBos';

export default function Bon() {
  const toast = useToast();
  const { data, galat, memuat, muatUlang } = useData(() => api('/bos/bon'), []);
  const lunas = async (p) => {
    try {
      await api(`/bos/bon/${p.customer_id}/lunas`, { method: 'POST' });
      await muatUlang({ diam: true });
      toast(`Bon ${p.nama} lunas`);
    } catch (e) {
      toast(e.message);
    }
  };
  return (
    <Halaman judul="Bon belum lunas">
      <KotakGalat galat={galat} onUlang={muatUlang} />
      {memuat && !data ? <Memuat /> : (
        <>
          <div className="grid-2">
            <div className="hero-tile"><div className="eyebrow">Belum dibayar</div><div className="angka">{rp(data.total)}</div>
              <p>dari {data.pelanggan.length} pelanggan. Tekan Lunas saat uangnya sudah diterima.</p></div>
            <div className="card flat small" style={{ alignSelf: 'start' }}><b>Kenapa bon dicatat terpisah?</b>
              <p style={{ marginTop: 4, color: 'var(--ink-2)' }}>Kalau bon bebas dipilih dan tidak pernah ditagih, kurir bisa menulis penjualan tunai sebagai bon lalu mengantongi uangnya. Karena itu bon hanya bisa dipilih untuk pelanggan yang diizinkan, dan setiap bon menunggu di sini sampai lunas.</p></div>
          </div>
          {data.pelanggan.length === 0 ? <div className="card">Semua bon sudah lunas.</div> : (
            <div className="grid-2">{data.pelanggan.map((p) => (
              <article className="card stack" style={{ '--gap': '10px' }} key={p.customer_id}>
                <div className="row between"><b style={{ fontSize: 16 }}>{p.nama}</b><span className="num" style={{ font: '800 22px/1 var(--f-head)' }}>{rp(p.total)}</span></div>
                <ul className="list small">{p.catatan.map((c, i) => <li key={i}><span className="grow">{tglPanjang(c.tanggal)}</span><span className="num">{c.galon_isi} galon × {rp(c.harga)}</span></li>)}</ul>
                <button className="btn btn-primary" style={{ justifySelf: 'start', alignSelf: 'start' }} onClick={() => lunas(p)}><Ikon n="cek" s={18} />Lunas</button>
              </article>
            ))}</div>
          )}
        </>
      )}
    </Halaman>
  );
}
