"""Endpoint bos tambahan: unduh CSV, galon di luar, konfirmasi toko, cek acak, perawatan, kepatuhan, data ringkasan AI."""
from __future__ import annotations

import io
import random
import re
import secrets
from datetime import date, timedelta
from typing import Literal

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from . import aturan as A
from .api_publik import hash_token
from .inti import WIB, ambil_milik_depot, catat_audit, db, galat, id_baru, jam_wib, penanda_demo, sekarang, tanggal_wib
from .keamanan import sesi_bos
from .layanan import dasbor, nama_kurir

router = APIRouter(prefix="/bos")
POLA_TANGGAL = r"^\d{4}-\d{2}-\d{2}$"


# ---------------------------------------------------------------- Unduh CSV (spesifikasi 6)
def sel_teks(v) -> str:
    """Sel teks: cegah rumus Excel, bungkus bila berisi pemisah atau kutip."""
    t = "" if v is None else str(v)
    if re.match(r"^[=+\-@]", t):
        t = "'" + t
    return f'"{t.replace(chr(34), chr(34) * 2)}"' if re.search(r'[;"\n\r]', t) else t


def sel_angka(v) -> str:
    return "" if v is None else str(int(round(v)))


def waktu_csv(dt) -> str:
    return dt.astimezone(WIB).strftime("%Y-%m-%d %H:%M") if dt else ""


NAMA_JENIS = {"penjualan": "penjualan", "rit": "rit-setoran", "tanda": "tanda-radar", "audit": "log-audit"}


@router.get("/unduh")
async def unduh_csv(jenis: Literal["penjualan", "rit", "tanda", "audit"] = "penjualan", dari: str | None = None,
                    sampai: str | None = None, s: dict = Depends(sesi_bos)):
    depot, d = s["depot"], db()
    sampai = sampai or tanggal_wib()
    dari = dari or A.geser_tanggal(sampai, -29)
    if not re.match(POLA_TANGGAL, dari) or not re.match(POLA_TANGGAL, sampai) or dari > sampai:
        galat(400, "Rentang tanggal tidak benar.")
    kurir = await nama_kurir(depot["_id"])
    nk = lambda kid: kurir.get(kid, {}).get("nama", "")  # noqa: E731
    rentang = {"depot_id": depot["_id"], "tanggal": {"$gte": dari, "$lte": sampai}}
    baris: list[list[str]] = []

    if jenis == "penjualan":
        kepala = ["waktu", "kurir", "pelanggan", "jenis", "galon_isi", "galon_kosong", "bayar", "lunas", "status_verifikasi",
                  "disetujui_bos", "jarak_m", "akurasi_m", "harga_berlaku", "total", "dicatat_offline", "disimulasikan"]
        for x in await d.sales.find(rentang).sort("urutan_at", 1).to_list(None):
            baris.append([waktu_csv(x["urutan_at"]), sel_teks(nk(x["kurir_id"])), sel_teks(x["nama_pelanggan"]), x["jenis"],
                          sel_angka(x["galon_isi"]), sel_angka(x["galon_kosong"]), x["bayar"], "ya" if x.get("lunas") else "tidak",
                          x["status_verifikasi"], "ya" if x.get("disetujui_bos") else "tidak", sel_angka(x.get("jarak_m")),
                          sel_angka(x.get("akurasi_m")), sel_angka(x["harga_berlaku"]), sel_angka(x["galon_isi"] * x["harga_berlaku"]),
                          "ya" if x.get("dicatat_offline") else "tidak", "ya" if x.get("disimulasikan") else "tidak"])
    elif jenis == "rit":
        kepala = ["tanggal", "kurir", "berangkat", "dibawa", "muatan_dicek", "terjual_catatan", "isi_pulang", "kosong_pulang",
                  "selisih_galon", "uang_seharusnya", "uang_disetor", "selisih_uang", "status"]
        trips = await d.trips.find(rentang).sort("berangkat_at", 1).to_list(None)
        sales = await d.sales.find({"depot_id": depot["_id"], "trip_id": {"$in": [t["_id"] for t in trips]}}).to_list(None)
        for t in trips:
            st = A.hitung_setoran(t, [x for x in sales if x["trip_id"] == t["_id"]])
            baris.append([t["tanggal"], sel_teks(nk(t["kurir_id"])), waktu_csv(t["berangkat_at"]), sel_angka(t["dibawa"]),
                          "ya" if t.get("muatan_dicek") else "tidak", sel_angka(st["galon_catatan"]), sel_angka(t.get("isi_pulang")),
                          sel_angka(t.get("kosong_pulang")), sel_angka(st["selisih_galon"]), sel_angka(st["uang_seharusnya"]),
                          sel_angka(t.get("uang_disetor")), sel_angka(st["selisih_uang"]), t["status"]])
    elif jenis == "tanda":
        kepala = ["tanggal", "kurir", "kode", "penjelasan", "perkiraan_rupiah", "masuk_ke", "status"]
        for f in await d.flags.find(rentang).sort([("tanggal", 1), ("kode", 1)]).to_list(None):
            baris.append([f["tanggal"], sel_teks(nk(f["kurir_id"])), f["kode"], sel_teks(f["penjelasan"]), sel_angka(f["perkiraan_rupiah"]),
                          f["masuk_ke"] or "", f["status"]])
    else:
        kepala = ["waktu", "pengguna", "aksi", "sebelum", "sesudah", "alasan"]
        awal = A.geser_tanggal(dari, 0)
        for a in await d.audit_log.find({"depot_id": depot["_id"]}).sort("created_at", 1).to_list(None):
            if not (awal <= tanggal_wib(a["created_at"]) <= sampai):
                continue
            baris.append([waktu_csv(a["created_at"]), sel_teks(a["nama_pengguna"]), sel_teks(a["aksi"]), sel_teks(a.get("sebelum")),
                          sel_teks(a.get("sesudah")), sel_teks(a.get("alasan"))])

    nama = f"aquair-{NAMA_JENIS[jenis]}-{dari}_{sampai}.csv"
    await catat_audit(depot, s["user"], "Unduh data CSV", sesudah=nama)
    isi = "﻿" + "\r\n".join(";".join(r) for r in [kepala, *baris]) + "\r\n"
    return StreamingResponse(io.BytesIO(isi.encode("utf-8")), media_type="text/csv; charset=utf-8",
                             headers={"Content-Disposition": f'attachment; filename="{nama}"', "X-Jumlah-Baris": str(len(baris))})


# ---------------------------------------------------------------- Galon di luar (Tahap 2)
BATAS_TIDAK_KEMBALI = 14


@router.get("/galon")
async def galon_di_luar(s: dict = Depends(sesi_bos)):
    kini = sekarang()
    daftar = await db().customers.find({"depot_id": s["depot"]["_id"], "saldo_galon": {"$gt": 0}, "status": {"$ne": "ditolak"}}).to_list(None)
    hasil = []
    for c in daftar:
        acuan = c.get("kosong_terakhir_at") or c.get("created_at")
        hari = (kini - acuan).days if acuan else 0
        hasil.append({"id": c["_id"], "nama": c["nama"], "jenis": c["jenis"], "saldo_galon": c["saldo_galon"], "hari_tanpa_kosong": hari,
                      "pernah_kembali": bool(c.get("kosong_terakhir_at")), "tidak_kembali": hari > BATAS_TIDAK_KEMBALI})
    hasil.sort(key=lambda x: -x["saldo_galon"])
    macet = sorted([x for x in hasil if x["tidak_kembali"]], key=lambda x: -x["hari_tanpa_kosong"])
    return {"total": sum(x["saldo_galon"] for x in hasil), "pelanggan": hasil, "tidak_kembali": macet,
            "total_tidak_kembali": sum(x["saldo_galon"] for x in macet)}


class KoreksiSaldo(BaseModel):
    saldo: int = Field(ge=0, le=10000)
    alasan: str = Field(min_length=3, max_length=300)


@router.post("/galon/{customer_id}/koreksi")
async def koreksi_saldo(customer_id: str, b: KoreksiSaldo, s: dict = Depends(sesi_bos)):
    depot = s["depot"]
    c = await ambil_milik_depot("customers", customer_id, depot["_id"], "Pelanggan tidak ditemukan.")
    ubah = {"saldo_galon": b.saldo}
    if b.saldo < (c.get("saldo_galon") or 0):
        ubah["kosong_terakhir_at"] = sekarang()
    await db().customers.update_one({"_id": customer_id}, {"$set": ubah})
    await catat_audit(depot, s["user"], f"Koreksi saldo galon {c['nama']}", sebelum=f"{c.get('saldo_galon', 0)} galon",
                      sesudah=f"{b.saldo} galon", alasan=b.alasan)
    return {"ok": True}


# ---------------------------------------------------------------- Konfirmasi toko dan cek acak (Tahap 2)
def periode_lalu() -> tuple[str, str]:
    d = date.fromisoformat(tanggal_wib())
    senin = d - timedelta(days=d.weekday() + 7)
    return senin.isoformat(), (senin + timedelta(days=6)).isoformat()


async def galon_toko_periode(depot_id: str, mulai: str, selesai: str) -> dict[str, int]:
    hasil: dict[str, int] = {}
    async for x in db().sales.find({"depot_id": depot_id, "jenis": "toko", "tanggal": {"$gte": mulai, "$lte": selesai}}, {"customer_id": 1, "galon_isi": 1}):
        hasil[x["customer_id"]] = hasil.get(x["customer_id"], 0) + x["galon_isi"]
    return hasil


@router.get("/konfirmasi")
async def daftar_konfirmasi(s: dict = Depends(sesi_bos)):
    depot, d = s["depot"], db()
    mulai, selesai = periode_lalu()
    galon = await galon_toko_periode(depot["_id"], mulai, selesai)
    toko = await d.customers.find({"depot_id": depot["_id"], "jenis": "toko", "status": "aktif"}).sort("nama", 1).to_list(None)
    konf = {k["customer_id"]: k for k in await d.confirmations.find({"depot_id": depot["_id"], "periode_mulai": mulai}).to_list(None)}
    baris = []
    for c in toko:
        k = konf.get(c["_id"])
        status = "belum" if not k or not k.get("dikirim_at") else (k["jawaban"] or "menunggu")
        baris.append({"customer_id": c["_id"], "nama": c["nama"], "no_wa": c.get("no_wa") or "", "galon_tercatat": k["galon_tercatat"] if k else galon.get(c["_id"], 0),
                      "status": status, "galon_menurut_toko": k.get("galon_menurut_toko") if k else None,
                      "dikirim": jam_wib(k["dikirim_at"]) if k and k.get("dikirim_at") else None})
    return {"periode_mulai": mulai, "periode_selesai": selesai, "is_demo": depot.get("is_demo", False), "toko": baris}


@router.post("/konfirmasi/{customer_id}/kirim")
async def kirim_konfirmasi(customer_id: str, s: dict = Depends(sesi_bos)):
    """Buat tautan baru (token lama langsung tidak berlaku). Token disimpan dalam bentuk hash; teks aslinya hanya dikembalikan sekarang."""
    depot, d = s["depot"], db()
    c = await ambil_milik_depot("customers", customer_id, depot["_id"], "Toko tidak ditemukan.")
    if c["jenis"] != "toko":
        galat(400, "Konfirmasi hanya untuk toko.")
    mulai, selesai = periode_lalu()
    k = await d.confirmations.find_one({"depot_id": depot["_id"], "customer_id": customer_id, "periode_mulai": mulai})
    if k and k.get("jawaban"):
        galat(409, "Toko ini sudah menjawab untuk periode ini.")
    tercatat = (await galon_toko_periode(depot["_id"], mulai, selesai)).get(customer_id, 0)
    token = secrets.token_urlsafe(24)
    ubah = {"token_hash": hash_token(token), "dikirim_at": sekarang(), "berlaku_sampai": A.geser_tanggal(tanggal_wib(), 7),
            "galon_tercatat": tercatat}
    if k:
        await d.confirmations.update_one({"_id": k["_id"]}, {"$set": ubah})
    else:
        await d.confirmations.insert_one({"_id": id_baru(), "depot_id": depot["_id"], "customer_id": customer_id, "periode_mulai": mulai,
                                          "periode_selesai": selesai, "jawaban": None, "galon_menurut_toko": None, "dijawab_at": None,
                                          "tanggal_jawab": None, **ubah, **penanda_demo(depot)})
    await catat_audit(depot, s["user"], f"Kirim konfirmasi ke {c['nama']}", sesudah=f"{mulai} s.d. {selesai}, {tercatat} galon")
    return {"token": token, "nama_toko": c["nama"], "no_wa": c.get("no_wa") or "", "periode_mulai": mulai, "periode_selesai": selesai,
            "galon_tercatat": tercatat, "nama_depot": depot["nama"], "is_demo": depot.get("is_demo", False)}


@router.get("/cek-acak")
async def cek_acak(s: dict = Depends(sesi_bos)):
    """Pilih acak 3 toko dari penjualan toko hari ini; yang bertanda Radar atau tanpa bukti diutamakan."""
    depot, d, hari_ini = s["depot"], db(), tanggal_wib()
    sales = await d.sales.find({"depot_id": depot["_id"], "jenis": "toko", "tanggal": hari_ini}).to_list(None)
    ditandai = {f.get("customer_id") for f in await d.flags.find({"depot_id": depot["_id"], "tanggal": hari_ini}).to_list(None)}
    per_toko: dict[str, dict] = {}
    for x in sales:
        p = per_toko.setdefault(x["customer_id"], {"customer_id": x["customer_id"], "nama": x["nama_pelanggan"], "galon": 0, "prioritas": False})
        p["galon"] += x["galon_isi"]
        p["prioritas"] |= x["customer_id"] in ditandai or A.tanpa_bukti(x)
    daftar = list(per_toko.values())
    random.shuffle(daftar)
    daftar.sort(key=lambda p: not p["prioritas"])
    pilih = daftar[:3]
    wa = {c["_id"]: c.get("no_wa") or "" for c in await d.customers.find({"_id": {"$in": [p["customer_id"] for p in pilih]}}).to_list(None)}
    for p in pilih:
        p["no_wa"] = wa.get(p["customer_id"], "")
    if pilih:
        await catat_audit(depot, s["user"], "Cek acak 3 toko", sesudah=", ".join(p["nama"] for p in pilih))
    return {"nama_depot": depot["nama"], "is_demo": depot.get("is_demo", False), "toko": pilih}


# ---------------------------------------------------------------- Perawatan dan kepatuhan (Tahap 3)
def info_komponen(p: dict, hari_ini: str) -> dict:
    jadwal = A.geser_tanggal(p["tanggal_terakhir"], p["interval_hari"]) if p.get("tanggal_terakhir") else None
    return {"id": p["_id"], "komponen": p["komponen"], "interval_hari": p["interval_hari"], "tanggal_terakhir": p.get("tanggal_terakhir"),
            "jadwal": jadwal, "sisa_hari": A.selisih_hari(hari_ini, jadwal) if jadwal else None}


@router.get("/perawatan")
async def daftar_perawatan(s: dict = Depends(sesi_bos)):
    hari_ini = tanggal_wib()
    daftar = [info_komponen(p, hari_ini) for p in await db().maintenance.find({"depot_id": s["depot"]["_id"]}).to_list(None)]
    return sorted(daftar, key=lambda x: (x["sisa_hari"] is None, x["sisa_hari"] if x["sisa_hari"] is not None else 0))


class UbahKomponen(BaseModel):
    interval_hari: int = Field(ge=1, le=3650)
    tanggal_terakhir: str | None = Field(None, pattern=POLA_TANGGAL)


@router.put("/perawatan/{komponen_id}")
async def ubah_komponen(komponen_id: str, b: UbahKomponen, s: dict = Depends(sesi_bos)):
    depot = s["depot"]
    p = await ambil_milik_depot("maintenance", komponen_id, depot["_id"], "Komponen tidak ditemukan.")
    if b.tanggal_terakhir and b.tanggal_terakhir > tanggal_wib():
        galat(400, "Tanggal ganti terakhir tidak boleh di masa depan.")
    await db().maintenance.update_one({"_id": komponen_id}, {"$set": b.model_dump()})
    await catat_audit(depot, s["user"], f"Ubah jadwal {p['komponen']}", sebelum={"interval_hari": p["interval_hari"], "tanggal_terakhir": p.get("tanggal_terakhir")},
                      sesudah=b.model_dump())
    return {"ok": True}


@router.post("/perawatan/{komponen_id}/ganti")
async def sudah_diganti(komponen_id: str, s: dict = Depends(sesi_bos)):
    depot, hari_ini = s["depot"], tanggal_wib()
    p = await ambil_milik_depot("maintenance", komponen_id, depot["_id"], "Komponen tidak ditemukan.")
    await db().maintenance.update_one({"_id": komponen_id}, {"$set": {"tanggal_terakhir": hari_ini}})
    await catat_audit(depot, s["user"], f"{p['komponen']} diganti", sebelum=p.get("tanggal_terakhir"), sesudah=hari_ini)
    return {"ok": True}


@router.get("/kepatuhan")
async def lihat_kepatuhan(s: dict = Depends(sesi_bos)):
    k = await db().compliance.find_one({"depot_id": s["depot"]["_id"]}) or {}
    hari_ini = tanggal_wib()
    uji_berikut = A.geser_tanggal(k["uji_lab_terakhir"], k["uji_lab_interval_hari"]) if k.get("uji_lab_terakhir") else None
    return {"uji_lab_terakhir": k.get("uji_lab_terakhir"), "uji_lab_interval_hari": k.get("uji_lab_interval_hari", 180),
            "uji_lab_berikutnya": uji_berikut, "uji_lab_sisa_hari": A.selisih_hari(hari_ini, uji_berikut) if uji_berikut else None,
            "slhs_berlaku_sampai": k.get("slhs_berlaku_sampai"),
            "slhs_sisa_hari": A.selisih_hari(hari_ini, k["slhs_berlaku_sampai"]) if k.get("slhs_berlaku_sampai") else None,
            "nib": k.get("nib", ""), "periksa": k.get("periksa", [])}


class Periksa(BaseModel):
    kode: str = Field(max_length=40)
    ok: bool


class UbahKepatuhan(BaseModel):
    uji_lab_terakhir: str | None = Field(None, pattern=POLA_TANGGAL)
    uji_lab_interval_hari: int = Field(ge=1, le=3650)
    slhs_berlaku_sampai: str | None = Field(None, pattern=POLA_TANGGAL)
    nib: str = Field("", max_length=40)
    periksa: list[Periksa] = []


@router.put("/kepatuhan")
async def ubah_kepatuhan(b: UbahKepatuhan, s: dict = Depends(sesi_bos)):
    depot, d = s["depot"], db()
    k = await d.compliance.find_one({"depot_id": depot["_id"]})
    if not k:
        galat(404, "Data kepatuhan tidak ditemukan.")
    status = {p.kode: p.ok for p in b.periksa}
    periksa = [{**p, "ok": status.get(p["kode"], p["ok"])} for p in k.get("periksa", [])]
    baru = {**b.model_dump(exclude={"periksa"}), "periksa": periksa}
    await d.compliance.update_one({"_id": k["_id"]}, {"$set": baru})
    await catat_audit(depot, s["user"], "Ubah data kepatuhan", sebelum={x: k.get(x) for x in baru}, sesudah=baru)
    return {"ok": True}


# ---------------------------------------------------------------- Ringkasan AI (dipasang di Emergent, Tahap 3)
@router.get("/ringkasan-data")
async def data_ringkasan(s: dict = Depends(sesi_bos)):
    """Angka jadi untuk Ringkasan AI. Model hanya boleh menyusun kalimat dari angka di sini (spesifikasi 8)."""
    das = await dasbor(s["depot"])
    radar = [{"kode": k, "rupiah": v} for k, v in das["rincian_bocor"].items()]
    return {"depot": das["depot"]["nama"], "rentang": das["rentang"], "tagihan_kembali_30_hari": das["tagihan_kembali"],
            "perkiraan_bocor_30_hari": das["perkiraan_bocor"], "rincian_bocor_30_hari": radar, "hari_ini": das["hari_ini"],
            "kurir": [{"nama": k["kurir"]["nama"], "risiko_hari_ini": k["hari_ini"]["risiko"], "hari_risiko_tinggi_30": k["hari_risiko_tinggi"],
                       "porsi_toko_30": k["tiga_puluh_hari"]["porsi_toko"], "tagihan_kembali_30": k["tiga_puluh_hari"]["tagihan_kembali"],
                       "perkiraan_bocor_30": k["tiga_puluh_hari"]["perkiraan_bocor"]} for k in das["kurir"]],
            "perawatan_segera": das["pengingat"]}


@router.post("/ringkasan-ai")
async def ringkasan_ai(s: dict = Depends(sesi_bos)):
    return {"tersedia": False, "pesan": "Ringkasan belum tersedia. Fitur ini dipasang saat aplikasi dijalankan di Emergent."}
