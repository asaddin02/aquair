"""Login bos (email + kata sandi) dan kurir (nomor HP + PIN), token sesi, dan batas coba masuk."""
from __future__ import annotations

import os
import re
import secrets
from datetime import timedelta

import bcrypt
import jwt
from fastapi import Depends, Request

from .inti import db, galat, id_baru, jam_wib, sekarang

MAKS_GAGAL = 5
LAMA_KUNCI = timedelta(minutes=15)
UMUR_TOKEN = timedelta(days=14)
_rahasia: str | None = None


async def rahasia_jwt() -> str:
    """JWT_SECRET dari lingkungan; kalau tidak ada, dibuat sekali dan disimpan di database (tidak pernah di repo)."""
    global _rahasia
    if _rahasia:
        return _rahasia
    _rahasia = os.environ.get("JWT_SECRET")
    if not _rahasia:
        doc = await db().sistem.find_one({"_id": "jwt"})
        if not doc:
            doc = {"_id": "jwt", "rahasia": secrets.token_urlsafe(48)}
            await db().sistem.update_one({"_id": "jwt"}, {"$setOnInsert": doc}, upsert=True)
            doc = await db().sistem.find_one({"_id": "jwt"})
        _rahasia = doc["rahasia"]
    return _rahasia


def hash_rahasia(teks: str) -> str:
    return bcrypt.hashpw(teks.encode(), bcrypt.gensalt()).decode()


def cocok_rahasia(teks: str, hash_: str | None) -> bool:
    return bool(hash_) and bcrypt.checkpw(teks.encode(), hash_.encode())


def normal_hp(no_hp: str) -> str:
    angka = re.sub(r"\D", "", no_hp or "")
    return "0" + angka[2:] if angka.startswith("62") else angka


async def buat_token(user: dict) -> str:
    muatan = {"sub": user["_id"], "depot_id": user["depot_id"], "peran": user["peran"], "exp": sekarang() + UMUR_TOKEN,
              "jti": id_baru()}
    return jwt.encode(muatan, await rahasia_jwt(), algorithm="HS256")


async def periksa_kunci(user: dict):
    kunci = user.get("dikunci_sampai")
    if kunci and kunci > sekarang():
        galat(423, f"Akun dikunci karena 5 kali salah. Coba lagi pukul {jam_wib(kunci)} WIB.")


async def catat_gagal(user: dict, pesan_salah: str):
    gagal = user.get("gagal_masuk", 0) + 1
    ubah = {"gagal_masuk": gagal}
    if gagal >= MAKS_GAGAL:
        ubah = {"gagal_masuk": 0, "dikunci_sampai": sekarang() + LAMA_KUNCI}
    await db().users.update_one({"_id": user["_id"]}, {"$set": ubah})
    if gagal >= MAKS_GAGAL:
        galat(423, f"Akun dikunci 15 menit karena 5 kali salah. Coba lagi pukul {jam_wib(ubah['dikunci_sampai'])} WIB.")
    galat(401, f"{pesan_salah} Sisa {MAKS_GAGAL - gagal} kali coba sebelum akun dikunci 15 menit.")


async def berhasil_masuk(user: dict):
    await db().users.update_one({"_id": user["_id"]}, {"$set": {"gagal_masuk": 0, "dikunci_sampai": None}})


async def sesi(request: Request) -> dict:
    """Pengguna yang sedang masuk beserta depotnya. Setiap query wajib memakai depot_id dari sini."""
    header = request.headers.get("Authorization", "")
    if not header.startswith("Bearer "):
        galat(401, "Silakan masuk dulu.")
    try:
        muatan = jwt.decode(header[7:], await rahasia_jwt(), algorithms=["HS256"])
    except jwt.PyJWTError:
        galat(401, "Sesi berakhir. Silakan masuk lagi.")
    user = await db().users.find_one({"_id": muatan["sub"], "depot_id": muatan["depot_id"]})
    if not user or not user.get("aktif", True):
        galat(401, "Akun tidak aktif. Hubungi pemilik depot.")
    depot = await db().depots.find_one({"_id": user["depot_id"]})
    if not depot:
        galat(401, "Depot tidak ditemukan. Depot demo terhapus otomatis setelah 24 jam; tekan Coba lagi di halaman depan.")
    return {"user": user, "depot": depot}


async def sesi_bos(s: dict = Depends(sesi)) -> dict:
    if s["user"]["peran"] != "bos":
        galat(403, "Halaman ini khusus pemilik depot.")
    return s


async def sesi_kurir(s: dict = Depends(sesi)) -> dict:
    if s["user"]["peran"] != "kurir":
        galat(403, "Halaman ini khusus kurir.")
    return s
