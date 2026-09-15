"""Endpoint aplikasi bos: dasbor, Radar, rit, persetujuan, pelanggan, QR, bon, kurir, pengaturan (spesifikasi 4–6)."""
from __future__ import annotations

import secrets
from collections import defaultdict
from typing import Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from pymongo.errors import DuplicateKeyError

from . import aturan as A
from .inti import ambil_milik_depot, bersih, catat_audit, db, galat, id_baru, jam_wib, penanda_demo, sekarang, tanggal_wib
from .keamanan import hash_rahasia, normal_hp, sesi_bos
from .layanan import dasbor, hitung_ulang, kelompok_radar, nama_kurir

router = APIRouter(prefix="/bos")


def token_qr() -> str:
    return secrets.token_urlsafe(24)


@router.get("/dasbor")
async def lihat_dasbor(s: dict = Depends(sesi_bos)):
    return await dasbor(s["depot"])


# ---------------------------------------------------------------- Radar
@router.get("/radar")
async def radar(hari: int = 30, kurir_id: str | None = None, s: dict = Depends(sesi_bos)):
    hari = max(1, min(hari, 90))
    sampai = tanggal_wib()
    return {"kelompok": await kelompok_radar(s["depot"], A.geser_tanggal(sampai, -(hari - 1)), sampai, kurir_id)}


class StatusRadar(BaseModel):
    kurir_id: str = Field(max_length=64)
    tanggal: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")
    status: Literal["baru", "sudah_dicek_aman", "terbukti"]


@router.post("/radar/status")
async def ubah_status_radar(b: StatusRadar, s: dict = Depends(sesi_bos)):
    depot = s["depot"]
    q = {"depot_id": depot["_id"], "kurir_id": b.kurir_id, "tanggal": b.tanggal}
    if not await db().flags.count_documents(q):
        galat(404, "Tanda tidak ditemukan.")
    await db().flags.update_many(q, {"$set": {"status": b.status}})
    kurir = (await nama_kurir(depot["_id"])).get(b.kurir_id, {}).get("nama", "kurir")
    await catat_audit(depot, s["user"], f"Tanda Radar {kurir} {b.tanggal}", sesudah=b.status)
    return {"ok": True}


# ---------------------------------------------------------------- Rit
def info_rit(trip: dict, penjualan: list[dict], kurir: dict) -> dict:
    return {**bersih(trip), "kurir": kurir.get(trip["kurir_id"], {"id": trip["kurir_id"], "nama": "Kurir"}),
            "setoran": A.hitung_setoran(trip, penjualan), "jumlah_penjualan": len(penjualan),
            "jam_berangkat": jam_wib(trip["berangkat_at"]), "jam_dicek": jam_wib(trip["muatan_dicek_at"]) if trip.get("muatan_dicek_at") else None}


@router.get("/rit")
async def daftar_rit(tanggal: str | None = None, s: dict = Depends(sesi_bos)):
    depot, d = s["depot"], db()
    tanggal = tanggal or tanggal_wib()
    trips = await d.trips.find({"depot_id": depot["_id"], "tanggal": tanggal}).sort("berangkat_at", 1).to_list(None)
    sales = await d.sales.find({"depot_id": depot["_id"], "trip_id": {"$in": [t["_id"] for t in trips]}}).to_list(None)
    per_rit = defaultdict(list)
    for x in sales:
        per_rit[x["trip_id"]].append(x)
    kurir = await nama_kurir(depot["_id"])
    return {"tanggal": tanggal, "rit": [info_rit(t, per_rit[t["_id"]], kurir) for t in trips]}


@router.get("/rit/{trip_id}")
async def detail_rit(trip_id: str, s: dict = Depends(sesi_bos)):
    depot, d = s["depot"], db()
    trip = await ambil_milik_depot("trips", trip_id, depot["_id"], "Rit tidak ditemukan.")
    sales = await d.sales.find({"depot_id": depot["_id"], "trip_id": trip_id}).sort("urutan_at", 1).to_list(None)
    kurir = await nama_kurir(depot["_id"])
    toko = await d.customers.find({"depot_id": depot["_id"], "jenis": "toko", "lat": {"$ne": None}}, {"nama": 1, "lat": 1, "lng": 1}).to_list(None)
    tanda = await kelompok_radar(depot, trip["tanggal"], trip["tanggal"], trip["kurir_id"])
    ditandai = {f["sale_id"]: f["kode"] for g in tanda for f in g["tanda"] if f.get("sale_id")}
    return {"rit": info_rit(trip, sales, kurir),
            "penjualan": [{**bersih(x, buang=("urutan_at",)), "jam": jam_wib(x["urutan_at"]), "tanda": ditandai.get(x["_id"])} for x in sales],
            "tanda": tanda[0] if tanda else None, "titik_toko": [{"id": t["_id"], "nama": t["nama"], "lat": t["lat"], "lng": t["lng"]} for t in toko]}


class Muatan(BaseModel):
    dibawa: int | None = Field(None, ge=1, le=500)
    alasan: str = Field("", max_length=300)


@router.post("/rit/{trip_id}/muatan")
async def cek_muatan(trip_id: str, b: Muatan, s: dict = Depends(sesi_bos)):
    depot = s["depot"]
    trip = await ambil_milik_depot("trips", trip_id, depot["_id"], "Rit tidak ditemukan.")
    kurir = (await nama_kurir(depot["_id"])).get(trip["kurir_id"], {}).get("nama", "kurir")
    dibawa = trip["dibawa"] if b.dibawa is None else b.dibawa
    if b.dibawa is not None and b.dibawa != trip["dibawa"] and len(b.alasan.strip()) < 3:
        galat(400, "Tulis alasan perubahan muatan. Alasan masuk log audit.")
    await db().trips.update_one({"_id": trip_id}, {"$set": {"dibawa": dibawa, "muatan_dicek": True, "muatan_dicek_oleh": s["user"]["_id"],
                                                             "muatan_dicek_at": sekarang()}})
    aksi = f"Muatan cocok — rit {kurir}" if dibawa == trip["dibawa"] else f"Muatan dibetulkan — rit {kurir}"
    await catat_audit(depot, s["user"], aksi, sebelum=f"{trip['dibawa']} galon", sesudah=f"{dibawa} galon", alasan=b.alasan)
    if trip["status"] != "aktif":
        await hitung_ulang(depot, trip["tanggal"])
    return {"ok": True}


@router.post("/rit/{trip_id}/terima")
async def terima_setoran(trip_id: str, s: dict = Depends(sesi_bos)):
    depot = s["depot"]
    trip = await ambil_milik_depot("trips", trip_id, depot["_id"], "Rit tidak ditemukan.")
    if trip["status"] != "selesai":
        galat(409, "Setoran baru bisa diterima setelah kurir menekan Selesai rit." if trip["status"] == "aktif" else "Setoran rit ini sudah diterima.")
    await db().trips.update_one({"_id": trip_id}, {"$set": {"status": "diterima", "diterima_at": sekarang()}})
    kurir = (await nama_kurir(depot["_id"])).get(trip["kurir_id"], {}).get("nama", "kurir")
    await catat_audit(depot, s["user"], f"Setoran diterima — rit {kurir}", sebelum="selesai", sesudah=f"diterima {A.rp(trip.get('uang_disetor') or 0)}")
    return {"ok": True}


# ---------------------------------------------------------------- Persetujuan
@router.get("/persetujuan")
async def daftar_persetujuan(s: dict = Depends(sesi_bos)):
    depot, d = s["depot"], db()
    menunggu = await d.approvals.find({"depot_id": depot["_id"], "status": "menunggu"}).sort("created_at", -1).to_list(None)
    sudah = await d.approvals.find({"depot_id": depot["_id"], "status": {"$ne": "menunggu"}}).sort("diputuskan_at", -1).limit(20).to_list(None)
    kurir = await nama_kurir(depot["_id"])
    semua = menunggu + sudah
    pelanggan = {c["_id"]: c for c in await d.customers.find({"_id": {"$in": [a["customer_id"] for a in semua]}}).to_list(None)}
    penjualan = {x["_id"]: x for x in await d.sales.find({"_id": {"$in": [a["sale_id"] for a in semua if a.get("sale_id")]}}).to_list(None)}

    def info(a):
        x = penjualan.get(a.get("sale_id"))
        return {**bersih(a), "kurir": kurir.get(a["kurir_id"], {"nama": "Kurir"}), "pelanggan": pelanggan.get(a["customer_id"], {}).get("nama"),
                "penjualan": None if not x else {"tanggal": x["tanggal"], "jam": jam_wib(x["urutan_at"]), "galon_isi": x["galon_isi"],
                                                 "galon_kosong": x["galon_kosong"], "status_verifikasi": x["status_verifikasi"],
                                                 "jarak_m": x.get("jarak_m"), "akurasi_m": x.get("akurasi_m"), "bayar": x["bayar"]}}
    return {"menunggu": [info(a) for a in menunggu], "sudah": [info(a) for a in sudah]}


class Keputusan(BaseModel):
    keputusan: Literal["setuju", "tolak", "rumah", "toko"]
    alasan: str = Field("", max_length=300)


@router.post("/persetujuan/{approval_id}")
async def putuskan(approval_id: str, b: Keputusan, s: dict = Depends(sesi_bos)):
    depot, d, user = s["depot"], db(), s["user"]
    a = await ambil_milik_depot("approvals", approval_id, depot["_id"], "Pengajuan tidak ditemukan.")
    if a["status"] != "menunggu":
        galat(409, "Pengajuan ini sudah diputuskan.")
    boleh = {"pelanggan": ("rumah", "toko", "tolak"), "harga": ("setuju", "tolak"), "koreksi": ("setuju", "tolak")}[a["jenis"]]
    if b.keputusan not in boleh:
        galat(400, "Keputusan tidak sesuai jenis pengajuan.")
    if a["jenis"] != "pelanggan" and len(b.alasan.strip()) < 3:
        galat(400, "Tulis alasan dulu. Alasan disimpan di log audit.")
    sale = await d.sales.find_one({"_id": a["sale_id"], "depot_id": depot["_id"]}) if a.get("sale_id") else None
    pelanggan = await d.customers.find_one({"_id": a["customer_id"], "depot_id": depot["_id"]})
    judul = {"pelanggan": f"Pelanggan baru {pelanggan['nama'] if pelanggan else ''}", "harga": "Minta harga toko", "koreksi": "Koreksi penjualan"}[a["jenis"]]
    sebelum = sesudah = None

    if a["jenis"] == "pelanggan" and pelanggan:
        ubah = {"status": "ditolak"} if b.keputusan == "tolak" else {"status": "aktif", "jenis": b.keputusan}
        if b.keputusan == "toko":
            ubah["qr_token"] = token_qr()
        await d.customers.update_one({"_id": pelanggan["_id"]}, {"$set": ubah})
        sebelum, sesudah = "menunggu_persetujuan", f"{ubah['status']} · {ubah.get('jenis', pelanggan['jenis'])}"
    if a["jenis"] == "harga" and sale and b.keputusan == "setuju":
        await d.sales.update_one({"_id": sale["_id"]}, {"$set": {"disetujui_bos": True, "harga_berlaku": sale["harga_toko"], "alasan_setuju": b.alasan}})
        sebelum, sesudah = f"{sale['status_verifikasi']} · {A.rp(sale['harga_berlaku'])}", f"disetujui · {A.rp(sale['harga_toko'])}"
    if a["jenis"] == "koreksi" and sale and b.keputusan == "setuju":
        baru = a["data"]
        await d.sales.update_one({"_id": sale["_id"]}, {"$set": {"galon_isi": baru["galon_isi"], "galon_kosong": baru["galon_kosong"]}})
        selisih_saldo = (baru["galon_isi"] - baru["galon_kosong"]) - (sale["galon_isi"] - sale["galon_kosong"])
        await d.customers.update_one({"_id": sale["customer_id"]}, [{"$set": {"saldo_galon": {"$max": [0, {"$add": [{"$ifNull": ["$saldo_galon", 0]}, selisih_saldo]}]}}}])
        sebelum = f"isi {sale['galon_isi']}, kosong {sale['galon_kosong']}"
        sesudah = f"isi {baru['galon_isi']}, kosong {baru['galon_kosong']}"
    await d.approvals.update_one({"_id": a["_id"]}, {"$set": {"status": b.keputusan, "alasan_keputusan": b.alasan, "diputuskan_at": sekarang(),
                                                             "diputuskan_oleh": user["_id"]}})
    await catat_audit(depot, user, f"{judul} — {b.keputusan}", sebelum=sebelum, sesudah=sesudah, alasan=b.alasan)
    if sale:
        await hitung_ulang(depot, sale["tanggal"])
    return {"ok": True}


# ---------------------------------------------------------------- Pelanggan dan stiker QR
class DataPelanggan(BaseModel):
    nama: str = Field(min_length=2, max_length=80)
    jenis: Literal["toko", "rumah"]
    no_wa: str = Field("", max_length=20)
    lat: float | None = Field(None, ge=-90, le=90)
    lng: float | None = Field(None, ge=-180, le=180)
    kapasitas: int | None = Field(None, ge=1, le=1000)
    laku_per_hari: int | None = Field(None, ge=0, le=1000)
    boleh_bon: bool = False


def info_pelanggan(c: dict) -> dict:
    return bersih(c, buang=("qr_token",))


@router.get("/pelanggan")
async def daftar_pelanggan(jenis: str | None = None, s: dict = Depends(sesi_bos)):
    q = {"depot_id": s["depot"]["_id"], "status": {"$ne": "ditolak"}}
    if jenis in ("toko", "rumah"):
        q["jenis"] = jenis
    daftar = await db().customers.find(q).sort([("jenis", -1), ("nama", 1)]).to_list(None)
    return [info_pelanggan(c) for c in daftar]


@router.post("/pelanggan")
async def tambah_pelanggan(b: DataPelanggan, s: dict = Depends(sesi_bos)):
    depot, kini = s["depot"], sekarang()
    c = {"_id": id_baru(), "depot_id": depot["_id"], **b.model_dump(), "no_wa": normal_hp(b.no_wa), "status": "aktif", "saldo_galon": 0,
         "kosong_terakhir_at": None, "qr_token": token_qr() if b.jenis == "toko" else None, "tanggal_daftar": tanggal_wib(kini),
         "created_at": kini, **penanda_demo(depot)}
    await db().customers.insert_one(c)
    await catat_audit(depot, s["user"], f"Tambah pelanggan {c['nama']}", sesudah=c["jenis"])
    return info_pelanggan(c)


@router.put("/pelanggan/{customer_id}")
async def ubah_pelanggan(customer_id: str, b: DataPelanggan, s: dict = Depends(sesi_bos)):
    depot = s["depot"]
    c = await ambil_milik_depot("customers", customer_id, depot["_id"], "Pelanggan tidak ditemukan.")
    baru = {**b.model_dump(), "no_wa": normal_hp(b.no_wa)}
    if baru["jenis"] == "toko" and not c.get("qr_token"):
        baru["qr_token"] = token_qr()
    berubah = {k: (c.get(k), v) for k, v in baru.items() if k != "qr_token" and c.get(k) != v}
    if not berubah and "qr_token" not in baru:
        return info_pelanggan(c)
    await db().customers.update_one({"_id": customer_id}, {"$set": baru})
    await catat_audit(depot, s["user"], f"Ubah pelanggan {c['nama']}", sebelum={k: v[0] for k, v in berubah.items()},
                      sesudah={k: v[1] for k, v in berubah.items()})
    if berubah.keys() & {"kapasitas", "laku_per_hari", "jenis", "lat", "lng"}:
        await hitung_ulang(depot, A.geser_tanggal(tanggal_wib(), -29))
    return info_pelanggan({**c, **baru})


@router.post("/pelanggan/{customer_id}/ganti-qr")
async def ganti_qr(customer_id: str, s: dict = Depends(sesi_bos)):
    depot = s["depot"]
    c = await ambil_milik_depot("customers", customer_id, depot["_id"], "Pelanggan tidak ditemukan.")
    if c["jenis"] != "toko":
        galat(400, "Stiker QR hanya untuk toko.")
    token = token_qr()
    await db().customers.update_one({"_id": customer_id}, {"$set": {"qr_token": token}})
    await catat_audit(depot, s["user"], f"Ganti QR {c['nama']}", sebelum=f"…{(c.get('qr_token') or '')[-6:]}", sesudah=f"…{token[-6:]}")
    return {"id": customer_id, "nama": c["nama"], "qr_token": token}


@router.get("/qr")
async def stiker_qr(s: dict = Depends(sesi_bos)):
    """Satu-satunya tempat token QR dikirim di depot sungguhan: layar bos."""
    daftar = await db().customers.find({"depot_id": s["depot"]["_id"], "jenis": "toko", "status": "aktif"}).sort("nama", 1).to_list(None)
    return {"nama_depot": s["depot"]["nama"], "toko": [{"id": c["_id"], "nama": c["nama"], "qr_token": c["qr_token"],
                                                         "punya_titik": c.get("lat") is not None} for c in daftar]}


# ---------------------------------------------------------------- Bon
@router.get("/bon")
async def daftar_bon(s: dict = Depends(sesi_bos)):
    d = db()
    sales = await d.sales.find({"depot_id": s["depot"]["_id"], "bayar": "bon", "lunas": False}).sort("urutan_at", 1).to_list(None)
    grup: dict[str, dict] = {}
    for x in sales:
        g = grup.setdefault(x["customer_id"], {"customer_id": x["customer_id"], "nama": x["nama_pelanggan"], "total": 0, "catatan": []})
        g["total"] += x["galon_isi"] * x["harga_berlaku"]
        g["catatan"].append({"tanggal": x["tanggal"], "galon_isi": x["galon_isi"], "harga": x["harga_berlaku"]})
    daftar = sorted(grup.values(), key=lambda g: -g["total"])
    return {"total": sum(g["total"] for g in daftar), "pelanggan": daftar}


@router.post("/bon/{customer_id}/lunas")
async def bon_lunas(customer_id: str, s: dict = Depends(sesi_bos)):
    depot = s["depot"]
    c = await ambil_milik_depot("customers", customer_id, depot["_id"], "Pelanggan tidak ditemukan.")
    sales = await db().sales.find({"depot_id": depot["_id"], "customer_id": customer_id, "bayar": "bon", "lunas": False}).to_list(None)
    total = sum(x["galon_isi"] * x["harga_berlaku"] for x in sales)
    await db().sales.update_many({"_id": {"$in": [x["_id"] for x in sales]}}, {"$set": {"lunas": True, "lunas_at": sekarang()}})
    await catat_audit(depot, s["user"], f"Bon lunas {c['nama']}", sebelum=f"belum lunas {A.rp(total)}", sesudah="lunas")
    return {"ok": True, "total": total}


# ---------------------------------------------------------------- Kurir
class DataKurir(BaseModel):
    nama: str = Field(min_length=2, max_length=60)
    no_hp: str = Field(min_length=10, max_length=20)


class UbahKurir(BaseModel):
    nama: str | None = Field(None, min_length=2, max_length=60)
    aktif: bool | None = None


def pin_baru() -> str:
    return f"{secrets.randbelow(10**6):06d}"


@router.get("/kurir")
async def daftar_kurir(s: dict = Depends(sesi_bos)):
    depot, d = s["depot"], db()
    kurir = await d.users.find({"depot_id": depot["_id"], "peran": "kurir"}).sort("nama", 1).to_list(None)
    rit = {t["kurir_id"]: t["status"] for t in await d.trips.find({"depot_id": depot["_id"], "tanggal": tanggal_wib()}).to_list(None)}
    kini = sekarang()
    return [{"id": k["_id"], "nama": k["nama"], "no_hp": k.get("no_hp") or k.get("no_hp_tampil"), "aktif": k.get("aktif", True),
             "warna": k.get("warna"), "rit_hari_ini": rit.get(k["_id"]), "bisa_masuk": bool(k.get("no_hp")),
             "dikunci_sampai": jam_wib(k["dikunci_sampai"]) if k.get("dikunci_sampai") and k["dikunci_sampai"] > kini else None} for k in kurir]


@router.post("/kurir")
async def tambah_kurir(b: DataKurir, s: dict = Depends(sesi_bos)):
    depot = s["depot"]
    hp = normal_hp(b.no_hp)
    if len(hp) < 10:
        galat(400, "Nomor HP minimal 10 angka, contoh 0812…")
    pin = pin_baru()
    user = {"_id": id_baru(), "depot_id": depot["_id"], "peran": "kurir", "nama": b.nama.strip(), "aktif": True, "gagal_masuk": 0,
            "dikunci_sampai": None, "created_at": sekarang(), **penanda_demo(depot)}
    if depot.get("is_demo"):
        user["no_hp_tampil"] = hp  # depot contoh tidak membuat akun masuk sungguhan
    else:
        user.update(no_hp=hp, hash=hash_rahasia(pin))
    try:
        await db().users.insert_one(user)
    except DuplicateKeyError:
        galat(409, "Nomor HP ini sudah dipakai akun kurir lain.")
    await catat_audit(depot, s["user"], f"Tambah kurir {user['nama']}", sesudah=hp)
    return {"id": user["_id"], "nama": user["nama"], "pin": None if depot.get("is_demo") else pin}


@router.put("/kurir/{kurir_id}")
async def ubah_kurir(kurir_id: str, b: UbahKurir, s: dict = Depends(sesi_bos)):
    depot = s["depot"]
    k = await ambil_milik_depot("users", kurir_id, depot["_id"], "Kurir tidak ditemukan.")
    if k["peran"] != "kurir":
        galat(404, "Kurir tidak ditemukan.")
    ubah = {kk: v for kk, v in b.model_dump().items() if v is not None and v != k.get(kk)}
    if ubah:
        await db().users.update_one({"_id": kurir_id}, {"$set": ubah})
        await catat_audit(depot, s["user"], f"Ubah kurir {k['nama']}", sebelum={kk: k.get(kk) for kk in ubah}, sesudah=ubah)
    return {"ok": True}


@router.post("/kurir/{kurir_id}/pin")
async def atur_ulang_pin(kurir_id: str, s: dict = Depends(sesi_bos)):
    depot = s["depot"]
    k = await ambil_milik_depot("users", kurir_id, depot["_id"], "Kurir tidak ditemukan.")
    if k["peran"] != "kurir":
        galat(404, "Kurir tidak ditemukan.")
    pin = pin_baru()
    if not depot.get("is_demo"):
        await db().users.update_one({"_id": kurir_id}, {"$set": {"hash": hash_rahasia(pin), "gagal_masuk": 0, "dikunci_sampai": None}})
    await catat_audit(depot, s["user"], f"Atur ulang PIN {k['nama']}", sesudah="PIN baru dibuat")
    return {"pin": pin, "contoh": depot.get("is_demo", False)}


# ---------------------------------------------------------------- Pengaturan
class Pengaturan(BaseModel):
    nama: str = Field(min_length=2, max_length=80)
    harga_toko: int = Field(ge=0, le=1_000_000)
    harga_rumah: int = Field(ge=0, le=1_000_000)
    radius_m: int = Field(ge=10, le=2000)
    garis_dasar_toko: int = Field(ge=0, le=100)
    kebijakan_tanpa_bukti: bool


@router.get("/pengaturan")
async def lihat_pengaturan(s: dict = Depends(sesi_bos)):
    dp = s["depot"]
    return {k: dp.get(k) for k in Pengaturan.model_fields} | {"is_demo": dp.get("is_demo", False)}


@router.put("/pengaturan")
async def ubah_pengaturan(b: Pengaturan, s: dict = Depends(sesi_bos)):
    depot = s["depot"]
    if b.harga_rumah <= b.harga_toko:
        galat(400, "Harga rumah harus lebih tinggi dari harga toko.")
    baru = b.model_dump()
    berubah = {k: v for k, v in baru.items() if depot.get(k) != v}
    if not berubah:
        return {"ok": True, "berubah": False}
    await db().depots.update_one({"_id": depot["_id"]}, {"$set": berubah})
    await catat_audit(depot, s["user"], "Ubah pengaturan", sebelum={k: depot.get(k) for k in berubah}, sesudah=berubah)
    await hitung_ulang({**depot, **berubah}, A.geser_tanggal(tanggal_wib(), -29))
    return {"ok": True, "berubah": True}


@router.get("/audit")
async def log_audit(batas: int = 50, s: dict = Depends(sesi_bos)):
    daftar = await db().audit_log.find({"depot_id": s["depot"]["_id"]}).sort("created_at", -1).limit(max(1, min(batas, 200))).to_list(None)
    return [{**bersih(a), "jam": jam_wib(a["created_at"]), "tanggal": tanggal_wib(a["created_at"])} for a in daftar]
