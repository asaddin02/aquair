#!/usr/bin/env bash
# Menjalankan AQUAIR di laptop untuk dicoba: MongoDB + backend + hasil build frontend di satu alamat.
#   bash scripts/jalankan-lokal.sh          jalankan (build frontend bila belum ada)
#   bash scripts/jalankan-lokal.sh --build  build ulang frontend dulu
#   bash scripts/jalankan-lokal.sh --henti  hentikan backend dan MongoDB lokal
set -euo pipefail

AKAR="$(cd "$(dirname "$0")/.." && pwd)"
PORT_API="${AQUAIR_PORT:-8710}"
PORT_MONGO="${AQUAIR_PORT_MONGO:-27717}"
DATA_MONGO="${AQUAIR_DATA_MONGO:-$HOME/.local/share/aquair-mongodb/data}"
MONGOD="${MONGOD:-$(ls -d "$HOME"/.local/share/aquair-mongodb/mongodb-linux-*/bin/mongod 2>/dev/null | head -1)}"
LOG="$AKAR/.lokal"
mkdir -p "$LOG"

if [[ "${1:-}" == "--henti" ]]; then
  pkill -f "[u]vicorn server:app --host 0.0.0.0 --port $PORT_API" && echo "Backend dihentikan." || echo "Backend tidak berjalan."
  pkill -f "[m]ongod --dbpath $DATA_MONGO" && echo "MongoDB dihentikan." || echo "MongoDB tidak berjalan."
  exit 0
fi

if ! (echo > "/dev/tcp/127.0.0.1/$PORT_MONGO") 2>/dev/null; then
  [[ -x "$MONGOD" ]] || { echo "mongod tidak ditemukan. Isi variabel MONGOD dengan lokasi mongod."; exit 1; }
  mkdir -p "$DATA_MONGO"
  "$MONGOD" --dbpath "$DATA_MONGO" --port "$PORT_MONGO" --bind_ip 127.0.0.1 --fork --logpath "$LOG/mongod.log" --wiredTigerCacheSizeGB 0.5 >/dev/null 2>&1 </dev/null
  echo "MongoDB berjalan di port $PORT_MONGO."
fi

if [[ ! -x "$AKAR/backend/.venv/bin/uvicorn" ]]; then
  echo "Menyiapkan lingkungan Python backend…"
  (cd "$AKAR/backend" && python3 -m venv .venv && .venv/bin/pip install -q -r requirements-dev.txt)
fi

if [[ "${1:-}" == "--build" || ! -f "$AKAR/frontend/build/index.html" ]]; then
  echo "Membangun frontend (1–2 menit)…"
  (cd "$AKAR/frontend" && { [[ -d node_modules ]] || npx -y yarn@1.22.22 install --silent; } && npx react-scripts build >"$LOG/build.log" 2>&1) \
    || { echo "Build frontend gagal. Lihat $LOG/build.log"; exit 1; }
fi

pkill -f "[u]vicorn server:app --host 0.0.0.0 --port $PORT_API" 2>/dev/null || true
cd "$AKAR/backend"
MONGO_URL="mongodb://127.0.0.1:$PORT_MONGO" DB_NAME="${AQUAIR_DB:-aquair_lokal}" AQUAIR_FRONTEND_BUILD="$AKAR/frontend/build" \
  setsid nohup .venv/bin/uvicorn server:app --host 0.0.0.0 --port "$PORT_API" >"$LOG/backend.log" 2>&1 </dev/null &
disown
cd "$AKAR"

for _ in $(seq 1 30); do
  curl -sf "http://127.0.0.1:$PORT_API/api/sehat" >/dev/null && break
  sleep 0.5
done
curl -sf "http://127.0.0.1:$PORT_API/api/sehat" >/dev/null || { echo "Backend gagal jalan. Lihat $LOG/backend.log"; exit 1; }

IP_LAN="$(hostname -I 2>/dev/null | awk '{print $1}')"
echo
echo "AQUAIR siap."
echo "  Di laptop : http://localhost:$PORT_API"
[[ -n "$IP_LAN" ]] && echo "  Di HP     : http://$IP_LAN:$PORT_API   (HP harus di Wi-Fi yang sama)"
echo "  Hentikan  : bash scripts/jalankan-lokal.sh --henti"
