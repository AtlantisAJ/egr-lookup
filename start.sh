#!/usr/bin/env bash
# Запуск ЕГР Lookup (бэкенд + фронтенд)
set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"

if [ ! -d "$ROOT/frontend/node_modules" ]; then
  echo "→ npm install (frontend)"
  (cd "$ROOT/frontend" && npm install)
fi

if ! python3 -c "import fastapi" 2>/dev/null; then
  echo "→ pip install (backend)"
  pip3 install -r "$ROOT/backend/requirements.txt"
fi

echo ""
echo "ЕГР РБ Lookup"
echo "  Backend:  http://127.0.0.1:8765"
echo "  Frontend: http://127.0.0.1:5173"
echo "  Ctrl+C — остановить оба"
echo ""

trap 'kill 0' EXIT
(cd "$ROOT/backend" && uvicorn app.main:app --port 8765) &
(cd "$ROOT/frontend" && npm run dev) &
wait
