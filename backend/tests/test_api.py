"""Tes API dengan MongoDB sungguhan (database uji terpisah). Mencakup daftar pembuktian di docs/05 bagian D.

Jalankan: MONGO_URL=mongodb://127.0.0.1:27717 .venv/bin/python -m pytest -q
"""
import os
import uuid

import httpx
import pytest
import pytest_asyncio

os.environ["DB_NAME"] = "aquair_uji_api"
os.environ.setdefault("MONGO_URL", "mongodb://127.0.0.1:27717")

from aquair.inti import db, siapkan_indeks  # noqa: E402
from server import app  # noqa: E402

pytestmark = pytest.mark.asyncio(loop_scope="session")


@pytest_asyncio.fixture(scope="session", loop_scope="session")
async def klien():
    await db().client.drop_database(os.environ["DB_NAME"])
    await siapkan_indeks()
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://uji") as c:
        yield c


def h(token):
    return {"Authorization": f"Bearer {token}"}


async def depot_sungguhan(klien, nama):
    email = f"{nama.lower()}-{uuid.uuid4().hex[:6]}@contoh.id"
    r = await klien.post("/api/auth/daftar", json={"nama_depot": f"Depot {nama}", "nama": f"Bos {nama}", "email": email, "sandi": "rahasia123"})
    assert r.status_code == 200, r.text
    bos = r.json()["token"]
    hp = "08" + str(uuid.uuid4().int)[:10]
    r = await klien.post("/api/bos/kurir", headers=h(bos), json={"nama": f"Kurir {nama}", "no_hp": hp})
    assert r.status_code == 200, r.text
    pin = r.json()["pin"]
    r = await klien.post("/api/auth/masuk-kurir", json={"no_hp": hp, "pin": pin})
    assert r.status_code == 200, r.text
    kurir = r.json()["token"]
    toko = (await klien.post("/api/bos/pelanggan", headers=h(bos), json={"nama": "=HYPERLINK(1)" if nama == "A" else f"Toko {nama}", "jenis": "toko",
                                                                          "lat": -6.2, "lng": 106.8, "kapasitas": 10, "laku_per_hari": 2})).json()
    rumah = (await klien.post("/api/bos/pelanggan", headers=h(bos), json={"nama": f"Rumah {nama}", "jenis": "rumah"})).json()
    qr = next(t["qr_token"] for t in (await klien.get("/api/bos/qr", headers=h(bos))).json()["toko"] if t["id"] == toko["id"])
    assert (await klien.post("/api/kurir/rit/mulai", headers=h(kurir), json={"dibawa": 10})).status_code == 200
    r = await klien.post("/api/kurir/penjualan", headers=h(kurir), json={
        "client_id": uuid.uuid4().hex, "jenis": "toko", "qr_token": qr, "galon_isi": 3, "galon_kosong": 0, "lat": -6.2, "lng": 106.8, "akurasi_m": 10})
    assert r.status_code == 200, r.text
    assert r.json()["penjualan"]["status_verifikasi"] == "terverifikasi"
    return {"bos": bos, "kurir": kurir, "hp": hp, "pin": pin, "toko": toko, "rumah": rumah, "qr": qr, "sale": r.json()["penjualan"]}


@pytest_asyncio.fixture(scope="session", loop_scope="session")
async def dua_depot(klien):
    return await depot_sungguhan(klien, "A"), await depot_sungguhan(klien, "B")


async def test_sehat(klien):
    assert (await klien.get("/api/sehat")).json()["status"] == "ok"


async def test_depot_lain_selalu_404(klien, dua_depot):
    a, b = dua_depot
    rit_b = (await klien.get("/api/bos/rit", headers=h(b["bos"]))).json()["rit"][0]["id"]
    for metode, url, isi in [
        ("GET", f"/api/bos/rit/{rit_b}", None),
        ("POST", f"/api/bos/rit/{rit_b}/terima", None),
        ("POST", f"/api/bos/rit/{rit_b}/muatan", {}),
        ("PUT", f"/api/bos/pelanggan/{b['toko']['id']}", {"nama": "Diubah", "jenis": "toko"}),
        ("POST", f"/api/bos/pelanggan/{b['toko']['id']}/ganti-qr", None),
        ("POST", f"/api/bos/bon/{b['rumah']['id']}/lunas", None),
        ("POST", f"/api/bos/galon/{b['toko']['id']}/koreksi", {"saldo": 0, "alasan": "uji"}),
        ("POST", f"/api/bos/konfirmasi/{b['toko']['id']}/kirim", None),
    ]:
        r = await klien.request(metode, url, headers=h(a["bos"]), json=isi)
        assert r.status_code == 404, (url, r.status_code, r.text)
    r = await klien.post(f"/api/kurir/penjualan/{b['sale']['id']}/koreksi", headers=h(a["kurir"]), json={"galon_isi": 1, "galon_kosong": 0, "alasan": "uji"})
    assert r.status_code == 404
    r = await klien.post("/api/kurir/penjualan", headers=h(a["kurir"]), json={"client_id": uuid.uuid4().hex, "jenis": "rumah", "customer_id": b["rumah"]["id"],
                                                                               "galon_isi": 1, "galon_kosong": 1})
    assert r.status_code == 404
    r = await klien.post("/api/kurir/penjualan", headers=h(a["kurir"]), json={"client_id": uuid.uuid4().hex, "jenis": "toko", "qr_token": b["qr"],
                                                                               "galon_isi": 1, "galon_kosong": 0, "lat": -6.2, "lng": 106.8, "akurasi_m": 10})
    assert r.status_code == 400  # token QR depot lain tidak dikenal
    assert b["toko"]["nama"] not in (await klien.get("/api/bos/pelanggan", headers=h(a["bos"]))).text


async def test_kurir_tidak_pernah_menerima_token_qr(klien, dua_depot):
    a, _ = dua_depot
    for url in ["/api/kurir/beranda", "/api/kurir/pelanggan/toko", "/api/kurir/pelanggan/rumah"]:
        r = await klien.get(url, headers=h(a["kurir"]))
        assert r.status_code == 200 and "qr_token" not in r.text and a["qr"] not in r.text
    assert (await klien.get("/api/kurir/demo/toko-simulasi", headers=h(a["kurir"]))).status_code == 404
    assert (await klien.get("/api/bos/qr", headers=h(a["kurir"]))).status_code == 403


async def test_masuk_demo_tidak_pernah_untuk_depot_sungguhan(klien, dua_depot):
    a, _ = dua_depot
    saya = (await klien.get("/api/auth/saya", headers=h(a["bos"]))).json()
    r = await klien.post("/api/demo/mulai", json={"depot_id": saya["depot"]["id"]})
    assert r.status_code == 200 and r.json()["baru"] is True and r.json()["depot_id"] != saya["depot"]["id"]


async def test_penjualan_simulasi_ditolak_di_depot_sungguhan(klien, dua_depot):
    a, _ = dua_depot
    r = await klien.post("/api/kurir/penjualan", headers=h(a["kurir"]), json={"client_id": uuid.uuid4().hex, "jenis": "toko", "qr_token": a["qr"],
                                                                               "posisi_simulasi": "dekat", "galon_isi": 1, "galon_kosong": 0})
    assert r.status_code == 400


async def test_kirim_ulang_tidak_membuat_penjualan_ganda(klien, dua_depot):
    a, _ = dua_depot
    isi = {"client_id": uuid.uuid4().hex, "jenis": "rumah", "customer_id": a["rumah"]["id"], "galon_isi": 2, "galon_kosong": 2, "dicatat_offline": True}
    r1 = await klien.post("/api/kurir/penjualan", headers=h(a["kurir"]), json=isi)
    r2 = await klien.post("/api/kurir/penjualan", headers=h(a["kurir"]), json=isi)
    assert r1.json()["penjualan"]["id"] == r2.json()["penjualan"]["id"] and r2.json()["duplikat"] is True


async def test_lima_kali_salah_pin_mengunci_15_menit(klien):
    b = await depot_sungguhan(klien, "Kunci")
    for i in range(4):
        r = await klien.post("/api/auth/masuk-kurir", json={"no_hp": b["hp"], "pin": "000000" if b["pin"] != "000000" else "111111"})
        assert r.status_code == 401 and f"Sisa {4 - i} kali" in r.json()["detail"]
    r = await klien.post("/api/auth/masuk-kurir", json={"no_hp": b["hp"], "pin": "999999" if b["pin"] != "999999" else "888888"})
    assert r.status_code == 423
    r = await klien.post("/api/auth/masuk-kurir", json={"no_hp": b["hp"], "pin": b["pin"]})
    assert r.status_code == 423


async def test_status_radar_tetap_setelah_hitung_ulang(klien, dua_depot):
    a, _ = dua_depot
    r = await klien.post("/api/kurir/penjualan", headers=h(a["kurir"]), json={"client_id": uuid.uuid4().hex, "jenis": "toko",
                                                                               "tanpa_qr_customer_id": a["toko"]["id"], "galon_isi": 4, "galon_kosong": 0})
    assert r.json()["penjualan"]["harga_berlaku"] == 4000
    grup = (await klien.get("/api/bos/radar?hari=1", headers=h(a["bos"]))).json()["kelompok"][0]
    assert any(f["kode"] == "R2" for f in grup["tanda"])
    await klien.post("/api/bos/radar/status", headers=h(a["bos"]), json={"kurir_id": grup["kurir"]["id"], "tanggal": grup["tanggal"], "status": "sudah_dicek_aman"})
    await klien.post("/api/kurir/penjualan", headers=h(a["kurir"]), json={"client_id": uuid.uuid4().hex, "jenis": "rumah", "customer_id": a["rumah"]["id"],
                                                                           "galon_isi": 1, "galon_kosong": 1})
    grup = (await klien.get("/api/bos/radar?hari=1", headers=h(a["bos"]))).json()["kelompok"][0]
    assert next(f for f in grup["tanda"] if f["kode"] == "R2")["status"] == "sudah_dicek_aman"


async def test_csv_hanya_depot_sendiri_dan_aman_dari_rumus(klien, dua_depot):
    a, b = dua_depot
    r = await klien.get("/api/bos/unduh?jenis=penjualan", headers=h(a["bos"]))
    assert r.status_code == 200 and r.headers["content-type"].startswith("text/csv")
    teks = r.content.decode("utf-8")
    assert teks.startswith("﻿waktu;kurir;pelanggan") and "'=HYPERLINK(1)" in teks and "Toko B" not in teks
    for jenis in ("rit", "tanda", "audit"):
        assert (await klien.get(f"/api/bos/unduh?jenis={jenis}", headers=h(a["bos"]))).status_code == 200


async def test_alur_demo_juri(klien):
    r = await klien.post("/api/demo/mulai", json={})
    demo = r.json()
    bos, kurir = demo["token_bos"], demo["token_kurir"]
    beranda = (await klien.get("/api/kurir/beranda", headers=h(kurir))).json()
    assert beranda["rit"]["status"] == "aktif" and beranda["setoran"]["galon_catatan"] == 12 and beranda["depot"]["is_demo"]
    toko = (await klien.get("/api/kurir/demo/toko-simulasi", headers=h(kurir))).json()
    rumah = (await klien.get("/api/kurir/pelanggan/rumah", headers=h(kurir))).json()
    jual = lambda **x: klien.post("/api/kurir/penjualan", headers=h(kurir), json={"client_id": uuid.uuid4().hex, "galon_kosong": 0, **x})  # noqa: E731
    r = await jual(jenis="rumah", customer_id=rumah[0]["id"], galon_isi=2)
    assert r.json()["penjualan"]["harga_berlaku"] == 4000
    r = await jual(jenis="toko", qr_token=toko[0]["qr_token"], posisi_simulasi="dekat", galon_isi=3)
    assert r.json()["penjualan"]["status_verifikasi"] == "terverifikasi" and r.json()["penjualan"]["harga_berlaku"] == 3000
    r = await jual(jenis="toko", qr_token=toko[1]["qr_token"], posisi_simulasi="jauh", galon_isi=3)
    jauh = r.json()["penjualan"]
    assert jauh["status_verifikasi"] == "lokasi_jauh" and jauh["harga_berlaku"] == 4000
    r = await jual(jenis="toko", tanpa_qr_customer_id=toko[2]["id"], galon_isi=2)
    assert r.json()["penjualan"]["status_verifikasi"] == "tanpa_qr"

    das = (await klien.get("/api/bos/dasbor", headers=h(bos))).json()
    assert das["tagihan_kembali"] > 0 and das["perkiraan_bocor"] > 0
    rudi = next(k for k in das["kurir"] if k["kurir"]["nama"] == "Rudi")
    assert rudi["hari_risiko_tinggi"] >= 15
    rit = next(x for x in (await klien.get("/api/bos/rit", headers=h(bos))).json()["rit"] if x["kurir"]["nama"] == "Rudi")
    detail = (await klien.get(f"/api/bos/rit/{rit['id']}", headers=h(bos))).json()
    assert len(detail["penjualan"]) == 10 and {f["kode"] for f in detail["tanda"]["tanda"]} >= {"R2", "R4"}

    # Minta harga toko untuk penjualan jauh, lalu bos setujui → R2/R4 hilang
    assert (await klien.post(f"/api/kurir/penjualan/{jauh['id']}/minta-harga-toko", headers=h(kurir), json={"alasan": "Saya di dalam toko"})).status_code == 200
    menunggu = (await klien.get("/api/bos/persetujuan", headers=h(bos))).json()["menunggu"]
    harga = next(x for x in menunggu if x["sale_id"] == jauh["id"])
    assert (await klien.post(f"/api/bos/persetujuan/{harga['id']}", headers=h(bos), json={"keputusan": "setuju"})).status_code == 400
    assert (await klien.post(f"/api/bos/persetujuan/{harga['id']}", headers=h(bos), json={"keputusan": "setuju", "alasan": "Dicek via telepon"})).status_code == 200
    detail = (await klien.get(f"/api/bos/rit/{rit['id']}", headers=h(bos))).json()
    assert "R4" not in {f["kode"] for f in detail["tanda"]["tanda"]}

    # Selesai rit kurang setor → R6
    st = (await klien.get("/api/kurir/beranda", headers=h(kurir))).json()["setoran"]
    r = await klien.post("/api/kurir/rit/selesai", headers=h(kurir), json={"isi_pulang": st["galon_di_motor"], "kosong_pulang": 10,
                                                                           "uang_disetor": st["uang_seharusnya"] - 3000})
    assert r.json()["setoran"]["selisih_uang"] == -3000
    detail = (await klien.get(f"/api/bos/rit/{rit['id']}", headers=h(bos))).json()
    assert any(f["kode"] == "R6" and f["perkiraan_rupiah"] == 3000 for f in detail["tanda"]["tanda"])

    # Browser yang sama memakai depot demo yang sama
    lagi = (await klien.post("/api/demo/mulai", json={"depot_id": demo["depot_id"]})).json()
    assert lagi["depot_id"] == demo["depot_id"] and lagi["baru"] is False


async def test_login_juri_dan_ganti_peran_memakai_depot_yang_sama(klien):
    headers = {"X-Forwarded-For": "uji-login-juri"}
    admin = await klien.post("/api/demo/masuk", headers=headers, json={"username": "admin", "sandi": "admin"})
    assert admin.status_code == 200
    demo = admin.json()
    assert demo["peran"] == "bos" and demo["baru"] is True
    bos = (await klien.get("/api/auth/saya", headers=h(demo["token_bos"]))).json()
    assert bos["peran"] == "bos" and bos["depot"]["is_demo"] is True
    kurir = await klien.post("/api/demo/masuk", headers=headers,
                            json={"username": "kurir", "sandi": "kurir", "depot_id": demo["depot_id"]})
    assert kurir.status_code == 200
    assert kurir.json()["peran"] == "kurir" and kurir.json()["baru"] is False
    assert kurir.json()["depot_id"] == demo["depot_id"]
    token = kurir.json()["token_kurir"]
    profil = (await klien.get("/api/auth/saya", headers=h(token))).json()
    assert profil["peran"] == "kurir" and profil["pengguna"]["nama"] == "Rudi"
    assert (await klien.get("/api/bos/dasbor", headers=h(token))).status_code == 403
    assert await db().demo_requests.count_documents({"ip": "uji-login-juri"}) == 1


@pytest.mark.parametrize("username,sandi", [("admin", "kurir"), ("kurir", "admin"), ("tidak-ada", "tidak-ada"), ("", "")])
async def test_login_juri_salah_tidak_membuat_depot(klien, username, sandi):
    jumlah = await db().depots.count_documents({})
    r = await klien.post("/api/demo/masuk", json={"username": username, "sandi": sandi})
    assert r.status_code == 401
    assert "token_bos" not in r.json() and "token_kurir" not in r.json()
    assert await db().depots.count_documents({}) == jumlah


async def test_login_juri_terpisah_dan_tidak_bisa_masuk_depot_sungguhan(klien, dua_depot):
    a, _ = dua_depot
    asli = (await klien.get("/api/auth/saya", headers=h(a["bos"]))).json()["depot"]["id"]
    pertama = await klien.post("/api/demo/masuk", headers={"X-Forwarded-For": "uji-juri-satu"},
                              json={"username": "admin", "sandi": "admin", "depot_id": asli})
    kedua = await klien.post("/api/demo/masuk", headers={"X-Forwarded-For": "uji-juri-dua"},
                            json={"username": "admin", "sandi": "admin"})
    assert pertama.status_code == kedua.status_code == 200
    d1, d2 = pertama.json(), kedua.json()
    assert len({asli, d1["depot_id"], d2["depot_id"]}) == 3
    rit_asli = (await klien.get("/api/bos/rit", headers=h(a["bos"]))).json()["rit"][0]["id"]
    for demo in (d1, d2):
        profil = (await klien.get("/api/auth/saya", headers=h(demo["token_bos"]))).json()
        assert profil["depot"]["is_demo"] is True
        assert (await klien.get(f"/api/bos/rit/{rit_asli}", headers=h(demo["token_bos"]))).status_code == 404


async def test_login_juri_mematuhi_batas_depot_demo(klien):
    from aquair.inti import sekarang

    ip = "uji-batas-login-juri"
    await db().demo_requests.insert_many([{"ip": ip, "created_at": sekarang()} for _ in range(10)])
    jumlah = await db().depots.count_documents({})
    r = await klien.post("/api/demo/masuk", headers={"X-Forwarded-For": ip}, json={"username": "admin", "sandi": "admin"})
    assert r.status_code == 429
    assert await db().depots.count_documents({}) == jumlah


async def test_alamat_ip_bisa_diatur_lewat_lingkungan(klien, monkeypatch):
    rantai = {"X-Forwarded-For": "palsu-dari-pengunjung, ip-pengunjung, ip-cdn"}
    assert (await klien.get("/api/demo/ip-saya", headers=rantai)).json()["ip_dipakai"] == "ip-cdn"
    monkeypatch.setenv("AQUAIR_PROXY_TEPERCAYA", "2")
    assert (await klien.get("/api/demo/ip-saya", headers=rantai)).json()["ip_dipakai"] == "ip-pengunjung"
    monkeypatch.setenv("AQUAIR_HEADER_IP", "cf-connecting-ip")
    hasil = (await klien.get("/api/demo/ip-saya", headers={**rantai, "CF-Connecting-IP": "ip-asli"})).json()
    assert hasil["ip_dipakai"] == "ip-asli" and hasil["cf_connecting_ip"] == "ip-asli"
    assert (await klien.get("/api/demo/ip-saya", headers=rantai)).json()["ip_dipakai"] == "ip-pengunjung"


async def test_konfirmasi_pemilik_toko_memunculkan_r8(klien):
    demo = (await klien.post("/api/demo/mulai", json={})).json()
    bos = demo["token_bos"]
    daftar = (await klien.get("/api/bos/konfirmasi", headers=h(bos))).json()
    assert {"benar", "berbeda", "menunggu"} <= {t["status"] for t in daftar["toko"]}
    calon = next(t for t in daftar["toko"] if t["status"] in ("belum", "menunggu") and t["galon_tercatat"] >= 3)
    kirim = (await klien.post(f"/api/bos/konfirmasi/{calon['customer_id']}/kirim", headers=h(bos))).json()
    halaman = (await klien.get(f"/api/publik/konfirmasi/{kirim['token']}")).json()
    assert halaman["galon_tercatat"] == calon["galon_tercatat"] and halaman["jawaban"] is None
    r = await klien.post(f"/api/publik/konfirmasi/{kirim['token']}", json={"jawaban": "berbeda", "galon": calon["galon_tercatat"] - 2})
    assert r.status_code == 200
    assert (await klien.post(f"/api/publik/konfirmasi/{kirim['token']}", json={"jawaban": "benar"})).status_code == 409
    radar = (await klien.get("/api/bos/radar?hari=1", headers=h(bos))).json()["kelompok"]
    assert any(f["kode"] == "R8" and calon["nama"] in f["penjelasan"] for g in radar for f in g["tanda"])
