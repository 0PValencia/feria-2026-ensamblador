#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
if [[ ! -d .venv ]]; then
  python3 -m venv .venv
fi
# shellcheck disable=SC1091
source .venv/bin/activate
pip install -r backend/requirements.txt
( cd frontend && npm install && npm run build )
exec uvicorn app.main:app --app-dir backend --host 0.0.0.0 --port 8000
