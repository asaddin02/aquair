import Ikon, { Logo } from './Ikon';

// Seluruh angka di pratinjau adalah ilustrasi, bukan hasil pengukuran dampak.
export default function Pratinjau({ mobile = false }) {
  if (mobile) return (
    <div className="preview-phone">
      <div className="phone-time"><span>09:41</span><span><Ikon n="sinyal" s={14} /> 100%</span></div>
      <div className="phone-greeting"><div><small>SELAMAT PAGI</small><h3>Siap antar hari ini?</h3></div><span className="preview-avatar">K</span></div>
      <div className="phone-balance"><span className="row between"><span>Rit sedang berjalan</span><Ikon n="rit" /></span><strong>28 <small>galon di motor</small></strong><div className="preview-progress"><i /></div><small>12 dari 40 galon sudah diantar</small></div>
      <div className="phone-action"><Ikon n="qr" s={27} /><div><b>Jual ke toko</b><small>Scan QR di lokasi toko</small></div><Ikon n="kanan" s={18} /></div>
      <div className="phone-action secondary"><Ikon n="rumah" s={27} /><div><b>Jual ke rumah</b><small>Catat, simpan, lanjut antar</small></div><Ikon n="kanan" s={18} /></div>
      <div className="preview-section-title">Aktivitas terakhir <span>Hari ini</span></div>
      <div className="preview-sale"><span className="preview-icon"><Ikon n="toko" /></span><div><b>Toko Sumber Rezeki</b><small>3 galon · tunai</small></div><Ikon n="cek" /></div>
      <div className="preview-sale"><span className="preview-icon"><Ikon n="rumah" /></span><div><b>Rumah Melati 12</b><small>2 galon · tunai</small></div><Ikon n="cek" /></div>
      <div className="phone-bottom"><span><Ikon n="dasbor" s={18} />Beranda</span><span><Ikon n="qr" s={18} />Jual ke toko</span><span><Ikon n="rumah" s={18} />Jual ke rumah</span></div>
    </div>
  );
  return (
    <div className="preview-dashboard">
      <div className="preview-toolbar"><span className="logo"><Logo s={23} />AQUAIR</span><span className="preview-address"><Ikon n="kunci" s={11} /> Ruang pemilik depot</span><span className="preview-avatar">P</span></div>
      <div className="preview-layout">
        <div className="preview-sidebar"><span className="selected"><Ikon n="dasbor" />Dasbor</span><span><Ikon n="radar" />Radar</span><span><Ikon n="rit" />Rit & setoran</span><span><Ikon n="orang" />Pelanggan</span><span><Ikon n="galon" />Galon</span><div className="preview-sidebar-bottom"><Ikon n="perisai" s={22} /><small>Depot dalam<br />genggaman.</small></div></div>
        <div className="preview-content"><div className="preview-heading"><div><small>DEPOT TIRTA SEJAHTERA</small><h3>Ringkasan depot</h3></div><span className="preview-tag">Ilustrasi</span></div>
          <div className="preview-stats"><div><span>Seharusnya disetor</span><strong>Rp145.000</strong><small>40 galon dalam satu rit</small></div><div><span>Selisih setoran</span><strong>Rp21.000</strong><small className="danger-t">Perlu diperiksa</small></div></div>
          <div className="preview-chart"><div className="preview-section-title">Penjualan per jenis <span>40 galon</span></div><div className="preview-bar-label"><span>Toko terverifikasi</span><b>15</b></div><div className="preview-bar"><i style={{ width: '37.5%' }} /></div><div className="preview-bar-label"><span>Toko tanpa bukti</span><b>21</b></div><div className="preview-bar light"><i style={{ width: '52.5%' }} /></div><div className="preview-bar-label"><span>Rumah</span><b>4</b></div><div className="preview-bar pale"><i style={{ width: '10%' }} /></div></div>
          <div className="preview-alert"><span className="preview-icon"><Ikon n="perisai" /></span><div><b>Harga toko harus ada buktinya.</b><small>QR sah + lokasi sesuai = harga toko.</small></div><Ikon n="cek" s={18} /></div>
        </div>
      </div>
    </div>
  );
}
