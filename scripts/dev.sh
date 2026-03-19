#!/bin/bash
# Script de desarrollo: levanta backend y frontend en paralelo

export PATH="$HOME/.nvm/versions/node/v20.19.5/bin:$PATH"

echo "🚀 Iniciando MaoEducación en modo desarrollo..."
echo ""
echo "  API:      http://localhost:3000"
echo "  Frontend: http://localhost:5173"
echo "  DB:       localhost:5433"
echo ""

# Asegurar que docker esté levantado
docker compose up -d 2>/dev/null

# Levantar API y Web en paralelo
cd "$(dirname "$0")/.."
pnpm dev
