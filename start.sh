#!/bin/bash
# Launch Paper Reading List (backend + frontend in background)
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PID_DIR="$SCRIPT_DIR/.pids"
mkdir -p "$PID_DIR"

echo "🚀 Starting Paper Reading List..."

# ---- Backend (FastAPI on port 8787) ----
echo "  → Starting backend on http://localhost:8787 ..."
cd "$SCRIPT_DIR/server"
uv run uvicorn app.main:app --host 0.0.0.0 --port 8787 &
echo $! > "$PID_DIR/backend.pid"

# ---- Frontend (Vite on port 5187) ----
echo "  → Starting frontend on http://localhost:5187 ..."
cd "$SCRIPT_DIR/client"
npm run dev &
echo $! > "$PID_DIR/frontend.pid"

echo ""
echo "✅ Paper Reading List is running!"
echo "   Frontend: http://localhost:5187"
echo "   Backend:  http://localhost:8787"
echo ""
echo "   Run ./stop.sh to stop all services."
