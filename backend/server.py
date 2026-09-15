"""AQUAIR — titik masuk FastAPI. Jalankan: uvicorn server:app --host 0.0.0.0 --port 8001"""
import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import APIRouter, FastAPI
from starlette.middleware.cors import CORSMiddleware

load_dotenv(Path(__file__).parent / ".env")

app = FastAPI(title="AQUAIR")
api = APIRouter(prefix="/api")


@api.get("/sehat")
async def sehat():
    return {"status": "ok", "aplikasi": "AQUAIR"}


app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)
