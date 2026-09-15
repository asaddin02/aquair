"""AQUAIR — titik masuk FastAPI. Jalankan: uvicorn server:app --host 0.0.0.0 --port 8001"""
import os
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

from fastapi import APIRouter, FastAPI  # noqa: E402
from starlette.middleware.cors import CORSMiddleware  # noqa: E402

from aquair import api_bos, api_bos_tambahan, api_kurir, api_publik  # noqa: E402
from aquair.inti import siapkan_indeks  # noqa: E402


@asynccontextmanager
async def siklus(_app: FastAPI):
    await siapkan_indeks()
    yield


app = FastAPI(title="AQUAIR", lifespan=siklus)
api = APIRouter(prefix="/api")


@api.get("/sehat")
async def sehat():
    return {"status": "ok", "aplikasi": "AQUAIR"}


for modul in (api_publik, api_kurir, api_bos, api_bos_tambahan):
    api.include_router(modul.router)
app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition", "X-Jumlah-Baris"],
)
