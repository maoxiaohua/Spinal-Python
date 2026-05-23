#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIST_DIR="$PROJECT_DIR/frontend/dist"

if ! command -v python3 >/dev/null 2>&1; then
    echo "❌ 未找到 python3，请先安装 Python 3.11+"
    exit 1
fi

cd "$BACKEND_DIR"

if [ ! -d "venv" ]; then
    echo "❌ 未找到 backend/venv，请先执行后端依赖安装"
    exit 1
fi

if [ ! -f ".env" ]; then
    echo "❌ 未找到 backend/.env，请先完成环境配置"
    exit 1
fi

mkdir -p "$BACKEND_DIR/logs"

echo "🏗️ 构建前端..."
bash "$PROJECT_DIR/scripts/build-frontend.sh"

exec "$BACKEND_DIR/venv/bin/python" -m uvicorn src.main:app --host 0.0.0.0 --port 8101
