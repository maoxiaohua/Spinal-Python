#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
FRONTEND_DIR="$PROJECT_DIR/frontend"

if ! command -v npm >/dev/null 2>&1; then
    echo "❌ 未找到 npm，请先安装 Node.js 18+"
    exit 1
fi

cd "$FRONTEND_DIR"

if [ ! -d "node_modules" ]; then
    echo "📦 安装前端依赖..."
    npm ci
fi

echo "🏗️ 构建前端静态资源..."
npm run build
