#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HOST="${HOST:-0.0.0.0}"
PORT="${PORT:-1313}"
CACHE_DIR="${HUGO_CACHEDIR:-$ROOT/.hugo_cache}"

if [[ -x "$ROOT/bin/hugo" ]]; then
  HUGO_BIN="$ROOT/bin/hugo"
else
  HUGO_BIN="hugo"
fi

if ! command -v "$HUGO_BIN" >/dev/null 2>&1; then
  echo "hugo not found. Install Hugo or set HUGO_BIN=/path/to/hugo." >&2
  exit 1
fi

echo "Serving on http://${HOST}:${PORT}"
exec "$HUGO_BIN" server -D --bind "$HOST" --port "$PORT" --cacheDir "$CACHE_DIR"
