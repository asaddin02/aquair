import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import AuthLayout from '../komponen/AuthLayout';
import { KotakGalat } from '../komponen/umum';
import { useSesi } from '../Sesi';

export default function Daftar() {
  const { masuk } = useSesi();
  const pergi = useNavigate();
  const [isi, setIsi] = useState({ nama_depot: '', kota: '', nama: '', email: '', sandi: '', harga_toko: '3000', harga_rumah: '4000' });
  const [galat, setGalat] = useState(null);
  const [kirim, setKirim] = useState(false);
  const ubah = (k) => (e) => setIsi((x) => ({ ...x, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const toko = Number(isi.harga_toko.replace(/\D/g, ''));
    const rumah = Number(isi.harga_rumah.replace(/\D/g, ''));
    if (isi.sandi.length < 8) return setGalat({ message: 'Kata sandi minimal 8 karakter.' });
    if (rumah <= toko) return setGalat({ message: 'Harga rumah harus lebih tinggi dari harga toko.' });
    setKirim(true);
    setGalat(null);
    try {
      masuk(await api('/auth/daftar', { method: 'POST', body: { ...isi, harga_toko: toko, harga_rumah: rumah }, token: '' }));
      pergi('/bos?baru=1');
    } catch (err) {
      setGalat(err);
    } finally {
      setKirim(false);
    }
  };

  const kolom = (id, label, props = {}, hint) => (
    <label className="field" htmlFor={`dft-${id}`}><span>{label}{hint && <span className="hint"> {hint}</span>}</span>
      <input id={`dft-${id}`} className="input" value={isi[id]} onChange={ubah(id)} {...props} /></label>
  );

  return (
    <AuthLayout daftar>
      <form className="auth lebar register-form" onSubmit={submit}>
        <div className="auth-heading"><span className="eyebrow">LANGKAH PERTAMA, USAHA LEBIH TERTATA</span><h1>Daftarkan depot.</h1></div>
        <p className="muted">Pendaftaran membuat satu depot beserta akun pemiliknya. Kurir dan pelanggan ditambahkan sesudahnya.</p>
        <fieldset className="register-section"><legend><span>01</span> Kenalkan depot Anda</legend><div className="form-grid">{kolom('nama_depot', 'Nama depot', { required: true, placeholder: 'Contoh: Depot Tirta Makmur' })}{kolom('kota', 'Kota atau kabupaten')}</div>
        </fieldset><fieldset className="register-section"><legend><span>02</span> Akun pemilik depot</legend><div className="form-grid">{kolom('nama', 'Nama pemilik', { required: true })}{kolom('email', 'Email', { type: 'email', required: true, autoComplete: 'email' })}</div>
        <div className="form-grid">{kolom('sandi', 'Kata sandi', { type: 'password', required: true, autoComplete: 'new-password', minLength: 8 }, 'minimal 8 karakter')}<span /></div>
        </fieldset><fieldset className="register-section"><legend><span>03</span> Harga penjualan</legend><div className="form-grid">
          <label className="field" htmlFor="dft-harga_toko"><span>Harga toko per galon</span>
            <div className="input-unit"><span>Rp</span><input id="dft-harga_toko" className="num" inputMode="numeric" value={isi.harga_toko} onChange={ubah('harga_toko')} /></div></label>
          <label className="field" htmlFor="dft-harga_rumah"><span>Harga rumah per galon</span>
            <div className="input-unit"><span>Rp</span><input id="dft-harga_rumah" className="num" inputMode="numeric" value={isi.harga_rumah} onChange={ubah('harga_rumah')} /></div></label>
        </div>
        <p className="small muted">Harga bisa diubah kapan saja di Pengaturan.</p></fieldset>
        <KotakGalat galat={galat} />
        <button className="btn btn-primary btn-lg" disabled={kirim}>{kirim ? 'Membuat depot…' : 'Buat depot'}</button>
      </form>
    </AuthLayout>
  );
}
