"""Infrastruktur bersama: database, waktu WIB, ID, audit, dan indeks."""
from __future__ import annotations

import os
import uuid
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

from fastapi import HTTPException
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo import ASCENDING, IndexModel

WIB = ZoneInfo("Asia/Jakarta")
KOLEKSI_DEPOT = ["depots", "users", "customers", "trips", "sales", "flags", "approvals", "confirmations",
                 "maintenance", "compliance", "audit_log"]

_klien: AsyncIOMotorClient | None = None


def db() -> AsyncIOMotorDatabase:
    global _klien
    if _klien is None:
        _klien = AsyncIOMotorClient(os.environ.get("MONGO_URL", "mongodb://localhost:27017"), tz_aware=True)
    return _klien[os.environ.get("DB_NAME", "aquair")]


def sekarang() -> datetime:
    return datetime.now(timezone.utc)


def tanggal_wib(dt: datetime | None = None) -> str:
    """"Hari" = tanggal kalender WIB dari cap waktu server."""
    return (dt or sekarang()).astimezone(WIB).date().isoformat()


def jam_wib(dt: datetime) -> str:
    return dt.astimezone(WIB).strftime("%H.%M")


def id_baru() -> str:
    return uuid.uuid4().hex


def galat(kode: int, pesan: str):
    raise HTTPException(status_code=kode, detail=pesan)


def bersih(doc: dict | None, buang: tuple[str, ...] = ()) -> dict | None:
    """Ubah dokumen Mongo menjadi JSON untuk frontend: _id → id, buang field rahasia."""
    if doc is None:
        return None
    hasil = {k: v for k, v in doc.items() if k not in buang and k not in ("_id", "kedaluwarsa_at")}
    hasil["id"] = doc["_id"]
    return hasil


def penanda_demo(depot: dict) -> dict:
    """Setiap dokumen depot demo diberi kedaluwarsa_at supaya terhapus otomatis lewat TTL index."""
    return {"kedaluwarsa_at": depot["kedaluwarsa_at"]} if depot.get("is_demo") else {}


async def ambil_milik_depot(koleksi: str, doc_id: str, depot_id: str, pesan: str = "Data tidak ditemukan.") -> dict:
    """Setiap endpoint yang menerima ID wajib memeriksa kepemilikan depot. Bukan milik depot → 404."""
    doc = await db()[koleksi].find_one({"_id": doc_id, "depot_id": depot_id})
    if not doc:
        galat(404, pesan)
    return doc


async def catat_audit(depot: dict, user: dict | None, aksi: str, sebelum=None, sesudah=None, alasan: str = ""):
    await db().audit_log.insert_one({
        "_id": id_baru(), "depot_id": depot["_id"], "user_id": user["_id"] if user else None,
        "nama_pengguna": user["nama"] if user else "Sistem", "aksi": aksi,
        "sebelum": sebelum, "sesudah": sesudah, "alasan": alasan or "", "created_at": sekarang(), **penanda_demo(depot),
    })


async def siapkan_indeks():
    d = db()
    for nama in KOLEKSI_DEPOT:
        await d[nama].create_index("kedaluwarsa_at", expireAfterSeconds=0, name="ttl_demo")
        if nama != "depots":
            await d[nama].create_index("depot_id")
    await d.users.create_indexes([
        IndexModel("email", unique=True, partialFilterExpression={"email": {"$type": "string"}}, name="email_unik"),
        IndexModel("no_hp", unique=True, partialFilterExpression={"no_hp": {"$type": "string"}}, name="hp_unik"),
    ])
    await d.customers.create_index([("depot_id", ASCENDING), ("qr_token", ASCENDING)])
    await d.sales.create_index([("depot_id", ASCENDING), ("tanggal", ASCENDING)])
    await d.sales.create_index([("depot_id", ASCENDING), ("client_id", ASCENDING)], unique=True,
                               partialFilterExpression={"client_id": {"$type": "string"}}, name="client_id_unik")
    await d.flags.create_index([("depot_id", ASCENDING), ("tanggal", ASCENDING)])
    await d.trips.create_index([("depot_id", ASCENDING), ("kurir_id", ASCENDING), ("status", ASCENDING)])
    await d.confirmations.create_index("token_hash")
    await d.demo_requests.create_index("created_at", expireAfterSeconds=3600)
