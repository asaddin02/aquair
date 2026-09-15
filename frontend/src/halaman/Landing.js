import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Ikon, { Logo } from '../komponen/Ikon';
import { KotakGalat, Modal, TombolPasang } from '../komponen/umum';
import Pratinjau from '../komponen/Pratinjau';
import { useSesi } from '../Sesi';

export function useCobaDemo() {
  const { mulaiDemo } = useSesi();
  const pergi = useNavigate();
  const [menyiapkan, setMenyiapkan] = useState(false);
  const [galat, setGalat] = useState(null);
  const coba = async (peran) => {
    setGalat(null);
    setMenyiapkan(true);
    try {
      await mulaiDemo(peran);
      pergi(peran === 'bos' ? '/bos' : '/kurir');
    } catch (e) {
      setGalat(e);
    } finally {
      setMenyiapkan(false);
    }
  };
  const tampilan = (
    <>
      {menyiapkan && (
        <Modal judul="Menyiapkan depot contoh" onTutup={() => {}}>
          <div className="stack" style={{ alignItems: 'center', textAlign: 'center', '--gap': '10px', padding: '8px 0' }}>
            <div className="putar" aria-hidden="true" />
            <b>Menyiapkan depot contoh…</b>
            <p className="small muted">Depot Tirta Sejahtera · 2 kurir · 20 toko · 60 rumah · riwayat 30 hari yang berakhir hari ini</p>
          </div>
        </Modal>
      )}
      <KotakGalat galat={galat} />
    </>
  );
  return { coba, menyiapkan, tampilan };
}

const FITUR = [
  ['galon', 'Galon kembali, usaha tenang.', 'Lihat saldo galon pinjaman setiap pelanggan dan siapa yang belum mengembalikan galon kosong.'],
  ['wa', 'Konfirmasi langsung dari toko.', 'Cocokkan jumlah galon mingguan melalui tautan WhatsApp. Pemilik toko tidak perlu membuat akun.'],
  ['alat', 'Mesin terawat. Air terjaga.', 'Jadwalkan perawatan filter, UV, dan membran RO, beserta uji kualitas air dan masa berlaku SLHS.'],
];
const TANYA = [
  ['Apa yang membedakan AQUAIR dari catatan biasa?', 'AQUAIR menghubungkan harga toko dengan bukti QR dan lokasi. Klaim toko tanpa bukti dihitung dengan harga rumah, lalu pemilik depot bisa memeriksa dan memberi persetujuan.'],
  ['Apakah kurir harus scan QR untuk setiap rumah?', 'Tidak. Untuk pembeli rumah, kurir cukup memilih pembeli, mengisi jumlah galon, lalu menyimpan. Bukti QR dan lokasi diperlukan untuk harga toko.'],
  ['Bagaimana kalau sinyal hilang saat mengantar?', 'Jika pengiriman penjualan gagal karena jaringan, kurir bisa memilih menyimpannya di HP. Catatan akan masuk antrean dan dikirim saat koneksi kembali. Statusnya selalu terlihat.'],
  ['Bisa dicoba sebelum mendaftarkan depot?', 'Bisa. Pilih demo pemilik atau kurir tanpa membuat akun. Setiap pengunjung mendapat depot contoh terpisah dengan data simulasi, yang terhapus otomatis setelah 24 jam.'],
];

export default function Landing() {
  const { coba, menyiapkan, tampilan } = useCobaDemo();
  const [pratinjau, setPratinjau] = useState('bos');
  return (
    <div className="site penuh landing v2">
      <a className="skip-link" href="#utama">Langsung ke isi</a>
      <nav className="site-nav" aria-label="Situs">
        <Link to="/" className="logo"><Logo s={36} />AQUAIR<span className="logo-dot">.</span></Link>
        <div className="site-links"><a href="#fitur">Fitur</a><a href="#cara-kerja">Cara kerja</a><a href="#aplikasi">Aplikasi mobile</a></div>
        <div className="row nav-actions">
          <TombolPasang className="btn btn-ghost" ringkas />
          <Link className="btn btn-ghost" to="/masuk">Masuk</Link>
          <Link className="btn btn-primary" to="/daftar">Mulai sekarang<Ikon n="panah" s={16} /></Link>
        </div>
      </nav>
      <main id="utama">
        <section className="landing-hero">
          <div className="hero-copy">
            <div className="hero-label"><span className="status-dot" />TEMAN USAHA DEPOT AIR MINUM</div>
            <h1>Depot tertata.<br /><em>Setiap galon terjaga.</em></h1>
            <p className="lead">Dari galon yang berangkat sampai uang yang kembali. Kelola depot, pantau kurir, dan jaga setoran dalam satu aplikasi yang rapi.</p>
            <div className="hero-actions"><button className="btn btn-primary btn-lg" onClick={() => coba('bos')} disabled={menyiapkan}>Jelajahi demo<Ikon n="panah" s={19} /></button><button className="btn btn-lg" onClick={() => coba('kurir')} disabled={menyiapkan}><Ikon n="ponsel" s={20} />Coba aplikasi kurir</button></div>
            <div className="hero-assurance"><span><Ikon n="cek" s={15} />Tanpa daftar</span><span><Ikon n="cek" s={15} />Data contoh terpisah</span><span><Ikon n="cek" s={15} />Bisa di HP & laptop</span></div>
            <p className="demo-login-note"><Link to="/masuk?panduan=1">Cara login dan memakai AQUAIR</Link></p>
            {tampilan}
          </div>
          <div className={`hero-visual ${pratinjau === 'kurir' ? 'show-phone' : ''}`}>
            <div className="preview-switch" role="group" aria-label="Pratinjau aplikasi"><button aria-pressed={pratinjau === 'bos'} onClick={() => setPratinjau('bos')}><Ikon n="dasbor" s={15} />Pemilik depot</button><button aria-pressed={pratinjau === 'kurir'} onClick={() => setPratinjau('kurir')}><Ikon n="ponsel" s={15} />Kurir</button></div>
            <div className="product-stage"><div className="stage-caption"><span className="eyebrow">SATU DEPOT. SEMUA TERHUBUNG.</span><h2>{pratinjau === 'bos' ? <>Pegang kendali.<br />Dari satu tempat.</> : <>Fokus mengantar.<br />Catat dengan mudah.</>}</h2><p>{pratinjau === 'bos' ? 'Penjualan, setoran, dan pekerjaan yang perlu ditindaklanjuti. Langsung terlihat.' : 'Muatan jelas, tombol besar, riwayat rapi. Siap menemani perjalanan kurir.'}</p><div className="stage-pills"><span><Ikon n="perisai" s={17} />Bukti terhubung</span><span><Ikon n="galon" s={17} />Galon terlacak</span></div></div><div className="hero-preview"><Pratinjau mobile={pratinjau === 'kurir'} /></div></div>
            <div className="floating-note"><span><Ikon n="perisai" s={22} /></span><div><b>Setiap galon, ada catatannya.</b><small>Setiap harga toko, ada buktinya.</small></div></div>
            <p className="preview-caption">Pratinjau dengan data ilustrasi</p>
          </div>
        </section>
        <div className="capability-strip"><span>DIBUAT UNTUK<br /><b>keseharian depot Anda.</b></span><span><Ikon n="qr" />Verifikasi QR & lokasi</span><span><Ikon n="uang" />Setoran transparan</span><span><Ikon n="galon" />Galon terlacak</span><span><Ikon n="ponsel" />Praktis di HP</span></div>
        <section className="role-section"><div className="role-intro"><span className="eyebrow">DIBANGUN UNTUK ORANGNYA</span><h2>Satu usaha.<br /><em>Dua ruang kerja.</em></h2><p>Setiap orang melihat yang dibutuhkan untuk menyelesaikan pekerjaannya.</p></div><button className="role-card owner" onClick={() => coba('bos')} disabled={menyiapkan}><span className="role-icon"><Ikon n="dasbor" s={27} /></span><small>UNTUK PEMILIK DEPOT</small><h3>Tahu yang terjadi.<br />Tahu langkah berikutnya.</h3><p>Pantau rit, periksa selisih, dan kelola pelanggan dari ruang kerja yang tertata.</p><span className="role-link">Masuk demo pemilik<Ikon n="panah" s={20} /></span></button><button className="role-card courier" onClick={() => coba('kurir')} disabled={menyiapkan}><span className="role-icon"><Ikon n="ponsel" s={27} /></span><small>UNTUK KURIR</small><h3>Lebih mudah dicatat.<br />Lebih tenang di jalan.</h3><p>Mulai muatan, catat pengantaran, lalu cocokkan setoran lewat HP.</p><span className="role-link">Masuk demo kurir<Ikon n="panah" s={20} /></span></button></section>
        <section className="landing-section" id="fitur">
          <div className="section-intro"><div><div className="eyebrow">LEBIH DARI SEKADAR MENCATAT</div><h2>Kenali selisihnya.<br /><em>Jaga hasil usahanya.</em></h2></div><p>Harga rumah dan toko berbeda. AQUAIR memastikan perbedaan itu punya dasar yang bisa diperiksa.</p></div>
          <div className="feature-spotlight">
            <div className="spotlight-copy"><span className="feature-icon"><Ikon n="perisai" s={27} /></span><h3>Harga toko hanya<br />untuk toko yang terbukti.</h3><p>Scan QR di dalam toko dan cocokkan lokasi HP. Tanpa bukti yang sesuai, penjualan otomatis dihitung dengan harga rumah.</p><div className="proof-item"><Ikon n="cek" /><span>Kurir tetap bisa melanjutkan pengantaran</span></div><div className="proof-item"><Ikon n="cek" /><span>Pemilik depot memegang persetujuan akhir</span></div><button className="text-action" onClick={() => coba('bos')} disabled={menyiapkan}>Lihat di demo pemilik<Ikon n="panah" s={18} /></button></div>
            <div className="calculation-card"><div className="row between"><span className="eyebrow">ILUSTRASI · SATU RIT, 40 GALON</span><Ikon n="uang" /></div><h3>Catatan terlihat wajar.<br />Hitungannya bisa berbeda.</h3><div className="calculation-line"><span>15 toko terverifikasi × Rp3.000</span><b>Rp45.000</b></div><div className="calculation-line"><span>21 toko tanpa bukti × Rp4.000</span><b>Rp84.000</b></div><div className="calculation-line"><span>4 rumah × Rp4.000</span><b>Rp16.000</b></div><div className="calculation-total"><span>Seharusnya disetor<strong>Rp145.000</strong></span><span>Catatan kurir<strong>Rp124.000</strong></span></div><div className="calculation-difference"><Ikon n="awas" s={19} /><span>Selisih yang perlu diperiksa</span><b>Rp21.000</b></div><small>Ilustrasi, bukan hasil uji dampak depot sungguhan.</small></div>
          </div>
          <div className="feature-grid">{FITUR.map(([ikon, judul, isi], i) => <article key={ikon}><span className="feature-icon"><Ikon n={ikon} s={25} /></span><span className="feature-number">0{i + 2}</span><h3>{judul}</h3><p>{isi}</p></article>)}</div>
        </section>
        <section className="workflow-section" id="cara-kerja"><div className="section-intro"><div><div className="eyebrow">ALUR SEDERHANA, CATATAN LENGKAP</div><h2>Dari depot.<br /><em>Kembali ke depot.</em></h2></div><p>Satu alur yang menyambungkan pekerjaan kurir di lapangan dengan pemilik di depot.</p></div><div className="workflow-grid">{[['rit', '01', 'Siapkan rit', 'Kurir menghitung muatan. Pemilik mengecek jumlah galon sebelum perjalanan.'], ['qr', '02', 'Antar & catat', 'Pilih rumah atau scan QR toko. Catat galon isi, galon kosong, dan pembayaran.'], ['radar', '03', 'Cocokkan setoran', 'Uang dan galon dihitung ulang. Selisih serta kejanggalan muncul di Radar.']].map(([ikon, angka, judul, isi]) => <article key={angka}><div className="workflow-top"><span>{angka}</span><Ikon n={ikon} s={26} /></div><h3>{judul}</h3><p>{isi}</p></article>)}</div></section>
        <section className="mobile-section" id="aplikasi"><div className="mobile-art"><div className="mobile-orbit" /><Pratinjau mobile /><span className="mobile-note"><Ikon n="sinyal" s={22} /><span><b>Sinyal hilang?</b><small>Simpan di HP, kirim saat tersambung.</small></span></span></div><div className="mobile-copy"><div className="eyebrow">RINGAN DIBAWA, MUDAH DIPAKAI</div><h2>Teman kurir.<br /><em>Di setiap titik antar.</em></h2><p>Tombol besar, angka jelas, dan langkah yang singkat. Pasang AQUAIR ke layar utama HP untuk akses seperti aplikasi biasa.</p><ul><li><Ikon n="cek" />Dua jalur jelas: jual ke toko atau rumah</li><li><Ikon n="cek" />Pantau sisa muatan dan riwayat penjualan</li><li><Ikon n="cek" />Antrean penjualan saat koneksi terputus</li></ul><button className="btn btn-primary btn-lg" onClick={() => coba('kurir')} disabled={menyiapkan}>Coba sebagai Kurir<Ikon n="panah" s={19} /></button><div className="row" style={{ marginTop: 16 }}><TombolPasang /></div><span className="small muted">Pasang dari browser saat menggunakan alamat HTTPS.</span></div></section>
        <section className="faq-section"><div><div className="eyebrow">SEBELUM MULAI</div><h2>Mungkin ini<br />yang Anda tanyakan.</h2></div><div>{TANYA.map(([judul, isi]) => <details key={judul}><summary>{judul}<span>+</span></summary><p>{isi}</p></details>)}</div></section>
        <section className="landing-final"><div className="final-rings" aria-hidden="true" /><Logo s={58} /><h2>Usaha lebih tertata.<br />Pikiran lebih lega.</h2><p>Kenali AQUAIR lewat depot contoh, lalu mulai dengan depot Anda sendiri.</p><div className="row"><Link className="btn btn-lg" to="/daftar">Daftarkan depot saya<Ikon n="panah" s={19} /></Link><button className="btn btn-ghost btn-lg" onClick={() => coba('bos')} disabled={menyiapkan}>Coba sebagai Bos</button></div></section>
      </main>
      <footer className="site-foot"><div><Link to="/" className="logo"><Logo s={28} />AQUAIR<span className="logo-dot">.</span></Link><p>Air mengalir. Usaha terkendali.</p></div><span>Dibuat untuk Depot Air Minum Isi Ulang di Indonesia.</span><a href="#utama">Kembali ke atas ↑</a></footer>
    </div>
  );
}
