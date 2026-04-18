#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKEND_DIR="$PROJECT_DIR/backend"
VENV_DIR="$BACKEND_DIR/venv"
MARKER_FILE="$VENV_DIR/.production_installed"

if ! command -v python3 >/dev/null 2>&1; then
    echo "❌ 未找到 python3，请先安装 Python 3.11+"
    exit 1
fi

cd "$BACKEND_DIR"

if [ ! -d "$VENV_DIR" ]; then
    echo "📦 创建 Python 虚拟环境..."
    python3 -m venv "$VENV_DIR"
fi

source "$VENV_DIR/bin/activate"

if [ ! -f "$MARKER_FILE" ] && ! "$VENV_DIR/bin/python" -c "import fastapi, uvicorn, psutil" >/dev/null 2>&1; then
    echo "📦 安装后端依赖..."
    pip install --upgrade pip
    pip install -r requirements.txt
    pip install psutil
fi

touch "$MARKER_FILE"

if [ ! -f ".env" ]; then
    echo "📝 创建 backend/.env ..."
    cp .env.example .env
    echo "⚠️ 请编辑 backend/.env 后再启动服务"
fi

bash "$SCRIPT_DIR/build-frontend.sh"

echo "✅ 生产依赖和前端构建已准备完成"
