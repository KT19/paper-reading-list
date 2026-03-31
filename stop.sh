#!/bin/bash
# Stop Paper Reading List services
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PID_DIR="$SCRIPT_DIR/.pids"

echo "🛑 Stopping Paper Reading List..."

stop_process() {
  local name="$1"
  local pid_file="$PID_DIR/$name.pid"

  if [ -f "$pid_file" ]; then
    local pid
    pid=$(cat "$pid_file")
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null && echo "  ✓ Stopped $name (PID $pid)"
      # Also kill child processes
      pkill -P "$pid" 2>/dev/null || true
    else
      echo "  ⚠ $name (PID $pid) was not running"
    fi
    rm -f "$pid_file"
  else
    echo "  ⚠ No PID file for $name"
  fi
}

stop_process "backend"
stop_process "frontend"

# Fallback: kill by port
lsof -ti:8787 2>/dev/null | xargs kill 2>/dev/null && echo "  ✓ Cleaned up port 8787" || true
lsof -ti:5187 2>/dev/null | xargs kill 2>/dev/null && echo "  ✓ Cleaned up port 5187" || true

echo ""
echo "✅ All services stopped."
