"""Endpoint aplikasi kurir (spesifikasi bagian 3 dan 10.3). Kurir hanya melihat rit miliknya sendiri."""
from __future__ import annotations

import math
import random
from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from pymongo.errors import DuplicateKeyError

from . import aturan as A
from .inti import ambil_milik_depot, bersih, db, galat, id_baru, penanda_demo, sekarang, tanggal_wib
from .keamanan import normal_hp, sesi_kurir
from .layanan import hitung_ulang

router = APIRouter(prefix="/kurir")
DATA_PENJUALAN: tuple[str, ...] = ()


def info_penjualan(s: dict) -> dict:
    return bersih(s, buang=DATA_PENJUALAN)


async def rit_aktif(depot_id: str, kurir_id: str) -> dict | None:
    return await db().trips.find_one({"depot_id": depot_id, "kurir_id": kurir_id, "status": "aktif"})


@router.get("/beranda")
async def beranda(s: dict = Depends(sesi_kurir)):
    depot, kurir, d = s["depot"], s["user"], db()
    trip = await rit_aktif(depot["_id"], kurir["_id"])
    if not trip:
        trip = await d.trips.find_one({"depot_id": depot["_id"], "kurir_id": kurir["_id"], "tanggal": tanggal_wib()}, sort=[("berangkat_at", -1)])
    penjualan, setoran = [], None
    if trip:
        penjualan = await d.sales.find({"depot_id": depot["_id"], "trip_id": trip["_id"]}).sort("urutan_at", 1).to_list(None)
        setoran = A.hitung_setoran(trip, penjualan)
    menunggu = await d.approvals.find({"depot_id": depot["_id"], "kurir_id": kurir["_id"], "status": "menunggu"}, {"sale_id": 1, "jenis": 1}).to_list(None)
    return {"kurir": {"id": kurir["_id"], "nama": kurir["nama"]},
            "depot": {"nama": depot["nama"], "is_demo": depot.get("is_demo", False), "harga_toko": depot["harga_toko"],
                      "harga_rumah": depot["harga_rumah"], "radius_m": depot["radius_m"]},
            "rit": bersih(trip), "penjualan": [info_penjualan(x) for x in penjualan], "setoran": setoran,
            "pengajuan_menunggu": [{"sale_id": m.get("sale_id"), "jenis": m["jenis"]} for m in menunggu]}


class MulaiRit(BaseModel):
    dibawa: int = Field(ge=1, le=500)


@router.post("/rit/mulai")
async def mulai_rit(b: MulaiRit, s: dict = Depends(sesi_kurir)):
    depot, kurir = s["depot"], s["user"]
    if await rit_aktif(depot["_id"], kurir["_id"]):
        galat(409, "Masih ada rit yang belum selesai. Selesaikan dulu sebelum mulai rit baru.")
    kini = sekarang()
    trip = {"_id": id_baru(), "depot_id": depot["_id"], "kurir_id": kurir["_id"], "dibawa": b.dibawa, "dibawa_kurir": b.dibawa,
            "muatan_dicek": False, "muatan_dicek_oleh": None, "muatan_dicek_at": None, "berangkat_at": kini,
            "tanggal": tanggal_wib(kini), "status": "aktif", "isi_pulang": None, "kosong_pulang": None, "uang_disetor": None,
            "selesai_at": None, **penanda_demo(depot)}
    await db().trips.insert_one(trip)
    return bersih(trip)


# ---------------------------------------------------------------- pelanggan untuk kurir (tanpa token QR)
def urut_terdekat(daftar: list[dict], lat: float | None, lng: float | None) -> list[dict]:
    hasil = []
    for c in daftar:
        jarak = A.jarak_m(lat, lng, c["lat"], c["lng"]) if None not in (lat, lng, c.get("lat"), c.get("lng")) else None
        hasil.append({"id": c["_id"], "nama": c["nama"], "boleh_bon": c.get("boleh_bon", False), "jarak_m": None if jarak is None else round(jarak)})
    return sorted(hasil, key=lambda x: (x["jarak_m"] is None, x["jarak_m"] or 0, x["nama"]))


async def posisi_acuan(depot: dict, kurir: dict, lat: float | None, lng: float | None) -> tuple[float | None, float | None]:
    if lat is not None and lng is not None:
        return lat, lng
    terakhir = await db().sales.find_one({"depot_id": depot["_id"], "kurir_id": kurir["_id"], "lat": {"$ne": None}}, sort=[("urutan_at", -1)])
    return (terakhir["lat"], terakhir["lng"]) if terakhir else (None, None)


@router.get("/pelanggan/rumah")
async def pelanggan_rumah(lat: float | None = None, lng: float | None = None, s: dict = Depends(sesi_kurir)):
    depot = s["depot"]
    daftar = await db().customers.find({"depot_id": depot["_id"], "jenis": "rumah", "status": "aktif"}).to_list(None)
    lat, lng = await posisi_acuan(depot, s["user"], lat, lng)
    return urut_terdekat(daftar, lat, lng)


@router.get("/pelanggan/toko")
async def pelanggan_toko(s: dict = Depends(sesi_kurir)):
    """Daftar toko untuk pilihan "Toko tanpa QR". Tidak pernah berisi token QR."""
    daftar = await db().customers.find({"depot_id": s["depot"]["_id"], "jenis": "toko", "status": "aktif"}).to_list(None)
    return urut_terdekat(daftar, None, None)


@router.get("/demo/toko-simulasi")
async def toko_simulasi(s: dict = Depends(sesi_kurir)):
    """Hanya di depot demo endpoint kurir boleh mengirim token QR (spesifikasi 6 dan 10.3)."""
    depot = s["depot"]
    if not depot.get("is_demo"):
        galat(404, "Simulasi scan hanya ada di depot contoh.")
    daftar = await db().customers.find({"depot_id": depot["_id"], "jenis": "toko", "status": "aktif"}).to_list(None)
    kurir_rute = "rudi" if s["user"]["nama"] == "Rudi" else "dimas"
    daftar.sort(key=lambda c: (c.get("rute") != kurir_rute, c["nama"]))
    return [{"id": c["_id"], "nama": c["nama"], "qr_token": c["qr_token"], "boleh_bon": c.get("boleh_bon", False)} for c in daftar]


class CekQr(BaseModel):
    qr_token: str = Field(min_length=8, max_length=128)


@router.post("/qr/cek")
async def cek_qr(b: CekQr, s: dict = Depends(sesi_kurir)):
    """Nama toko dari QR yang baru dipindai, supaya kurir yakin tokonya benar. Token tidak dikirim balik."""
    c = await db().customers.find_one({"depot_id": s["depot"]["_id"], "qr_token": b.qr_token, "jenis": "toko", "status": "aktif"})
    if not c:
        galat(400, 'QR tidak dikenal. Mungkin stiker lama yang sudah diganti bos. Pilih "Toko tanpa QR".')
    return {"id": c["_id"], "nama": c["nama"], "boleh_bon": c.get("boleh_bon", False)}


# ---------------------------------------------------------------- catat penjualan
class PembeliBaru(BaseModel):
    nama: str = Field(min_length=2, max_length=80)
    no_hp: str = Field("", max_length=20)


class Penjualan(BaseModel):
    client_id: str = Field(min_length=8, max_length=64, description="ID unik dari HP supaya kirim ulang tidak membuat data ganda")
    jenis: Literal["toko", "rumah"]
    qr_token: str | None = Field(None, max_length=128)
    tanpa_qr_customer_id: str | None = Field(None, max_length=64)
    customer_id: str | None = Field(None, max_length=64)
    pelanggan_baru: PembeliBaru | None = None
    galon_isi: int = Field(ge=1, le=200)
    galon_kosong: int = Field(ge=0, le=200)
    bayar: Literal["tunai", "bon"] = "tunai"
    lat: float | None = Field(None, ge=-90, le=90)
    lng: float | None = Field(None, ge=-180, le=180)
    akurasi_m: float | None = Field(None, ge=0, le=100000)
    posisi_simulasi: Literal["dekat", "jauh"] | None = None
    waktu_hp: datetime | None = None
    dicatat_offline: bool = False


def simulasikan(c: dict, posisi: str | None, rng: random.Random) -> tuple[float | None, float | None, float | None]:
    """Depot demo: lokasi disimulasikan dari titik pelanggan, tidak pernah dari perangkat pengunjung."""
    if c.get("lat") is None or c.get("lng") is None:
        return None, None, None
    dx, dy = rng.uniform(-10, 10), rng.uniform(-10, 10)
    if posisi == "jauh":
        dx += 1200
    return c["lat"] + dy / 111320, c["lng"] + dx / (111320 * math.cos(math.radians(c["lat"]))), 15.0


@router.post("/penjualan")
async def catat_penjualan(b: Penjualan, s: dict = Depends(sesi_kurir)):
    depot, kurir, d = s["depot"], s["user"], db()
    lama = await d.sales.find_one({"depot_id": depot["_id"], "client_id": b.client_id})
    if lama:
        if lama["kurir_id"] != kurir["_id"]:
            galat(409, "ID penjualan bentrok. Coba simpan lagi.")
        return {"penjualan": info_penjualan(lama), "duplikat": True}
    trip = await rit_aktif(depot["_id"], kurir["_id"])
    if not trip:
        galat(409, "Belum ada rit aktif. Tekan Mulai rit dulu.")
    demo = depot.get("is_demo", False)
    if b.posisi_simulasi and not demo:
        galat(400, "Penjualan simulasi hanya bisa di depot contoh.")

    baru, qr_sah, tanpa_qr = None, False, False
    if b.jenis == "toko":
        if b.qr_token:
            c = await d.customers.find_one({"depot_id": depot["_id"], "qr_token": b.qr_token, "jenis": "toko", "status": "aktif"})
            if not c:
                galat(400, 'QR tidak dikenal. Mungkin stiker lama yang sudah diganti bos. Pilih "Toko tanpa QR".')
            qr_sah = True
        elif b.tanpa_qr_customer_id:
            c = await ambil_milik_depot("customers", b.tanpa_qr_customer_id, depot["_id"], "Toko tidak ditemukan.")
            if c["jenis"] != "toko":
                galat(400, "Pelanggan ini bukan toko.")
            tanpa_qr = True
        else:
            galat(400, "Scan QR toko atau pilih toko tanpa QR.")
    elif b.customer_id:
        c = await ambil_milik_depot("customers", b.customer_id, depot["_id"], "Pembeli tidak ditemukan.")
        if c["jenis"] != "rumah":
            galat(400, "Pelanggan ini toko. Pakai Jual ke toko.")
    elif b.pelanggan_baru:
        kini = sekarang()
        c = baru = {"_id": id_baru(), "depot_id": depot["_id"], "jenis": "rumah", "nama": b.pelanggan_baru.nama.strip(),
                    "no_wa": normal_hp(b.pelanggan_baru.no_hp), "lat": None, "lng": None, "kapasitas": None, "laku_per_hari": None,
                    "boleh_bon": False, "qr_token": None, "status": "menunggu_persetujuan", "saldo_galon": 0, "kosong_terakhir_at": None,
                    "tanggal_daftar": tanggal_wib(kini), "created_at": kini, "didaftarkan_kurir": kurir["_id"], **penanda_demo(depot)}
    else:
        galat(400, "Pilih pembeli atau isi pembeli baru.")

    if b.bayar == "bon" and (baru or not c.get("boleh_bon")):
        galat(400, "Bon belum diizinkan bos untuk pelanggan ini. Pilih tunai.")

    if demo and b.posisi_simulasi is not None or demo and b.jenis == "rumah":
        lat, lng, akurasi = (None, None, None) if tanpa_qr else simulasikan(c, b.posisi_simulasi, random.Random())
    else:
        lat, lng, akurasi = (b.lat, b.lng, b.akurasi_m)
    jarak = None
    if b.jenis == "toko" and None not in (lat, lng, c.get("lat"), c.get("lng")):
        jarak = round(A.jarak_m(lat, lng, c["lat"], c["lng"]))
    if b.jenis == "toko":
        status = A.status_verifikasi(qr_sah=qr_sah, tanpa_qr=tanpa_qr, jarak=jarak if c.get("lat") is not None else None,
                                     akurasi=akurasi, radius_m=depot["radius_m"])
    else:
        status = A.RUMAH

    kini = sekarang()
    urutan = kini
    if b.dicatat_offline and b.waktu_hp:
        waktu_hp = b.waktu_hp if b.waktu_hp.tzinfo else b.waktu_hp.replace(tzinfo=timezone.utc)
        urutan = min(kini, max(waktu_hp, trip["berangkat_at"]))
    sale = {"_id": id_baru(), "depot_id": depot["_id"], "trip_id": trip["_id"], "kurir_id": kurir["_id"], "customer_id": c["_id"],
            "nama_pelanggan": c["nama"], "jenis": b.jenis, "galon_isi": b.galon_isi, "galon_kosong": b.galon_kosong, "bayar": b.bayar,
            "lunas": b.bayar == "tunai", "harga_berlaku": A.harga_berlaku(b.jenis, status, depot), "harga_toko": depot["harga_toko"],
            "harga_rumah": depot["harga_rumah"], "status_verifikasi": status, "lat": lat, "lng": lng, "akurasi_m": akurasi,
            "jarak_m": jarak, "qr_dipindai": qr_sah, "disimulasikan": b.posisi_simulasi is not None or (demo and b.jenis == "rumah"),
            "dicatat_offline": b.dicatat_offline, "waktu_hp": b.waktu_hp, "client_id": b.client_id, "disetujui_bos": False,
            "created_at": kini, "urutan_at": urutan, "tanggal": tanggal_wib(kini), **penanda_demo(depot)}
    if baru:
        await d.customers.insert_one(baru)
    try:
        await d.sales.insert_one(sale)
    except DuplicateKeyError:
        lama = await d.sales.find_one({"depot_id": depot["_id"], "client_id": b.client_id})
        return {"penjualan": info_penjualan(lama), "duplikat": True}
    ubah = {"$set": {"saldo_galon": {"$max": [0, {"$add": [{"$ifNull": ["$saldo_galon", 0]}, b.galon_isi - b.galon_kosong]}]}}}
    if b.galon_kosong > 0:
        ubah["$set"]["kosong_terakhir_at"] = kini
    await d.customers.update_one({"_id": c["_id"]}, [ubah])
    if baru:
        await d.approvals.insert_one({"_id": id_baru(), "depot_id": depot["_id"], "jenis": "pelanggan", "kurir_id": kurir["_id"],
                                      "customer_id": c["_id"], "sale_id": sale["_id"], "data": {}, "alasan_kurir": "Pembeli baru",
                                      "status": "menunggu", "created_at": kini, **penanda_demo(depot)})
    await hitung_ulang(depot, sale["tanggal"])
    return {"penjualan": info_penjualan(sale), "duplikat": False}


# ---------------------------------------------------------------- pengajuan ke bos
class Alasan(BaseModel):
    alasan: str = Field(min_length=3, max_length=300)


async def penjualan_milik_kurir(sale_id: str, s: dict) -> dict:
    sale = await ambil_milik_depot("sales", sale_id, s["depot"]["_id"], "Penjualan tidak ditemukan.")
    if sale["kurir_id"] != s["user"]["_id"]:
        galat(404, "Penjualan tidak ditemukan.")
    return sale


async def ajukan(s: dict, sale: dict, jenis: str, alasan: str, data: dict):
    d = db()
    if await d.approvals.find_one({"depot_id": s["depot"]["_id"], "sale_id": sale["_id"], "jenis": jenis, "status": "menunggu"}):
        galat(409, "Pengajuan untuk penjualan ini masih menunggu keputusan bos.")
    doc = {"_id": id_baru(), "depot_id": s["depot"]["_id"], "jenis": jenis, "kurir_id": s["user"]["_id"], "customer_id": sale["customer_id"],
           "sale_id": sale["_id"], "data": data, "alasan_kurir": alasan, "status": "menunggu", "created_at": sekarang(), **penanda_demo(s["depot"])}
    await d.approvals.insert_one(doc)
    return bersih(doc)


@router.post("/penjualan/{sale_id}/minta-harga-toko")
async def minta_harga_toko(sale_id: str, b: Alasan, s: dict = Depends(sesi_kurir)):
    sale = await penjualan_milik_kurir(sale_id, s)
    if sale["jenis"] != "toko" or A.berharga_toko(sale):
        galat(400, "Penjualan ini sudah memakai harga toko.")
    return await ajukan(s, sale, "harga", b.alasan, {})


class Koreksi(Alasan):
    galon_isi: int = Field(ge=1, le=200)
    galon_kosong: int = Field(ge=0, le=200)


@router.post("/penjualan/{sale_id}/koreksi")
async def ajukan_koreksi(sale_id: str, b: Koreksi, s: dict = Depends(sesi_kurir)):
    sale = await penjualan_milik_kurir(sale_id, s)
    if (b.galon_isi, b.galon_kosong) == (sale["galon_isi"], sale["galon_kosong"]):
        galat(400, "Angka koreksi sama dengan catatan. Ubah angkanya dulu.")
    return await ajukan(s, sale, "koreksi", b.alasan, {"galon_isi": b.galon_isi, "galon_kosong": b.galon_kosong})


# ---------------------------------------------------------------- selesai rit
class SelesaiRit(BaseModel):
    isi_pulang: int = Field(ge=0, le=500)
    kosong_pulang: int = Field(ge=0, le=1000)
    uang_disetor: int = Field(ge=0, le=100_000_000)


@router.post("/rit/selesai")
async def selesai_rit(b: SelesaiRit, s: dict = Depends(sesi_kurir)):
    depot, kurir, d = s["depot"], s["user"], db()
    trip = await rit_aktif(depot["_id"], kurir["_id"])
    if not trip:
        galat(409, "Tidak ada rit aktif.")
    if b.isi_pulang > trip["dibawa"]:
        galat(400, f"Galon isi dibawa pulang tidak mungkin lebih dari muatan ({trip['dibawa']} galon).")
    penjualan = await d.sales.find({"depot_id": depot["_id"], "trip_id": trip["_id"]}).to_list(None)
    trip.update(isi_pulang=b.isi_pulang, kosong_pulang=b.kosong_pulang, uang_disetor=b.uang_disetor)
    setoran = A.hitung_setoran(trip, penjualan)
    ubah = {"isi_pulang": b.isi_pulang, "kosong_pulang": b.kosong_pulang, "uang_disetor": b.uang_disetor, "status": "selesai",
            "selesai_at": sekarang(), "uang_seharusnya": setoran["uang_seharusnya"], "selisih_uang": setoran["selisih_uang"],
            "selisih_galon": setoran["selisih_galon"]}
    await d.trips.update_one({"_id": trip["_id"], "status": "aktif"}, {"$set": ubah})
    await hitung_ulang(depot, trip["tanggal"])
    return {"rit": bersih({**trip, **ubah}), "setoran": setoran}
