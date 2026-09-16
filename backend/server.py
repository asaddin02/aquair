"""AQUAIR — titik masuk FastAPI. Jalankan: uvicorn server:app --host 0.0.0.0 --port 8001"""
import os
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

from fastapi import APIRouter, FastAPI  # noqa: E402
from starlette.middleware.cors import CORSMiddleware  # noqa: E402

from aquair import api_bos, api_bos_tambahan, api_keuangan, api_kurir, api_produk, api_publik  # noqa: E402
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


for modul in (api_publik, api_kurir, api_bos, api_bos_tambahan, api_produk, api_keuangan):
    api.include_router(modul.router)
app.include_router(api)

# Hanya untuk mencoba di laptop: backend ikut menyajikan hasil build frontend di satu alamat.
# Di Emergent variabel ini tidak diisi, jadi bagian ini tidak aktif.
_build = os.environ.get("AQUAIR_FRONTEND_BUILD")
if _build and Path(_build).is_dir():
    from fastapi.responses import FileResponse  # noqa: E402

    _akar = Path(_build).resolve()

    @app.get("/{jalur:path}", include_in_schema=False)
    async def sajikan_frontend(jalur: str):
        berkas = (_akar / jalur).resolve()
        if jalur and berkas.is_file() and berkas.is_relative_to(_akar):
            return FileResponse(berkas, headers={"Cache-Control": "no-cache"} if berkas.name in ("sw.js", "index.html") else None)
        return FileResponse(_akar / "index.html", headers={"Cache-Control": "no-cache"})
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition", "X-Jumlah-Baris"],
)
