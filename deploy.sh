#!/usr/bin/env bash
# Run on the deployment host after configuring the private .env file.
# Docker named volumes are preserved; this script never removes them.
set -euo pipefail
cd -- "$(dirname -- "$0")"
if [ ! -f .env ]; then
  echo 'Create .env from .env.example and set private secrets before deployment.' >&2
  exit 1
fi
docker compose build db app
docker compose up -d db
docker compose up -d --no-deps app
docker compose ps
