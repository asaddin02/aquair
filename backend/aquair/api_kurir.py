"""Endpoint aplikasi kurir (spesifikasi bagian 3 dan 10.3). Kurir hanya melihat rit miliknya sendiri."""
from __future__ import annotations

import math
import random
from datetime import date, datetime, timezone
from typing import Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from pymongo.errors import BulkWriteError, DuplicateKeyError

from . import aturan as A
from .inti import ambil_milik_depot, bersih, db, galat, id_baru, penanda_demo, sekarang, tanggal_wib
from .keamanan import normal_hp, sesi_kurir
from .layanan import hitung_ulang
from .produk import ambil_produk, info_produk, info_produk_utama, muatan_awal

router = APIRouter(prefix="/kurir")
DATA_PENJUALAN: tuple[str, ...] = ()


def info_penjualan(s: dict) -> dict:
    return bersih(s, buang=DATA_PENJUALAN)


def teks_tanggal(t: str) -> str:
    return date.fromisoformat(t).strftime("%d-%m-%Y")


async def rit_aktif(depot_id: str, kurir_id: str) -> dict | None:
    return await db().trips.find_one({"depot_id": depot_id, "kurir_id": kurir_id, "status": "aktif"})


def rit_perlu_ditutup(depot: dict, trip: dict | None) -> bool:
    """Rit dari hari sebelumnya yang belum ditutup harus diselesaikan dulu (tidak berlaku di depot demo)."""
    return bool(trip and trip["status"] == "aktif" and trip["tanggal"] < tanggal_wib() and not depot.get("is_demo"))


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
            "rit_perlu_ditutup": rit_perlu_ditutup(depot, trip),
            "pengajuan_menunggu": [{"sale_id": m.get("sale_id"), "jenis": m["jenis"]} for m in menunggu]}


@router.get("/produk")
async def produk_kurir(s: dict = Depends(sesi_kurir)):
    """Produk yang boleh dijual kurir beserta harganya. Isi ulang galon selalu pertama."""
    depot = s["depot"]
    daftar = await db().products.find({"depot_id": depot["_id"], "aktif": True, "dijual_kurir": True}).sort("nama", 1).to_list(None)
    return [info_produk_utama(depot)] + [info_produk(p) for p in daftar]


class MuatanLain(BaseModel):
    produk_id: str = Field(min_length=1, max_length=64)
    dibawa: int = Field(ge=0, le=500)


class MulaiRit(BaseModel):
    dibawa: int = Field(ge=0, le=500)
    muatan_lain: list[MuatanLain] = Field(default_factory=list, max_length=20)


@router.post("/rit/mulai")
async def mulai_rit(b: MulaiRit, s: dict = Depends(sesi_kurir)):
    depot, kurir = s["depot"], s["user"]
    if await rit_aktif(depot["_id"], kurir["_id"]):
        galat(409, "Masih ada rit yang belum selesai. Selesaikan dulu sebelum mulai rit baru.")
    lain = [m for m in b.muatan_lain if m.dibawa > 0]
    if b.dibawa == 0 and not lain:
        galat(400, "Isi jumlah muatan yang dibawa.")
    if len({m.produk_id for m in lain}) != len(lain):
        galat(400, "Satu produk hanya boleh ditulis sekali di muatan.")
    produk = await ambil_produk(depot["_id"], {m.produk_id for m in lain}, dijual_kurir=True)
    if any(m.produk_id not in produk for m in lain):
        galat(400, "Ada produk muatan yang tidak ditemukan atau tidak dijual lewat kurir.")
    kini = sekarang()
    trip = {"_id": id_baru(), "depot_id": depot["_id"], "kurir_id": kurir["_id"], "dibawa": b.dibawa, "dibawa_kurir": b.dibawa,
            "muatan_lain": [muatan_awal(produk[m.produk_id], m.dibawa) for m in lain],
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


class BarisPenjualan(BaseModel):
    produk_id: str = Field(A.UTAMA, min_length=1, max_length=64)
    galon_isi: int = Field(ge=1, le=200)
    galon_kosong: int = Field(0, ge=0, le=200)


class Penjualan(BaseModel):
    client_id: str = Field(min_length=8, max_length=64, description="ID unik dari HP supaya kirim ulang tidak membuat data ganda")
    jenis: Literal["toko", "rumah"]
    qr_token: str | None = Field(None, max_length=128)
    tanpa_qr_customer_id: str | None = Field(None, max_length=64)
    customer_id: str | None = Field(None, max_length=64)
    pelanggan_baru: PembeliBaru | None = None
    baris: list[BarisPenjualan] | None = Field(None, min_length=1, max_length=8, description="Satu kunjungan bisa berisi beberapa produk")
    galon_isi: int | None = Field(None, ge=1, le=200, description="Bentuk lama satu baris isi ulang galon")
    galon_kosong: int = Field(0, ge=0, le=200)
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


async def baris_kunjungan(depot_id: str, sale: dict) -> list[dict]:
    """Semua baris produk dari satu kunjungan (satu kali simpan). Penjualan lama hanya satu baris."""
    if not sale.get("kunjungan_id"):
        return [sale]
    return await db().sales.find({"depot_id": depot_id, "kunjungan_id": sale["kunjungan_id"]}).sort("baris_ke", 1).to_list(None)


async def hasil_kunjungan(depot_id: str, pertama: dict, duplikat: bool) -> dict:
    baris = await baris_kunjungan(depot_id, pertama)
    return {"penjualan": info_penjualan(baris[0]), "baris": [info_penjualan(x) for x in baris], "duplikat": duplikat}


@router.post("/penjualan")
async def catat_penjualan(b: Penjualan, s: dict = Depends(sesi_kurir)):
    depot, kurir, d = s["depot"], s["user"], db()
    lama = await d.sales.find_one({"depot_id": depot["_id"], "client_id": b.client_id})
    if lama:
        if lama["kurir_id"] != kurir["_id"]:
            galat(409, "ID penjualan bentrok. Coba simpan lagi.")
        return await hasil_kunjungan(depot["_id"], lama, duplikat=True)
    baris = b.baris or ([BarisPenjualan(galon_isi=b.galon_isi, galon_kosong=b.galon_kosong)] if b.galon_isi else [])
    if not baris:
        galat(400, "Isi jumlah yang diantar.")
    if len({x.produk_id for x in baris}) != len(baris):
        galat(400, "Satu produk hanya boleh satu baris dalam satu penjualan.")
    trip = await rit_aktif(depot["_id"], kurir["_id"])
    if not trip:
        galat(409, "Belum ada rit aktif. Tekan Mulai rit dulu.")
    waktu_hp = b.waktu_hp if b.waktu_hp is None or b.waktu_hp.tzinfo else b.waktu_hp.replace(tzinfo=timezone.utc)
    if rit_perlu_ditutup(depot, trip) and not (b.dicatat_offline and waktu_hp and tanggal_wib(waktu_hp) == trip["tanggal"]):
        galat(409, f"Rit tanggal {teks_tanggal(trip['tanggal'])} belum ditutup. Tekan Selesai rit & setor dulu, lalu mulai rit baru.")
    demo = depot.get("is_demo", False)
    if b.posisi_simulasi and not demo:
        galat(400, "Penjualan simulasi hanya bisa di depot contoh.")

    produk = await ambil_produk(depot["_id"], {x.produk_id for x in baris}, dijual_kurir=True)
    di_muatan = {m["produk_id"] for m in trip.get("muatan_lain") or []}
    for x in baris:
        if x.produk_id == A.UTAMA:
            if trip["dibawa"] == 0:
                galat(400, "Rit ini tidak membawa galon isi ulang.")
        elif x.produk_id not in produk:
            galat(400, "Produk tidak ditemukan atau tidak dijual lewat kurir.")
        elif x.produk_id not in di_muatan:
            galat(400, f"{produk[x.produk_id]['nama']} tidak ada di muatan rit ini. Minta bos membetulkan muatan.")

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
    if b.dicatat_offline and waktu_hp:
        urutan = min(kini, max(waktu_hp, trip["berangkat_at"]))
    dokumen = []
    for i, x in enumerate(baris):
        p = produk.get(x.produk_id)
        harga, harga_toko, harga_rumah = A.harga_produk(b.jenis, status, depot, p)
        dokumen.append({
            "_id": id_baru(), "depot_id": depot["_id"], "trip_id": trip["_id"], "kurir_id": kurir["_id"], "customer_id": c["_id"],
            "nama_pelanggan": c["nama"], "jenis": b.jenis, "produk_id": x.produk_id, "nama_produk": p["nama"] if p else "Isi ulang galon",
            "satuan": p["satuan"] if p else "galon", "galon_isi": x.galon_isi,
            "galon_kosong": x.galon_kosong if p is None or p.get("pakai_kosong") else 0, "bayar": b.bayar, "lunas": b.bayar == "tunai",
            "harga_berlaku": harga, "harga_toko": harga_toko, "harga_rumah": harga_rumah, "harga_beli": p.get("harga_beli") if p else None,
            "status_verifikasi": status, "lat": lat,
            "lng": lng, "akurasi_m": akurasi, "jarak_m": jarak, "qr_dipindai": qr_sah,
            "disimulasikan": b.posisi_simulasi is not None or (demo and b.jenis == "rumah"), "dicatat_offline": b.dicatat_offline,
            "waktu_hp": b.waktu_hp, "client_id": b.client_id if i == 0 else f"{b.client_id}-{i}", "kunjungan_id": b.client_id,
            "baris_ke": i, "disetujui_bos": False, "created_at": kini, "urutan_at": urutan, "tanggal": tanggal_wib(kini),
            **penanda_demo(depot)})
    if baru:
        await d.customers.insert_one(baru)
    try:
        await d.sales.insert_many(dokumen, ordered=True)
    except (DuplicateKeyError, BulkWriteError):
        lama = await d.sales.find_one({"depot_id": depot["_id"], "client_id": b.client_id})
        if not lama:
            raise
        return await hasil_kunjungan(depot["_id"], lama, duplikat=True)
    utama = [x for x in dokumen if x["produk_id"] == A.UTAMA]
    if utama:
        isi, kosong = sum(x["galon_isi"] for x in utama), sum(x["galon_kosong"] for x in utama)
        ubah = {"$set": {"saldo_galon": {"$max": [0, {"$add": [{"$ifNull": ["$saldo_galon", 0]}, isi - kosong]}]}}}
        if kosong > 0:
            ubah["$set"]["kosong_terakhir_at"] = kini
        await d.customers.update_one({"_id": c["_id"]}, [ubah])
    if baru:
        await d.approvals.insert_one({"_id": id_baru(), "depot_id": depot["_id"], "jenis": "pelanggan", "kurir_id": kurir["_id"],
                                      "customer_id": c["_id"], "sale_id": dokumen[0]["_id"], "data": {}, "alasan_kurir": "Pembeli baru",
                                      "status": "menunggu", "created_at": kini, **penanda_demo(depot)})
    await hitung_ulang(depot, dokumen[0]["tanggal"])
    return {"penjualan": info_penjualan(dokumen[0]), "baris": [info_penjualan(x) for x in dokumen], "duplikat": False}


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
    """Satu permintaan berlaku untuk semua baris produk di kunjungan yang sama."""
    sale = await penjualan_milik_kurir(sale_id, s)
    if sale["jenis"] != "toko" or A.berharga_toko(sale):
        galat(400, "Penjualan ini sudah memakai harga toko.")
    baris = await baris_kunjungan(s["depot"]["_id"], sale)
    if not any(not A.berharga_toko(x) and x["harga_rumah"] > x["harga_toko"] for x in baris):
        galat(400, "Produk di penjualan ini tidak punya harga toko.")
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
class PulangLain(BaseModel):
    produk_id: str = Field(min_length=1, max_length=64)
    isi_pulang: int = Field(ge=0, le=500)
    kosong_pulang: int = Field(0, ge=0, le=1000)


class SelesaiRit(BaseModel):
    isi_pulang: int = Field(ge=0, le=500)
    kosong_pulang: int = Field(ge=0, le=1000)
    uang_disetor: int = Field(ge=0, le=100_000_000)
    lain: list[PulangLain] = Field(default_factory=list, max_length=20)


@router.post("/rit/selesai")
async def selesai_rit(b: SelesaiRit, s: dict = Depends(sesi_kurir)):
    depot, kurir, d = s["depot"], s["user"], db()
    trip = await rit_aktif(depot["_id"], kurir["_id"])
    if not trip:
        galat(409, "Tidak ada rit aktif.")
    if b.isi_pulang > trip["dibawa"]:
        galat(400, f"Galon isi dibawa pulang tidak mungkin lebih dari muatan ({trip['dibawa']} galon).")
    pulang = {x.produk_id: x for x in b.lain}
    muatan = [dict(m) for m in trip.get("muatan_lain") or []]
    for m in muatan:
        x = pulang.get(m["produk_id"])
        if x is None:
            galat(400, f"Isi jumlah {m['nama']} yang dibawa pulang.")
        if x.isi_pulang > m["dibawa"]:
            galat(400, f"{m['nama']} dibawa pulang tidak mungkin lebih dari muatan ({m['dibawa']} {m['satuan']}).")
        m.update(isi_pulang=x.isi_pulang, kosong_pulang=x.kosong_pulang if m.get("pakai_kosong") else None)
    penjualan = await d.sales.find({"depot_id": depot["_id"], "trip_id": trip["_id"]}).to_list(None)
    trip.update(isi_pulang=b.isi_pulang, kosong_pulang=b.kosong_pulang, uang_disetor=b.uang_disetor, muatan_lain=muatan)
    setoran = A.hitung_setoran(trip, penjualan)
    ubah = {"isi_pulang": b.isi_pulang, "kosong_pulang": b.kosong_pulang, "uang_disetor": b.uang_disetor, "muatan_lain": muatan,
            "status": "selesai", "selesai_at": sekarang(), "uang_seharusnya": setoran["uang_seharusnya"],
            "selisih_uang": setoran["selisih_uang"], "selisih_galon": setoran["selisih_galon"], "selisih_kosong": setoran["selisih_kosong"]}
    await d.trips.update_one({"_id": trip["_id"], "status": "aktif"}, {"$set": ubah})
    await hitung_ulang(depot, trip["tanggal"])
    return {"rit": bersih({**trip, **ubah}), "setoran": setoran}
