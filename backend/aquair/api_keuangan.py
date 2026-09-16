"""Endpoint bos: buku kas sederhana (spesifikasi 6.3).

Dasarnya uang yang benar-benar berpindah, bukan pembukuan akrual:
uang masuk = penjualan tunai lewat kurir + penjualan di depot + bon yang dilunasi pada periode itu,
uang keluar = pengeluaran yang dicatat bos, dan untung = selisih keduanya. Bon yang belum dibayar
tidak pernah ikut dihitung sampai ditandai lunas, supaya angkanya sama dengan isi laci depot.

Untung kotor per produk dihitung terpisah untuk barang dagangan yang punya harga beli (LPG, air kemasan,
galon baru). Angkanya tidak boleh dijumlahkan dengan untung bersih: modal barang itu sudah ikut tercatat
sebagai pengeluaran waktu stoknya dibeli. Isi ulang galon tidak punya harga beli karena diproduksi sendiri.
"""
from __future__ import annotations

from collections import defaultdict
from datetime import date, datetime, time, timezone
from typing import Literal

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field

from . import aturan as A
from .inti import WIB, ambil_milik_depot, bersih, catat_audit, db, galat, id_baru, jam_wib, penanda_demo, sekarang, tanggal_wib
from .keamanan import sesi_bos

router = APIRouter(prefix="/bos")
POLA_TANGGAL = r"^\d{4}-\d{2}-\d{2}$"
BATAS_HARI = 366

# Kategori pengeluaran depot air minum isi ulang. Kodenya tetap; namanya yang tampil di layar dan CSV.
KATEGORI = [("bahan", "Air baku & bahan"), ("listrik", "Listrik & air"), ("gaji", "Gaji & upah"),
            ("galon", "Galon, tutup & segel"), ("perawatan", "Perawatan & suku cadang"), ("transport", "BBM & kendaraan"),
            ("sewa", "Sewa tempat"), ("lainnya", "Lain-lain")]
NAMA_KATEGORI = dict(KATEGORI)
KodeKategori = Literal["bahan", "listrik", "gaji", "galon", "perawatan", "transport", "sewa", "lainnya"]


def awal_hari(tanggal: str) -> datetime:
    """Tengah malam WIB pada tanggal itu, dalam UTC (untuk menyaring cap waktu pelunasan bon)."""
    return datetime.combine(date.fromisoformat(tanggal), time(0), tzinfo=WIB).astimezone(timezone.utc)


def rentang_periode(periode: str, dari: str | None, sampai: str | None) -> tuple[str, str]:
    """Periode siap pakai untuk bos; "khusus" memakai tanggal pilihan sendiri."""
    hari_ini = tanggal_wib()
    if periode == "hari":
        return hari_ini, hari_ini
    if periode == "minggu":
        return A.geser_tanggal(hari_ini, -6), hari_ini
    if periode == "bulan":
        return f"{hari_ini[:7]}-01", hari_ini
    dari, sampai = dari or A.geser_tanggal(hari_ini, -29), sampai or hari_ini
    if dari > sampai:
        galat(400, "Tanggal awal tidak boleh melewati tanggal akhir.")
    if A.selisih_hari(dari, sampai) >= BATAS_HARI:
        galat(400, "Rentang paling panjang satu tahun.")
    return dari, sampai


def info_pengeluaran(x: dict) -> dict:
    return {**bersih(x), "jam": jam_wib(x["created_at"])}


@router.get("/keuangan")
async def keuangan(periode: Literal["hari", "minggu", "bulan", "khusus"] = "bulan",
                   dari: str | None = Query(None, pattern=POLA_TANGGAL), sampai: str | None = Query(None, pattern=POLA_TANGGAL),
                   s: dict = Depends(sesi_bos)):
    depot, d = s["depot"], db()
    dari, sampai = rentang_periode(periode, dari, sampai)
    rentang = {"depot_id": depot["_id"], "tanggal": {"$gte": dari, "$lte": sampai}}
    penjualan = await d.sales.find(rentang).to_list(None)
    jual_depot = [x for x in await d.depot_sales.find(rentang).to_list(None) if not x.get("batal")]
    catatan = await d.expenses.find(rentang).sort([("tanggal", -1), ("created_at", -1)]).to_list(None)
    dilunasi = await d.sales.find({"depot_id": depot["_id"], "bayar": "bon", "lunas": True,
                                   "lunas_at": {"$gte": awal_hari(dari), "$lt": awal_hari(A.geser_tanggal(sampai, 1))}}).to_list(None)

    nilai = lambda x: x["galon_isi"] * x["harga_berlaku"]  # noqa: E731
    per_hari = {t: {"tanggal": t, "masuk": 0, "keluar": 0, "untung": 0} for t in A.daftar_tanggal(dari, sampai)}

    def tambah(tanggal: str, kolom: str, jumlah: int):
        if tanggal in per_hari:
            per_hari[tanggal][kolom] += jumlah

    tunai = bon_belum_lunas = 0
    for x in penjualan:
        if x["bayar"] == "bon":
            if not x.get("lunas"):
                bon_belum_lunas += nilai(x)
        else:
            tunai += nilai(x)
            tambah(x["tanggal"], "masuk", nilai(x))
    uang_depot = 0
    for x in jual_depot:
        uang_depot += x["total"]
        tambah(x["tanggal"], "masuk", x["total"])
    pelunasan = 0
    for x in dilunasi:
        pelunasan += nilai(x)
        tambah(tanggal_wib(x["lunas_at"]), "masuk", nilai(x))
    per_kategori: dict[str, int] = defaultdict(int)
    keluar = 0
    for x in catatan:
        keluar += x["jumlah"]
        per_kategori[x["kategori"]] += x["jumlah"]
        tambah(x["tanggal"], "keluar", x["jumlah"])
    for h in per_hari.values():
        h["untung"] = h["masuk"] - h["keluar"]

    # Untung kotor per produk: hanya barang dagangan yang punya harga beli. Angka ini terpisah dari untung
    # bersih di atas dan tidak boleh dijumlahkan dengannya, karena modal barang sudah tercatat sebagai pengeluaran.
    per_produk: dict[str, dict] = {}

    def barang(produk_id: str, nama: str, satuan: str, jumlah: int, omzet: int, modal_satuan: int | None):
        b = per_produk.setdefault(produk_id, {"produk_id": produk_id, "nama": nama, "satuan": satuan, "jumlah": 0,
                                              "omzet": 0, "modal": 0, "tanpa_modal": 0})
        b["jumlah"] += jumlah
        b["omzet"] += omzet
        if modal_satuan is None:
            b["tanpa_modal"] += jumlah
        else:
            b["modal"] += modal_satuan * jumlah

    for x in penjualan:
        barang(x.get("produk_id") or A.UTAMA, x.get("nama_produk") or "Isi ulang galon", x.get("satuan") or "galon",
               x["galon_isi"], nilai(x), x.get("harga_beli"))
    for x in jual_depot:
        barang(x["produk_id"], x["nama_produk"], x["satuan"], x["jumlah"], x["total"], x.get("harga_beli"))
    daftar_produk = []
    for b in sorted(per_produk.values(), key=lambda b: -b["omzet"]):
        ada_modal = b["tanpa_modal"] == 0 and b["modal"] > 0
        daftar_produk.append({"produk_id": b["produk_id"], "utama": b["produk_id"] == A.UTAMA,
                              "nama": b["nama"], "satuan": b["satuan"], "jumlah": b["jumlah"],
                              "omzet": b["omzet"], "modal": b["modal"] if ada_modal else None, "ada_modal": ada_modal,
                              "untung_kotor": b["omzet"] - b["modal"] if ada_modal else None})

    masuk = tunai + uang_depot + pelunasan
    hari = len(per_hari)
    return {
        "periode": periode, "rentang": {"dari": dari, "sampai": sampai}, "jumlah_hari": hari,
        "masuk": {"penjualan_kurir": tunai, "penjualan_depot": uang_depot, "pelunasan_bon": pelunasan, "total": masuk},
        "keluar": {"total": keluar, "jumlah_catatan": len(catatan),
                   "per_kategori": sorted(([{"kode": k, "nama": NAMA_KATEGORI.get(k, k), "jumlah": v} for k, v in per_kategori.items()]),
                                          key=lambda x: -x["jumlah"])},
        "untung": masuk - keluar, "untung_per_hari": round((masuk - keluar) / hari) if hari else 0,
        "bon_belum_lunas": bon_belum_lunas, "harian": list(per_hari.values()),
        "produk": daftar_produk, "untung_kotor_produk": sum(b["untung_kotor"] for b in daftar_produk if b["ada_modal"]),
        "pengeluaran": [info_pengeluaran(x) for x in catatan],
        "kategori": [{"kode": k, "nama": n} for k, n in KATEGORI],
    }


class DataPengeluaran(BaseModel):
    kategori: KodeKategori
    keterangan: str = Field(min_length=2, max_length=120)
    jumlah: int = Field(ge=1, le=1_000_000_000)
    tanggal: str | None = Field(None, pattern=POLA_TANGGAL)


@router.post("/pengeluaran")
async def catat_pengeluaran(b: DataPengeluaran, s: dict = Depends(sesi_bos)):
    depot, kini = s["depot"], sekarang()
    tanggal = b.tanggal or tanggal_wib(kini)
    if tanggal > tanggal_wib(kini):
        galat(400, "Tanggal pengeluaran tidak boleh di masa depan.")
    x = {"_id": id_baru(), "depot_id": depot["_id"], "tanggal": tanggal, "kategori": b.kategori,
         "nama_kategori": NAMA_KATEGORI[b.kategori], "keterangan": b.keterangan.strip(), "jumlah": b.jumlah,
         "dicatat_oleh": s["user"]["_id"], "nama_pengguna": s["user"]["nama"], "created_at": kini, **penanda_demo(depot)}
    await db().expenses.insert_one(x)
    await catat_audit(depot, s["user"], f"Catat pengeluaran {x['nama_kategori']}", sesudah=f"{x['keterangan']} · {A.rp(x['jumlah'])}")
    return info_pengeluaran(x)


@router.delete("/pengeluaran/{pengeluaran_id}")
async def hapus_pengeluaran(pengeluaran_id: str, s: dict = Depends(sesi_bos)):
    depot = s["depot"]
    x = await ambil_milik_depot("expenses", pengeluaran_id, depot["_id"], "Catatan pengeluaran tidak ditemukan.")
    await db().expenses.delete_one({"_id": pengeluaran_id})
    await catat_audit(depot, s["user"], f"Hapus pengeluaran {x.get('nama_kategori', x['kategori'])}",
                      sebelum=f"{x['keterangan']} · {A.rp(x['jumlah'])}", sesudah="dihapus")
    return {"ok": True}
