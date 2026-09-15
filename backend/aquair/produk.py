"""Katalog produk depot (spesifikasi 6.1). Isi ulang galon adalah produk utama dengan id "utama":
harganya diambil dari pengaturan depot, dan hanya produk ini yang dipakai aturan R1, R3, dan R8."""
from __future__ import annotations

from .aturan import UTAMA
from .inti import bersih, db

KATEGORI = ("isi_ulang", "wadah_kecil", "galon_baru", "air_kemasan", "lpg", "lainnya")


def info_produk_utama(depot: dict) -> dict:
    return {"id": UTAMA, "nama": "Isi ulang galon", "kategori": "isi_ulang", "satuan": "galon", "harga_rumah": depot["harga_rumah"],
            "harga_toko": depot["harga_toko"], "dijual_kurir": True, "dijual_depot": False, "pakai_kosong": True, "aktif": True,
            "utama": True}


def info_produk(p: dict) -> dict:
    return {**bersih(p), "utama": False}


async def ambil_produk(depot_id: str, ids: set[str], **syarat) -> dict[str, dict]:
    """Produk aktif milik depot, selain produk utama. Produk depot lain tidak pernah ikut."""
    ids = {i for i in ids if i != UTAMA}
    if not ids:
        return {}
    daftar = await db().products.find({"depot_id": depot_id, "_id": {"$in": list(ids)}, "aktif": True, **syarat}).to_list(None)
    return {p["_id"]: p for p in daftar}


def muatan_awal(p: dict, dibawa: int) -> dict:
    """Salinan data produk saat rit dimulai, supaya perubahan katalog tidak mengubah pencocokan rit lama."""
    return {"produk_id": p["_id"], "nama": p["nama"], "satuan": p["satuan"], "harga_rumah": p["harga_rumah"],
            "pakai_kosong": bool(p.get("pakai_kosong")), "dibawa": dibawa, "dibawa_kurir": dibawa, "isi_pulang": None,
            "kosong_pulang": None}
