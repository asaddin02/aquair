"""Tes buku kas bos: uang masuk, pengeluaran, untung per periode, bon, dan isolasi antar depot (spesifikasi 6.3)."""
import uuid

import pytest

from aquair import aturan as A
from aquair.inti import tanggal_wib
from tests.test_api import depot_sungguhan, h, klien  # noqa: F401  (fixture dipakai ulang)
from tests.test_produk import buat_produk

pytestmark = pytest.mark.asyncio(loop_scope="session")


async def catat(klien, bos, **x):
    r = await klien.post("/api/bos/pengeluaran", headers=h(bos), json={"kategori": "lainnya", "keterangan": "Pengeluaran uji", "jumlah": 1000, **x})
    assert r.status_code == 200, r.text
    return r.json()


async def buku(klien, bos, **q):
    r = await klien.get("/api/bos/keuangan", headers=h(bos), params={"periode": "hari", **q})
    assert r.status_code == 200, r.text
    return r.json()


async def test_untung_hari_ini_dari_penjualan_dan_pengeluaran(klien):
    a = await depot_sungguhan(klien, "Kas")
    bos = a["bos"]
    # Fixture sudah menjual 3 galon terverifikasi ke toko: 3 × Rp3.000.
    wadah = await buat_produk(klien, bos, nama="Isi wadah kecil", kategori="wadah_kecil", satuan="wadah", harga_rumah=2000,
                              dijual_kurir=False, dijual_depot=True)
    await klien.post("/api/bos/penjualan-depot", headers=h(bos), json={"produk_id": wadah["id"], "jumlah": 3})
    await catat(klien, bos, kategori="transport", keterangan="Isi bensin motor antar", jumlah=50_000)
    await catat(klien, bos, kategori="bahan", keterangan="Beli air baku satu tangki", jumlah=200_000)

    k = await buku(klien, bos)
    assert k["masuk"] == {"penjualan_kurir": 9000, "penjualan_depot": 6000, "pelunasan_bon": 0, "total": 15000}
    assert k["keluar"]["total"] == 250_000 and k["keluar"]["jumlah_catatan"] == 2
    assert [x["kode"] for x in k["keluar"]["per_kategori"]] == ["bahan", "transport"]
    assert k["untung"] == 15000 - 250_000 and k["untung_per_hari"] == k["untung"]
    assert k["jumlah_hari"] == 1 and k["rentang"] == {"dari": tanggal_wib(), "sampai": tanggal_wib()}
    assert k["harian"] == [{"tanggal": tanggal_wib(), "masuk": 15000, "keluar": 250_000, "untung": 15000 - 250_000}]


async def test_bon_dihitung_saat_dilunasi_bukan_saat_dicatat(klien):
    a = await depot_sungguhan(klien, "Bon")
    bos, kurir = a["bos"], a["kurir"]
    langganan = (await klien.post("/api/bos/pelanggan", headers=h(bos), json={"nama": "Bu Sari", "jenis": "rumah", "boleh_bon": True})).json()
    r = await klien.post("/api/kurir/penjualan", headers=h(kurir), json={"client_id": uuid.uuid4().hex, "jenis": "rumah",
                                                                         "customer_id": langganan["id"], "galon_isi": 2, "bayar": "bon"})
    assert r.status_code == 200, r.text

    sebelum = await buku(klien, bos)
    assert sebelum["masuk"]["penjualan_kurir"] == 9000 and sebelum["masuk"]["pelunasan_bon"] == 0
    assert sebelum["bon_belum_lunas"] == 8000, "bon belum dibayar tidak boleh ikut dihitung sebagai uang masuk"

    assert (await klien.post(f"/api/bos/bon/{langganan['id']}/lunas", headers=h(bos))).status_code == 200
    sesudah = await buku(klien, bos)
    assert sesudah["masuk"]["pelunasan_bon"] == 8000 and sesudah["masuk"]["total"] == 17000
    assert sesudah["bon_belum_lunas"] == 0 and sesudah["untung"] == 17000


async def test_periode_siap_pakai_dan_rentang_pilihan_sendiri(klien):
    a = await depot_sungguhan(klien, "Periode")
    bos = a["bos"]
    hari_ini = tanggal_wib()
    tiga_hari_lalu = A.geser_tanggal(hari_ini, -3)
    await catat(klien, bos, kategori="listrik", keterangan="Tagihan listrik dan air", jumlah=485_000, tanggal=tiga_hari_lalu)
    await catat(klien, bos, kategori="gaji", keterangan="Upah mingguan kurir", jumlah=500_000)

    assert (await buku(klien, bos, periode="hari"))["keluar"]["total"] == 500_000
    minggu = await buku(klien, bos, periode="minggu")
    assert minggu["keluar"]["total"] == 985_000 and minggu["jumlah_hari"] == 7
    khusus = await buku(klien, bos, periode="khusus", dari=tiga_hari_lalu, sampai=tiga_hari_lalu)
    assert khusus["keluar"]["total"] == 485_000 and khusus["jumlah_hari"] == 1
    bulan = await buku(klien, bos, periode="bulan")
    assert bulan["rentang"]["dari"] == f"{hari_ini[:7]}-01" and bulan["rentang"]["sampai"] == hari_ini

    salah = [{"periode": "khusus", "dari": hari_ini, "sampai": tiga_hari_lalu}, {"periode": "khusus", "dari": "2020-01-01", "sampai": hari_ini}]
    for q in salah:
        assert (await klien.get("/api/bos/keuangan", headers=h(bos), params=q)).status_code == 400, q
    assert (await klien.get("/api/bos/keuangan", headers=h(bos), params={"periode": "khusus", "dari": "kemarin"})).status_code == 422
    besok = A.geser_tanggal(hari_ini, 1)
    r = await klien.post("/api/bos/pengeluaran", headers=h(bos), json={"kategori": "sewa", "keterangan": "Sewa bulan depan", "jumlah": 800_000, "tanggal": besok})
    assert r.status_code == 400 and "masa depan" in r.json()["detail"]


async def test_pengeluaran_milik_depot_sendiri_dan_hanya_bos(klien):
    a = await depot_sungguhan(klien, "KasA")
    b = await depot_sungguhan(klien, "KasB")
    milik_a = await catat(klien, a["bos"], kategori="sewa", keterangan="Sewa tempat depot", jumlah=800_000)

    assert (await klien.get("/api/bos/keuangan", headers=h(b["bos"]), params={"periode": "hari"})).json()["keluar"]["total"] == 0
    assert (await klien.delete(f"/api/bos/pengeluaran/{milik_a['id']}", headers=h(b["bos"]))).status_code == 404
    assert (await klien.get("/api/bos/keuangan", headers=h(a["kurir"]), params={"periode": "hari"})).status_code == 403
    assert (await klien.post("/api/bos/pengeluaran", headers=h(a["kurir"]),
                             json={"kategori": "lainnya", "keterangan": "Coba dari kurir", "jumlah": 5000})).status_code == 403
    assert (await buku(klien, a["bos"]))["keluar"]["total"] == 800_000


async def test_hapus_pengeluaran_dan_unduh_csv(klien):
    a = await depot_sungguhan(klien, "KasCsv")
    bos = a["bos"]
    x = await catat(klien, bos, kategori="perawatan", keterangan="Ganti filter sedimen", jumlah=350_000)
    await catat(klien, bos, kategori="galon", keterangan="Beli galon kosong dan tutup", jumlah=600_000)

    csv = await klien.get("/api/bos/unduh?jenis=pengeluaran", headers=h(bos))
    assert csv.status_code == 200 and "aquair-pengeluaran-" in csv.headers["Content-Disposition"]
    assert "Perawatan & suku cadang;Ganti filter sedimen;350000" in csv.text and csv.headers["X-Jumlah-Baris"] == "2"

    assert (await klien.delete(f"/api/bos/pengeluaran/{x['id']}", headers=h(bos))).status_code == 200
    assert (await klien.delete(f"/api/bos/pengeluaran/{x['id']}", headers=h(bos))).status_code == 404
    k = await buku(klien, bos)
    assert k["keluar"]["total"] == 600_000 and len(k["pengeluaran"]) == 1
    aksi = [c["aksi"] for c in (await klien.get("/api/bos/audit?batas=30", headers=h(bos))).json()]
    assert "Hapus pengeluaran Perawatan & suku cadang" in aksi and "Catat pengeluaran Galon, tutup & segel" in aksi


async def test_depot_contoh_punya_buku_kas_terisi(klien):
    demo = (await klien.post("/api/demo/mulai", headers={"X-Forwarded-For": "uji-demo-keuangan"}, json={})).json()
    bos = demo["token_bos"]
    hari_ini = tanggal_wib()
    k = await buku(klien, bos, periode="khusus", dari=A.geser_tanggal(hari_ini, -29), sampai=hari_ini)
    assert k["masuk"]["penjualan_kurir"] > 0 and k["masuk"]["penjualan_depot"] > 0
    assert k["keluar"]["total"] > 0 and k["untung"] > 0, "depot contoh harus memperlihatkan usaha yang untung"
    assert {x["kode"] for x in k["keluar"]["per_kategori"]} >= {"gaji", "listrik", "bahan", "transport"}
    assert (await buku(klien, bos, periode="hari"))["keluar"]["total"] > 0, "hari ini juga harus ada contoh pengeluaran"
    assert len(k["harian"]) == 30 and sum(d["untung"] for d in k["harian"]) == k["untung"]
    per = {p["nama"]: p for p in k["produk"]}
    assert per["LPG 3 kg"]["untung_kotor"] == 2 * (22000 - 19500) and per["Air galon bermerek"]["untung_kotor"] == 21000 - 18000
    assert per["Isi ulang galon"]["ada_modal"] is False and per["Isi wadah kecil"]["ada_modal"] is False
    assert k["untung_kotor_produk"] == 2 * (22000 - 19500) + (21000 - 18000)


async def test_untung_kotor_per_produk_pakai_modal_saat_transaksi(klien):
    a = await depot_sungguhan(klien, "Modal")
    bos, kurir, rumah = a["bos"], a["kurir"], a["rumah"]
    lpg = await buat_produk(klien, bos, nama="LPG 3 kg", kategori="lpg", satuan="tabung", harga_rumah=22000, harga_beli=19500, pakai_kosong=True)
    wadah = await buat_produk(klien, bos, nama="Isi wadah kecil", kategori="wadah_kecil", satuan="wadah", harga_rumah=2000,
                              harga_beli=500, dijual_kurir=False, dijual_depot=True)
    salah = {"nama": "Galon baru", "kategori": "galon_baru", "satuan": "galon", "harga_rumah": 35000, "harga_beli": 35000}
    assert (await klien.post("/api/bos/produk", headers=h(bos), json=salah)).status_code == 400, "modal tidak boleh ≥ harga jual"

    rit = (await klien.get("/api/bos/rit", headers=h(bos))).json()["rit"][0]
    assert (await klien.post(f"/api/bos/rit/{rit['id']}/muatan", headers=h(bos),
                             json={"alasan": "LPG ikut dibawa", "muatan_lain": [{"produk_id": lpg["id"], "dibawa": 3}]})).status_code == 200
    r = await klien.post("/api/kurir/penjualan", headers=h(kurir), json={"client_id": uuid.uuid4().hex, "jenis": "rumah",
                                                                         "customer_id": rumah["id"],
                                                                         "baris": [{"produk_id": lpg["id"], "galon_isi": 2, "galon_kosong": 2}]})
    assert r.status_code == 200, r.text
    await klien.post("/api/bos/penjualan-depot", headers=h(bos), json={"produk_id": wadah["id"], "jumlah": 3})

    k = await buku(klien, bos)
    per = {p["nama"]: p for p in k["produk"]}
    assert per["LPG 3 kg"] == {"produk_id": lpg["id"], "utama": False, "nama": "LPG 3 kg", "satuan": "tabung", "jumlah": 2,
                               "omzet": 44000, "modal": 39000, "ada_modal": True, "untung_kotor": 5000}
    assert per["Isi wadah kecil"]["untung_kotor"] == 4500 and per["Isi wadah kecil"]["omzet"] == 6000
    assert per["Isi ulang galon"]["ada_modal"] is False and per["Isi ulang galon"]["untung_kotor"] is None, "air produksi sendiri tanpa modal"
    assert per["Isi ulang galon"]["utama"] is True and per["Isi wadah kecil"]["utama"] is False
    assert per["Isi ulang galon"]["omzet"] == 9000
    assert k["untung_kotor_produk"] == 9500
    assert k["masuk"]["total"] == 9000 + 44000 + 6000, "untung kotor produk tidak mengubah hitungan buku kas"

    # Modal dinaikkan hari ini: catatan penjualan lama tetap memakai modal saat transaksi.
    assert (await klien.put(f"/api/bos/produk/{lpg['id']}", headers=h(bos),
                            json={**{x: lpg[x] for x in ("nama", "kategori", "satuan", "harga_rumah", "harga_toko", "dijual_kurir",
                                                         "dijual_depot", "pakai_kosong", "aktif")}, "harga_beli": 21000})).status_code == 200
    ulang = await buku(klien, bos)
    assert {p["nama"]: p["untung_kotor"] for p in ulang["produk"]}["LPG 3 kg"] == 5000
