"""Endpoint bos: produk & harga, dan penjualan di depot (spesifikasi 6.1 dan 6.2)."""
from __future__ import annotations

from collections import defaultdict
from typing import Literal

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field

from .aturan import UTAMA, rp
from .inti import ambil_milik_depot, bersih, catat_audit, db, galat, id_baru, jam_wib, penanda_demo, sekarang, tanggal_wib
from .keamanan import sesi_bos
from .produk import ambil_produk, info_produk, info_produk_utama

router = APIRouter(prefix="/bos")
POLA_TANGGAL = r"^\d{4}-\d{2}-\d{2}$"


# ---------------------------------------------------------------- Produk & harga
class DataProduk(BaseModel):
    nama: str = Field(min_length=2, max_length=60)
    kategori: Literal["isi_ulang", "wadah_kecil", "galon_baru", "air_kemasan", "lpg", "lainnya"]
    satuan: str = Field(min_length=1, max_length=15)
    harga_rumah: int = Field(ge=0, le=10_000_000)
    harga_toko: int | None = Field(None, ge=0, le=10_000_000)
    harga_beli: int | None = Field(None, ge=0, le=10_000_000)
    dijual_kurir: bool = True
    dijual_depot: bool = False
    pakai_kosong: bool = False
    aktif: bool = True


async def periksa_produk(depot_id: str, b: DataProduk, kecuali: str | None = None) -> dict:
    data = {**b.model_dump(), "nama": b.nama.strip(), "satuan": b.satuan.strip()}
    if data["harga_toko"] is not None and data["harga_toko"] >= data["harga_rumah"]:
        galat(400, "Harga toko harus lebih murah dari harga rumah. Kosongkan kalau produk ini hanya punya satu harga.")
    if data["harga_beli"] is not None and data["harga_beli"] >= data["harga_rumah"]:
        galat(400, "Harga beli harus lebih murah dari harga jual. Kosongkan kalau produk ini hasil produksi depot sendiri.")
    if not (data["dijual_kurir"] or data["dijual_depot"]):
        galat(400, "Pilih minimal satu cara jual: lewat kurir atau di depot.")
    if data["nama"].lower() == "isi ulang galon":
        galat(409, "Isi ulang galon sudah ada sebagai produk utama.")
    lain = await db().products.find({"depot_id": depot_id, "_id": {"$ne": kecuali}}, {"nama": 1}).to_list(None)
    if any(p["nama"].lower() == data["nama"].lower() for p in lain):
        galat(409, "Nama produk ini sudah ada.")
    return data


@router.get("/produk")
async def daftar_produk(s: dict = Depends(sesi_bos)):
    depot = s["depot"]
    daftar = await db().products.find({"depot_id": depot["_id"]}).sort([("aktif", -1), ("nama", 1)]).to_list(None)
    return {"produk": [info_produk_utama(depot)] + [info_produk(p) for p in daftar]}


@router.post("/produk")
async def tambah_produk(b: DataProduk, s: dict = Depends(sesi_bos)):
    depot = s["depot"]
    data = await periksa_produk(depot["_id"], b)
    p = {"_id": id_baru(), "depot_id": depot["_id"], **data, "created_at": sekarang(), **penanda_demo(depot)}
    await db().products.insert_one(p)
    await catat_audit(depot, s["user"], f"Tambah produk {p['nama']}", sesudah={k: data[k] for k in ("harga_rumah", "harga_toko", "satuan")})
    return info_produk(p)


@router.put("/produk/{produk_id}")
async def ubah_produk(produk_id: str, b: DataProduk, s: dict = Depends(sesi_bos)):
    depot = s["depot"]
    if produk_id == UTAMA:
        galat(400, "Harga isi ulang galon diatur di Pengaturan.")
    p = await ambil_milik_depot("products", produk_id, depot["_id"], "Produk tidak ditemukan.")
    data = await periksa_produk(depot["_id"], b, kecuali=produk_id)
    berubah = {k: (p.get(k), v) for k, v in data.items() if p.get(k) != v}
    if berubah:
        await db().products.update_one({"_id": produk_id}, {"$set": data})
        await catat_audit(depot, s["user"], f"Ubah produk {p['nama']}", sebelum={k: v[0] for k, v in berubah.items()},
                          sesudah={k: v[1] for k, v in berubah.items()})
    return info_produk({**p, **data})


# ---------------------------------------------------------------- Penjualan di depot
class JualDepot(BaseModel):
    produk_id: str = Field(min_length=1, max_length=64)
    jumlah: int = Field(ge=1, le=500)


class Batal(BaseModel):
    alasan: str = Field(min_length=3, max_length=300)


def info_jual_depot(x: dict) -> dict:
    return {**bersih(x), "jam": jam_wib(x["created_at"])}


@router.get("/penjualan-depot")
async def daftar_penjualan_depot(tanggal: str | None = Query(None, pattern=POLA_TANGGAL), s: dict = Depends(sesi_bos)):
    tanggal = tanggal or tanggal_wib()
    daftar = await db().depot_sales.find({"depot_id": s["depot"]["_id"], "tanggal": tanggal}).sort("created_at", -1).to_list(None)
    aktif = [x for x in daftar if not x.get("batal")]
    per: dict[str, dict] = defaultdict(lambda: {"jumlah": 0, "total": 0})
    for x in aktif:
        g = per[x["produk_id"]]
        g.update(nama=x["nama_produk"], satuan=x["satuan"])
        g["jumlah"] += x["jumlah"]
        g["total"] += x["total"]
    produk = await db().products.find({"depot_id": s["depot"]["_id"], "aktif": True, "dijual_depot": True}).sort("nama", 1).to_list(None)
    return {"tanggal": tanggal, "total": sum(x["total"] for x in aktif), "jumlah_transaksi": len(aktif),
            "per_produk": [{"produk_id": k, **v} for k, v in sorted(per.items(), key=lambda kv: -kv[1]["total"])],
            "baris": [info_jual_depot(x) for x in daftar], "produk": [info_produk(p) for p in produk]}


@router.post("/penjualan-depot")
async def catat_penjualan_depot(b: JualDepot, s: dict = Depends(sesi_bos)):
    depot, kini = s["depot"], sekarang()
    p = (await ambil_produk(depot["_id"], {b.produk_id}, dijual_depot=True)).get(b.produk_id)
    if not p:
        galat(400, "Produk tidak ditemukan atau tidak dijual di depot.")
    x = {"_id": id_baru(), "depot_id": depot["_id"], "produk_id": p["_id"], "nama_produk": p["nama"], "satuan": p["satuan"],
         "jumlah": b.jumlah, "harga": p["harga_rumah"], "harga_beli": p.get("harga_beli"), "total": b.jumlah * p["harga_rumah"],
         "bayar": "tunai", "batal": False,
         "dicatat_oleh": s["user"]["_id"], "nama_pengguna": s["user"]["nama"], "created_at": kini, "tanggal": tanggal_wib(kini),
         **penanda_demo(depot)}
    await db().depot_sales.insert_one(x)
    return info_jual_depot(x)


@router.post("/penjualan-depot/{jual_id}/batal")
async def batalkan_penjualan_depot(jual_id: str, b: Batal, s: dict = Depends(sesi_bos)):
    depot = s["depot"]
    x = await ambil_milik_depot("depot_sales", jual_id, depot["_id"], "Penjualan tidak ditemukan.")
    if x.get("batal"):
        galat(409, "Penjualan ini sudah dibatalkan.")
    await db().depot_sales.update_one({"_id": jual_id}, {"$set": {"batal": True, "alasan_batal": b.alasan, "batal_at": sekarang()}})
    await catat_audit(depot, s["user"], f"Batalkan penjualan di depot: {x['jumlah']} {x['satuan']} {x['nama_produk']}",
                      sebelum=rp(x["total"]), sesudah="batal", alasan=b.alasan)
    return {"ok": True}
