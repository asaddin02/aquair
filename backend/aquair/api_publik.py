"""Endpoint tanpa login: daftar, masuk, depot demo, dan konfirmasi pemilik toko."""
from __future__ import annotations

import hashlib
import re
from datetime import timedelta
from typing import Literal

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field

from .inti import bersih, catat_audit, db, galat, id_baru, sekarang, tanggal_wib
from .keamanan import (berhasil_masuk, buat_token, catat_gagal, cocok_rahasia, hash_rahasia, normal_hp, periksa_kunci,
                       sesi)
from .layanan import hitung_ulang

router = APIRouter()
BATAS_DEMO_PER_JAM = 10
KOMPONEN_BAWAAN = [("Filter sedimen", 90), ("Filter karbon", 180), ("Filter mangan", 300), ("Lampu UV", 365), ("Membran RO", 540)]
PERIKSA_BAWAAN = [("galon_bermerek", "Tidak memakai galon bermerek"), ("tutup_bermerek", "Tidak memakai tutup bermerek"),
                  ("air_baku", "Sumber air baku berizin")]


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def info_depot(depot: dict) -> dict:
    return {"id": depot["_id"], "nama": depot["nama"], "is_demo": depot.get("is_demo", False), "harga_toko": depot["harga_toko"],
            "harga_rumah": depot["harga_rumah"], "radius_m": depot["radius_m"]}


def info_pengguna(user: dict) -> dict:
    return bersih(user, buang=("hash", "gagal_masuk", "dikunci_sampai"))


# ---------------------------------------------------------------- akun
class Daftar(BaseModel):
    nama_depot: str = Field(min_length=2, max_length=80)
    kota: str = Field("", max_length=80)
    nama: str = Field(min_length=2, max_length=80)
    email: str = Field(min_length=5, max_length=120)
    sandi: str = Field(min_length=8, max_length=128)
    harga_toko: int = Field(3000, ge=0, le=1_000_000)
    harga_rumah: int = Field(4000, ge=0, le=1_000_000)


@router.post("/auth/daftar")
async def daftar(b: Daftar):
    email = b.email.strip().lower()
    if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email):
        galat(400, "Email belum benar. Contoh: nama@email.com")
    if b.harga_rumah <= b.harga_toko:
        galat(400, "Harga rumah harus lebih tinggi dari harga toko.")
    d = db()
    if await d.users.find_one({"email": email}):
        galat(409, "Email ini sudah terdaftar. Silakan masuk.")
    kini, hari_ini = sekarang(), tanggal_wib()
    depot = {"_id": id_baru(), "nama": b.nama_depot.strip(), "kota": b.kota.strip(), "harga_toko": b.harga_toko,
             "harga_rumah": b.harga_rumah, "radius_m": 75, "garis_dasar_toko": 50, "kebijakan_tanpa_bukti": True,
             "is_demo": False, "created_at": kini}
    user = {"_id": id_baru(), "depot_id": depot["_id"], "peran": "bos", "nama": b.nama.strip(), "email": email,
            "hash": hash_rahasia(b.sandi), "aktif": True, "gagal_masuk": 0, "dikunci_sampai": None, "created_at": kini}
    await d.depots.insert_one(depot)
    await d.users.insert_one(user)
    await d.maintenance.insert_many([{"_id": id_baru(), "depot_id": depot["_id"], "komponen": n, "interval_hari": iv,
                                      "tanggal_terakhir": None} for n, iv in KOMPONEN_BAWAAN])
    await d.compliance.insert_one({"_id": id_baru(), "depot_id": depot["_id"], "uji_lab_terakhir": None, "uji_lab_interval_hari": 180,
                                   "slhs_berlaku_sampai": None, "nib": "",
                                   "periksa": [{"kode": k, "teks": t, "ok": False} for k, t in PERIKSA_BAWAAN]})
    await catat_audit(depot, user, "Daftarkan depot", sesudah=f"{depot['nama']} · toko {b.harga_toko} · rumah {b.harga_rumah}")
    return {"token": await buat_token(user), "peran": "bos", "depot": info_depot(depot), "pengguna": info_pengguna(user),
            "tanggal": hari_ini}


class MasukBos(BaseModel):
    email: str = Field(max_length=120)
    sandi: str = Field(max_length=128)


@router.post("/auth/masuk-bos")
async def masuk_bos(b: MasukBos):
    user = await db().users.find_one({"email": b.email.strip().lower(), "peran": "bos"})
    if not user:
        galat(401, "Email atau kata sandi salah.")
    await periksa_kunci(user)
    if not cocok_rahasia(b.sandi, user.get("hash")):
        await catat_gagal(user, "Email atau kata sandi salah.")
    await berhasil_masuk(user)
    depot = await db().depots.find_one({"_id": user["depot_id"]})
    return {"token": await buat_token(user), "peran": "bos", "depot": info_depot(depot), "pengguna": info_pengguna(user)}


class MasukKurir(BaseModel):
    no_hp: str = Field(max_length=20)
    pin: str = Field(max_length=6)


@router.post("/auth/masuk-kurir")
async def masuk_kurir(b: MasukKurir):
    user = await db().users.find_one({"no_hp": normal_hp(b.no_hp), "peran": "kurir"})
    if not user:
        galat(401, "Nomor HP atau PIN salah.")
    await periksa_kunci(user)
    if not user.get("aktif", True):
        galat(403, "Akun kurir ini dinonaktifkan. Hubungi pemilik depot.")
    if not re.fullmatch(r"\d{6}", b.pin) or not cocok_rahasia(b.pin, user.get("hash")):
        await catat_gagal(user, "Nomor HP atau PIN salah.")
    await berhasil_masuk(user)
    depot = await db().depots.find_one({"_id": user["depot_id"]})
    return {"token": await buat_token(user), "peran": "kurir", "depot": info_depot(depot), "pengguna": info_pengguna(user)}


@router.get("/auth/saya")
async def saya(s: dict = Depends(sesi)):
    return {"peran": s["user"]["peran"], "depot": info_depot(s["depot"]), "pengguna": info_pengguna(s["user"])}


# ---------------------------------------------------------------- depot demo
class MulaiDemo(BaseModel):
    depot_id: str | None = Field(None, max_length=64)


def alamat_ip(request: Request) -> str:
    """IP pengunjung untuk batas depot demo. Nilai terakhir X-Forwarded-For ditambahkan proxy, jadi tidak bisa dipalsukan pengunjung."""
    diteruskan = request.headers.get("x-forwarded-for", "")
    return diteruskan.split(",")[-1].strip() if diteruskan else (request.client.host if request.client else "tidak-diketahui")


@router.post("/demo/mulai")
async def mulai_demo(b: MulaiDemo, request: Request):
    """Satu depot demo per browser. Endpoint ini tidak pernah membuat sesi untuk depot sungguhan."""
    from .demo import buat_depot_demo

    d = db()
    if b.depot_id:
        depot = await d.depots.find_one({"_id": b.depot_id, "is_demo": True})
        if depot and depot["kedaluwarsa_at"] > sekarang() + timedelta(minutes=10):
            bos = await d.users.find_one({"depot_id": depot["_id"], "peran": "bos"})
            kurir = await d.users.find_one({"depot_id": depot["_id"], "peran": "kurir", "nama": "Rudi"})
            return {"depot_id": depot["_id"], "nama_depot": depot["nama"], "baru": False,
                    "token_bos": await buat_token(bos), "token_kurir": await buat_token(kurir)}
    ip = alamat_ip(request)
    if await d.demo_requests.count_documents({"ip": ip}) >= BATAS_DEMO_PER_JAM:
        galat(429, "Terlalu banyak depot contoh dari jaringan ini. Coba lagi dalam satu jam.")
    await d.demo_requests.insert_one({"_id": id_baru(), "ip": ip, "created_at": sekarang()})
    hasil = await buat_depot_demo()
    return {"depot_id": hasil["depot"]["_id"], "nama_depot": hasil["depot"]["nama"], "baru": True,
            "token_bos": await buat_token(hasil["bos"]), "token_kurir": await buat_token(hasil["kurir"])}


# ---------------------------------------------------------------- konfirmasi pemilik toko (Tahap 2)
async def ambil_konfirmasi(token: str) -> tuple[dict, dict, dict]:
    k = await db().confirmations.find_one({"token_hash": hash_token(token)})
    if not k:
        galat(404, "Tautan tidak dikenal. Mungkin depot sudah mengirim tautan yang lebih baru.")
    if k["berlaku_sampai"] < tanggal_wib():
        galat(410, "Tautan ini sudah kedaluwarsa.")
    depot = await db().depots.find_one({"_id": k["depot_id"]})
    toko = await db().customers.find_one({"_id": k["customer_id"], "depot_id": k["depot_id"]})
    if not depot or not toko:
        galat(404, "Tautan tidak dikenal.")
    return k, depot, toko


def info_konfirmasi(k: dict, depot: dict, toko: dict) -> dict:
    return {"nama_depot": depot["nama"], "nama_toko": toko["nama"], "is_demo": depot.get("is_demo", False),
            "periode_mulai": k["periode_mulai"], "periode_selesai": k["periode_selesai"], "galon_tercatat": k["galon_tercatat"],
            "jawaban": k.get("jawaban"), "galon_menurut_toko": k.get("galon_menurut_toko"), "berlaku_sampai": k["berlaku_sampai"]}


@router.get("/publik/konfirmasi/{token}")
async def lihat_konfirmasi(token: str):
    return info_konfirmasi(*await ambil_konfirmasi(token))


class Jawaban(BaseModel):
    jawaban: Literal["benar", "berbeda"]
    galon: int | None = Field(None, ge=0, le=10000)


@router.post("/publik/konfirmasi/{token}")
async def jawab_konfirmasi(token: str, b: Jawaban):
    k, depot, toko = await ambil_konfirmasi(token)
    jawaban, galon = b.jawaban, b.galon
    if jawaban == "berbeda" and (galon is None or galon == k["galon_tercatat"]):
        if galon is None:
            galat(400, "Isi jumlah galon yang benar.")
        jawaban = "benar"
    if jawaban == "benar":
        galon = k["galon_tercatat"]
    hari_ini = tanggal_wib()
    hasil = await db().confirmations.update_one(
        {"_id": k["_id"], "jawaban": None},
        {"$set": {"jawaban": jawaban, "galon_menurut_toko": galon, "dijawab_at": sekarang(), "tanggal_jawab": hari_ini}})
    if hasil.modified_count == 0:
        galat(409, "Jawaban untuk periode ini sudah dikirim sebelumnya.")
    await catat_audit(depot, None, f"Konfirmasi dari {toko['nama']}", sebelum=f"tercatat {k['galon_tercatat']} galon",
                      sesudah=f"{jawaban}, {galon} galon")
    await hitung_ulang(depot, hari_ini)
    k.update(jawaban=jawaban, galon_menurut_toko=galon)
    return info_konfirmasi(k, depot, toko)
