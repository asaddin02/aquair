"""Tes API produk & harga, penjualan multi-produk, rit yang belum ditutup, penjualan di depot (spesifikasi 3, 6.1, 6.2)."""
import uuid
from datetime import timedelta

import pytest

from aquair.inti import db, sekarang
from tests.test_api import depot_sungguhan, h, klien  # noqa: F401  (fixture dipakai ulang)

pytestmark = pytest.mark.asyncio(loop_scope="session")


async def buat_produk(klien, bos, **x):
    data = {"satuan": "pcs", "kategori": "lainnya", "dijual_kurir": True, "dijual_depot": False, "pakai_kosong": False, **x}
    r = await klien.post("/api/bos/produk", headers=h(bos), json=data)
    assert r.status_code == 200, r.text
    return r.json()


async def test_katalog_produk_dan_validasi(klien):
    a = await depot_sungguhan(klien, "Produk")
    bos, kurir = a["bos"], a["kurir"]
    lpg = await buat_produk(klien, bos, nama="LPG 3 kg", kategori="lpg", satuan="tabung", harga_rumah=22000, harga_toko=21000, pakai_kosong=True)
    await buat_produk(klien, bos, nama="Isi wadah kecil", kategori="wadah_kecil", satuan="wadah", harga_rumah=2000, dijual_kurir=False, dijual_depot=True)
    salah = [({"nama": "Air mahal", "harga_rumah": 5000, "harga_toko": 5000}, 400), ({"nama": "lpg 3 KG", "harga_rumah": 1000}, 409),
             ({"nama": "Tanpa cara jual", "harga_rumah": 1000, "dijual_kurir": False}, 400)]
    for data, kode in salah:
        r = await klien.post("/api/bos/produk", headers=h(bos), json={"satuan": "pcs", "kategori": "lainnya", **data})
        assert r.status_code == kode, (data, r.text)
    daftar = (await klien.get("/api/bos/produk", headers=h(bos))).json()["produk"]
    assert daftar[0]["id"] == "utama" and daftar[0]["harga_toko"] == 3000 and len(daftar) == 3
    assert (await klien.put("/api/bos/produk/utama", headers=h(bos), json={**daftar[1], "harga_rumah": 1})).status_code == 400
    untuk_kurir = (await klien.get("/api/kurir/produk", headers=h(kurir))).json()
    assert [p["nama"] for p in untuk_kurir] == ["Isi ulang galon", "LPG 3 kg"]
    assert (await klien.get("/api/bos/produk", headers=h(kurir))).status_code == 403
    lain = await depot_sungguhan(klien, "LainProduk")
    assert (await klien.put(f"/api/bos/produk/{lpg['id']}", headers=h(lain["bos"]), json={**daftar[1]})).status_code == 404


async def test_penjualan_multi_produk_muatan_dan_setoran(klien):
    a = await depot_sungguhan(klien, "Multi")
    bos, kurir, qr = a["bos"], a["kurir"], a["qr"]
    lpg = await buat_produk(klien, bos, nama="LPG 3 kg", kategori="lpg", satuan="tabung", harga_rumah=22000, harga_toko=21000, pakai_kosong=True)
    merek = await buat_produk(klien, bos, nama="Air galon bermerek", kategori="air_kemasan", satuan="galon", harga_rumah=21000, pakai_kosong=True)
    baru = await buat_produk(klien, bos, nama="Galon baru", kategori="galon_baru", satuan="galon", harga_rumah=35000)
    # Tutup rit bawaan fixture, lalu mulai rit dengan muatan per produk.
    lama = (await klien.get("/api/kurir/beranda", headers=h(kurir))).json()
    await klien.post("/api/kurir/rit/selesai", headers=h(kurir), json={"isi_pulang": lama["setoran"]["galon_di_motor"], "kosong_pulang": 0,
                                                                       "uang_disetor": lama["setoran"]["uang_seharusnya"]})
    r = await klien.post("/api/kurir/rit/mulai", headers=h(kurir), json={"dibawa": 10, "muatan_lain": [{"produk_id": lpg["id"], "dibawa": 3},
                                                                                                     {"produk_id": merek["id"], "dibawa": 2}]})
    assert r.status_code == 200 and len(r.json()["muatan_lain"]) == 2
    body = {"client_id": uuid.uuid4().hex, "jenis": "toko", "qr_token": qr, "lat": -6.2, "lng": 106.8, "akurasi_m": 10,
            "baris": [{"produk_id": "utama", "galon_isi": 3, "galon_kosong": 3}, {"produk_id": lpg["id"], "galon_isi": 1, "galon_kosong": 1},
                      {"produk_id": merek["id"], "galon_isi": 1, "galon_kosong": 1}]}
    r = await klien.post("/api/kurir/penjualan", headers=h(kurir), json=body)
    assert r.status_code == 200, r.text
    baris = r.json()["baris"]
    assert [x["harga_berlaku"] for x in baris] == [3000, 21000, 21000] and {x["status_verifikasi"] for x in baris} == {"terverifikasi"}
    ulang = (await klien.post("/api/kurir/penjualan", headers=h(kurir), json=body)).json()
    assert ulang["duplikat"] is True and len(ulang["baris"]) == 3
    assert await db().sales.count_documents({"kunjungan_id": body["client_id"]}) == 3
    tolak = [{"produk_id": baru["id"], "galon_isi": 1}, {"produk_id": "tidak-ada", "galon_isi": 1}]
    for x in tolak:
        r = await klien.post("/api/kurir/penjualan", headers=h(kurir), json={**body, "client_id": uuid.uuid4().hex, "baris": [x]})
        assert r.status_code == 400, r.text

    st = (await klien.get("/api/kurir/beranda", headers=h(kurir))).json()["setoran"]
    assert st["uang_seharusnya"] == 3 * 3000 + 21000 + 21000 and st["galon_catatan"] == 3 and st["kosong_catatan"] == 3
    r = await klien.post("/api/kurir/rit/selesai", headers=h(kurir), json={"isi_pulang": 7, "kosong_pulang": 1, "uang_disetor": st["uang_seharusnya"]})
    assert r.status_code == 400 and "LPG 3 kg" in r.json()["detail"]
    lain = [{"produk_id": lpg["id"], "isi_pulang": 2, "kosong_pulang": 1}, {"produk_id": merek["id"], "isi_pulang": 0, "kosong_pulang": 1}]
    r = await klien.post("/api/kurir/rit/selesai", headers=h(kurir), json={"isi_pulang": 7, "kosong_pulang": 1, "uang_disetor": st["uang_seharusnya"], "lain": lain})
    assert r.status_code == 200, r.text
    radar = (await klien.get("/api/bos/radar?hari=1", headers=h(bos))).json()["kelompok"]
    tanda = [f for g in radar for f in g["tanda"]]
    assert any(f["kode"] == "R9" and "catatan 3 galon" in f["penjelasan"] for f in tanda)
    assert any(f["kode"] == "R7" and "Air galon bermerek" in f["penjelasan"] and f["perkiraan_rupiah"] == 21000 for f in tanda)
    assert not any(f["kode"] == "R7" and "LPG" in f["penjelasan"] for f in tanda)
    csv = (await klien.get("/api/bos/unduh?jenis=penjualan", headers=h(bos))).text
    assert "LPG 3 kg;tabung" in csv


async def test_persetujuan_harga_toko_berlaku_untuk_semua_baris(klien):
    a = await depot_sungguhan(klien, "Setuju")
    bos, kurir, toko = a["bos"], a["kurir"], a["toko"]
    lpg = await buat_produk(klien, bos, nama="LPG 3 kg", kategori="lpg", satuan="tabung", harga_rumah=22000, harga_toko=21000, pakai_kosong=True)
    rit = (await klien.get("/api/bos/rit", headers=h(bos))).json()["rit"][0]
    assert (await klien.post(f"/api/bos/rit/{rit['id']}/muatan", headers=h(bos), json={"muatan_lain": [{"produk_id": lpg["id"], "dibawa": 2}]})).status_code == 400
    r = await klien.post(f"/api/bos/rit/{rit['id']}/muatan", headers=h(bos), json={"alasan": "LPG ikut dibawa", "muatan_lain": [{"produk_id": lpg["id"], "dibawa": 2}]})
    assert r.status_code == 200
    r = await klien.post("/api/kurir/penjualan", headers=h(kurir), json={
        "client_id": uuid.uuid4().hex, "jenis": "toko", "tanpa_qr_customer_id": toko["id"],
        "baris": [{"produk_id": "utama", "galon_isi": 2}, {"produk_id": lpg["id"], "galon_isi": 1, "galon_kosong": 1}]})
    assert r.status_code == 200, r.text
    pertama, kedua = r.json()["baris"]
    assert (pertama["harga_berlaku"], kedua["harga_berlaku"]) == (4000, 22000)
    assert (await klien.post(f"/api/kurir/penjualan/{pertama['id']}/minta-harga-toko", headers=h(kurir), json={"alasan": "Stiker rusak"})).status_code == 200
    pengajuan = next(x for x in (await klien.get("/api/bos/persetujuan", headers=h(bos))).json()["menunggu"] if x["sale_id"] == pertama["id"])
    r = await klien.post(f"/api/bos/persetujuan/{pengajuan['id']}", headers=h(bos), json={"keputusan": "setuju", "alasan": "Dicek lewat telepon"})
    assert r.status_code == 200
    harga = {x["_id"]: x["harga_berlaku"] async for x in db().sales.find({"kunjungan_id": pertama["kunjungan_id"]})}
    assert harga == {pertama["id"]: 3000, kedua["id"]: 21000}


async def test_rit_kemarin_wajib_ditutup_dulu(klien):
    a = await depot_sungguhan(klien, "Kemarin")
    bos, kurir, rumah = a["bos"], a["kurir"], a["rumah"]
    rit = (await klien.get("/api/bos/rit", headers=h(bos))).json()["rit"][0]
    kemarin = (sekarang() - timedelta(days=1))
    from aquair.inti import tanggal_wib
    await db().trips.update_one({"_id": rit["id"]}, {"$set": {"tanggal": tanggal_wib(kemarin), "berangkat_at": kemarin - timedelta(hours=1)}})
    jual = lambda **x: klien.post("/api/kurir/penjualan", headers=h(kurir), json={"client_id": uuid.uuid4().hex, "jenis": "rumah",  # noqa: E731
                                                                                   "customer_id": rumah["id"], "galon_isi": 1, **x})
    r = await jual()
    assert r.status_code == 409 and "belum ditutup" in r.json()["detail"]
    assert (await jual(dicatat_offline=True, waktu_hp=kemarin.isoformat())).status_code == 200
    beranda = (await klien.get("/api/kurir/beranda", headers=h(kurir))).json()
    assert beranda["rit_perlu_ditutup"] is True
    das = (await klien.get("/api/bos/dasbor", headers=h(bos))).json()
    assert [x["id"] for x in das["rit_belum_ditutup"]] == [rit["id"]]
    st = beranda["setoran"]
    r = await klien.post("/api/kurir/rit/selesai", headers=h(kurir), json={"isi_pulang": st["galon_di_motor"], "kosong_pulang": st["kosong_catatan"],
                                                                           "uang_disetor": st["uang_seharusnya"]})
    assert r.status_code == 200
    assert (await klien.get("/api/bos/dasbor", headers=h(bos))).json()["rit_belum_ditutup"] == []
    assert (await klien.post("/api/kurir/rit/mulai", headers=h(kurir), json={"dibawa": 5})).status_code == 200
    assert (await jual()).status_code == 200


async def test_penjualan_di_depot(klien):
    a = await depot_sungguhan(klien, "Depot")
    b = await depot_sungguhan(klien, "DepotLain")
    bos = a["bos"]
    wadah = await buat_produk(klien, bos, nama="Isi wadah kecil", kategori="wadah_kecil", satuan="wadah", harga_rumah=2000,
                              dijual_kurir=False, dijual_depot=True)
    lpg = await buat_produk(klien, bos, nama="LPG 3 kg", kategori="lpg", satuan="tabung", harga_rumah=22000)
    assert (await klien.post("/api/bos/penjualan-depot", headers=h(bos), json={"produk_id": lpg["id"], "jumlah": 1})).status_code == 400
    x = (await klien.post("/api/bos/penjualan-depot", headers=h(bos), json={"produk_id": wadah["id"], "jumlah": 3})).json()
    await klien.post("/api/bos/penjualan-depot", headers=h(bos), json={"produk_id": wadah["id"], "jumlah": 2})
    hari = (await klien.get("/api/bos/penjualan-depot", headers=h(bos))).json()
    assert hari["total"] == 10000 and hari["jumlah_transaksi"] == 2 and hari["produk"][0]["id"] == wadah["id"]
    assert (await klien.get("/api/bos/dasbor", headers=h(bos))).json()["hari_ini"]["uang_depot"] == 10000
    assert (await klien.post(f"/api/bos/penjualan-depot/{x['id']}/batal", headers=h(b["bos"]), json={"alasan": "Salah catat"})).status_code == 404
    assert (await klien.post(f"/api/bos/penjualan-depot/{x['id']}/batal", headers=h(bos), json={"alasan": "Salah catat"})).status_code == 200
    assert (await klien.post(f"/api/bos/penjualan-depot/{x['id']}/batal", headers=h(bos), json={"alasan": "Salah catat"})).status_code == 409
    assert (await klien.get("/api/bos/penjualan-depot", headers=h(bos))).json()["total"] == 4000
    csv = await klien.get("/api/bos/unduh?jenis=depot", headers=h(bos))
    assert csv.status_code == 200 and "Isi wadah kecil;3;wadah;2000;6000" in csv.text and ";ya;Salah catat" in csv.text
    assert (await klien.get("/api/bos/penjualan-depot", headers=h(b["bos"]))).json()["total"] == 0


async def test_demo_berisi_produk_contoh(klien):
    demo = (await klien.post("/api/demo/mulai", headers={"X-Forwarded-For": "uji-demo-produk"}, json={})).json()
    bos, kurir = demo["token_bos"], demo["token_kurir"]
    assert len((await klien.get("/api/bos/produk", headers=h(bos))).json()["produk"]) == 4
    das = (await klien.get("/api/bos/dasbor", headers=h(bos))).json()
    assert das["hari_ini"]["uang_depot"] == 7 * 2000 and das["hari_ini"]["produk_lain"]
    assert das["rit_belum_ditutup"] == []
    beranda = (await klien.get("/api/kurir/beranda", headers=h(kurir))).json()
    assert {p["nama"] for p in beranda["setoran"]["produk_lain"]} == {"LPG 3 kg", "Air galon bermerek"}
    radar = (await klien.get("/api/bos/radar?hari=30", headers=h(bos))).json()["kelompok"]
    assert not any(f["kode"] == "R7" and ("LPG" in f["penjelasan"] or "bermerek" in f["penjelasan"]) for g in radar for f in g["tanda"])
    assert not any(f["kode"] == "R9" for g in radar for f in g["tanda"]), "data demo tidak boleh memunculkan R9 palsu"
