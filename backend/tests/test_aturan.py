"""Tes mesin aturan. Kasus A dan B diambil persis dari spesifikasi bagian 4.4."""
from datetime import datetime, timedelta, timezone

import pytest

from aquair import aturan as A

KEMARIN, HARI_INI, BESOK = "2026-09-14", "2026-09-15", "2026-09-16"
DEPOT = {"harga_toko": 3000, "harga_rumah": 4000, "radius_m": 75, "garis_dasar_toko": 45, "kebijakan_tanpa_bukti": True}


def pelanggan():
    return [
        {"_id": "sr", "jenis": "toko", "nama": "Toko Sumber Rejeki", "kapasitas": 10, "laku_per_hari": 2, "tanggal_daftar": KEMARIN},
        {"_id": "maju", "jenis": "toko", "nama": "Toko Maju", "kapasitas": 200, "laku_per_hari": 50, "tanggal_daftar": KEMARIN},
        {"_id": "lain", "jenis": "toko", "nama": "Toko Lain", "kapasitas": 200, "laku_per_hari": 50, "tanggal_daftar": KEMARIN},
        {"_id": "bu", "jenis": "rumah", "nama": "Bu Sari"},
    ]


_n = 0


def jual(kurir, tanggal, cid, jenis, galon, status, depot=DEPOT, bayar="tunai", jarak=None, trip="rit-rudi", **lain):
    global _n
    _n += 1
    s = {"_id": f"s{_n}", "kurir_id": kurir, "tanggal": tanggal, "customer_id": cid, "jenis": jenis, "galon_isi": galon,
         "galon_kosong": galon, "bayar": bayar, "status_verifikasi": status, "disetujui_bos": False, "jarak_m": jarak,
         "harga_toko": depot["harga_toko"], "harga_rumah": depot["harga_rumah"], "trip_id": trip,
         "urutan_at": datetime(2026, 9, 15, 1, 0, tzinfo=timezone.utc) + timedelta(minutes=_n)}
    s["harga_berlaku"] = A.harga_berlaku(jenis, status, depot)
    s.update(lain)
    return s


def penjualan_contoh():
    """Kemarin: Dimas mengantar 9 galon terverifikasi ke Sumber Rejeki (stok kemarin 9) dan 11 ke rumah → garis dasar 45%.
    Hari ini: rit Rudi 40 galon sesuai contoh 4.4."""
    kemarin = [jual("dimas", KEMARIN, "sr", "toko", 9, A.TERVERIFIKASI, trip="rit-dimas"),
               jual("dimas", KEMARIN, "bu", "rumah", 11, A.RUMAH, trip="rit-dimas")]
    hari_ini = [
        jual("rudi", HARI_INI, "bu", "rumah", 4, A.RUMAH),
        jual("rudi", HARI_INI, "sr", "toko", 6, A.TERVERIFIKASI),
        jual("rudi", HARI_INI, "lain", "toko", 9, A.TERVERIFIKASI),
        jual("rudi", HARI_INI, "lain", "toko", 18, A.TANPA_QR),
        jual("rudi", HARI_INI, "maju", "toko", 3, A.LOKASI_JAUH, jarak=1200),
    ]
    return kemarin + hari_ini


def rit(disetor):
    return [{"_id": "rit-rudi", "kurir_id": "rudi", "tanggal": HARI_INI, "status": "selesai", "dibawa": 40, "isi_pulang": 0, "uang_disetor": disetor},
            {"_id": "rit-dimas", "kurir_id": "dimas", "tanggal": KEMARIN, "status": "diterima", "dibawa": 20, "isi_pulang": 0, "uang_disetor": 9 * 3000 + 11 * 4000}]


def radar_rudi(disetor, sales=None, customers=None, depot=DEPOT):
    sales = sales or penjualan_contoh()
    tanda = A.hitung_radar(depot=depot, customers=customers or pelanggan(), sales=sales, trips=rit(disetor), confirmations=[], dari=HARI_INI, sampai=HARI_INI)
    return [f for f in tanda if f["kurir_id"] == "rudi"], sales


def per_kode(tanda):
    hasil = {}
    for f in tanda:
        hasil.setdefault(f["kode"], []).append(f)
    return hasil


def test_uang_seharusnya_145000():
    sales = [s for s in penjualan_contoh() if s["kurir_id"] == "rudi"]
    assert A.hitung_setoran(rit(145000)[0], sales)["uang_seharusnya"] == 145000


def test_kasus_a_disetor_pas():
    tanda, _ = radar_rudi(145000)
    k = per_kode(tanda)
    assert set(k) == {"R1", "R2", "R3", "R4"}
    assert k["R1"][0]["perkiraan_rupiah"] == 0
    assert "36 dari 40 galon" in k["R1"][0]["penjelasan"] and "45%" in k["R1"][0]["penjelasan"]
    assert k["R2"][0]["perkiraan_rupiah"] == 21000 and k["R2"][0]["masuk_ke"] == A.TAGIHAN
    assert k["R4"][0]["perkiraan_rupiah"] is None
    assert k["R3"][0]["perkiraan_rupiah"] == 3000 and "masih 7 dari kapasitas 10" in k["R3"][0]["penjelasan"]
    assert A.dua_angka(tanda) == {"tagihan_kembali": 21000, "perkiraan_bocor": 3000}
    assert A.tingkat_risiko(tanda) == "tinggi"


def test_kasus_b_setor_sesuai_catatan_kurir():
    tanda, _ = radar_rudi(124000)
    k = per_kode(tanda)
    assert k["R6"][0]["perkiraan_rupiah"] == 21000
    assert A.dua_angka(tanda) == {"tagihan_kembali": 21000, "perkiraan_bocor": 24000}
    assert A.tingkat_risiko(tanda) == "tinggi"


def test_tagihan_per_hari_tidak_pernah_lebih_dari_galon_kali_selisih():
    tanda, _ = radar_rudi(124000)
    assert A.dua_angka(tanda)["tagihan_kembali"] <= 40 * 1000


def test_stok_r3_esok_hari_mulai_dari_kapasitas():
    sales = penjualan_contoh() + [jual("rudi", BESOK, "sr", "toko", 3, A.TERVERIFIKASI, trip="rit-besok")]
    stok = A.hitung_stok_toko(pelanggan(), sales, BESOK)["sr"]
    assert stok[HARI_INI]["stok"] == 13 and stok[HARI_INI]["lebih"] == 3
    assert stok[BESOK]["sebelum"] == 8 and stok[BESOK]["lebih"] == 1


def test_r3_tidak_menghitung_klaim_tanpa_bukti():
    sales = penjualan_contoh() + [jual("dimas", HARI_INI, "sr", "toko", 20, A.TANPA_QR, trip="rit-dimas2")]
    tanda = A.hitung_radar(depot=DEPOT, customers=pelanggan(), sales=sales, trips=[], confirmations=[], dari=HARI_INI, sampai=HARI_INI)
    r3 = [f for f in tanda if f["kode"] == "R3"]
    assert [f["kurir_id"] for f in r3] == ["rudi"] and r3[0]["perkiraan_rupiah"] == 3000


def test_disetujui_bos_bernilai_rp0():
    sales = penjualan_contoh()
    for s in sales:
        if s["status_verifikasi"] in (A.TANPA_QR, A.LOKASI_JAUH):
            s["disetujui_bos"], s["harga_berlaku"] = True, 3000
    tanda, _ = radar_rudi(145000 - 21000, sales=sales)
    assert "R2" not in per_kode(tanda) and "R4" not in per_kode(tanda)


def test_sakelar_mati_rupiah_r2_pindah_ke_bocor():
    depot = {**DEPOT, "kebijakan_tanpa_bukti": False}
    sales = [jual("rudi", HARI_INI, "lain", "toko", 5, A.TANPA_QR, depot=depot)]
    assert sales[0]["harga_berlaku"] == 3000
    tanda = A.hitung_radar(depot=depot, customers=pelanggan(), sales=sales, trips=[], confirmations=[], dari=HARI_INI, sampai=HARI_INI)
    r2 = per_kode(tanda)["R2"][0]
    assert r2["masuk_ke"] == A.BOCOR and r2["perkiraan_rupiah"] == 5000


def test_status_verifikasi():
    s = lambda **k: A.status_verifikasi(**{"qr_sah": True, "tanpa_qr": False, "jarak": 10, "akurasi": 15, "radius_m": 75, **k})  # noqa: E731
    assert s() == A.TERVERIFIKASI
    assert s(jarak=76) == A.LOKASI_JAUH
    assert s(akurasi=101) == A.LOKASI_LEMAH
    assert s(jarak=None) == A.LOKASI_LEMAH
    assert s(tanpa_qr=True) == A.TANPA_QR


def test_r7_galon_hilang_dan_catatan_lebih():
    trip = {"_id": "t", "kurir_id": "rudi", "tanggal": HARI_INI, "status": "selesai", "dibawa": 40, "isi_pulang": 0, "uang_disetor": 156000}
    sales = [jual("rudi", HARI_INI, "bu", "rumah", 39, A.RUMAH, trip="t")]
    tanda = A.hitung_radar(depot=DEPOT, customers=pelanggan(), sales=sales, trips=[trip], confirmations=[], dari=HARI_INI, sampai=HARI_INI)
    assert per_kode(tanda)["R7"][0]["perkiraan_rupiah"] == 4000
    trip["isi_pulang"] = 2
    tanda = A.hitung_radar(depot=DEPOT, customers=pelanggan(), sales=sales, trips=[trip], confirmations=[], dari=HARI_INI, sampai=HARI_INI)
    assert per_kode(tanda)["R7"][0]["perkiraan_rupiah"] == 0


def test_r8_dikurangi_r3_minggu_yang_sama():
    sales = penjualan_contoh()
    k = {"_id": "k1", "customer_id": "sr", "periode_mulai": KEMARIN, "periode_selesai": HARI_INI, "galon_tercatat": 15,
         "galon_menurut_toko": 10, "jawaban": "berbeda", "tanggal_jawab": HARI_INI}
    tanda = A.hitung_radar(depot=DEPOT, customers=pelanggan(), sales=sales, trips=[], confirmations=[k], dari=HARI_INI, sampai=HARI_INI)
    r8 = per_kode(tanda)["R8"][0]
    # beda 5 galon berharga toko × Rp1.000 − R3 minggu itu Rp3.000
    assert r8["perkiraan_rupiah"] == 2000
    k["galon_menurut_toko"] = 20
    tanda = A.hitung_radar(depot=DEPOT, customers=pelanggan(), sales=sales, trips=[], confirmations=[k], dari=HARI_INI, sampai=HARI_INI)
    assert per_kode(tanda)["R8"][0]["perkiraan_rupiah"] == 0


def test_r5_lompatan_lokasi():
    t0 = datetime(2026, 9, 15, 1, 0, tzinfo=timezone.utc)
    a = jual("rudi", HARI_INI, "bu", "rumah", 1, A.RUMAH, lat=-6.1754, lng=106.8272, urutan_at=t0)
    b = jual("rudi", HARI_INI, "bu", "rumah", 1, A.RUMAH, lat=-6.1934, lng=106.8272, urutan_at=t0 + timedelta(minutes=1))
    tanda = A.hitung_radar(depot=DEPOT, customers=pelanggan(), sales=[a, b], trips=[], confirmations=[], dari=HARI_INI, sampai=HARI_INI)
    assert per_kode(tanda)["R5"][0]["sale_id"] == b["_id"]
    assert A.tingkat_risiko(tanda) == "sedang"


def test_status_tindak_lanjut_tidak_hilang():
    lama, sales = radar_rudi(145000)
    for f in lama:
        f["status"] = "sudah_dicek_aman"
    baru, _ = radar_rudi(145000, sales=sales)
    assert all(f["status"] == "sudah_dicek_aman" for f in A.gabung_status(baru, lama))
    assert A.dua_angka(baru) == {"tagihan_kembali": 0, "perkiraan_bocor": 0}
    assert A.tingkat_risiko(baru) == "rendah"


@pytest.mark.parametrize("galon,verif,harapan", [(40, 36, True), (9, 9, False)])
def test_r1_hanya_bila_minimal_10_galon(galon, verif, harapan):
    sales = [jual("rudi", HARI_INI, "lain", "toko", verif, A.TERVERIFIKASI), jual("rudi", HARI_INI, "bu", "rumah", galon - verif, A.RUMAH)]
    tanda = A.hitung_radar(depot={**DEPOT, "garis_dasar_toko": 50}, customers=pelanggan(), sales=[s for s in sales if s["galon_isi"]],
                           trips=[], confirmations=[], dari=HARI_INI, sampai=HARI_INI)
    assert ("R1" in per_kode(tanda)) is harapan
