#!/bin/bash

# 前端启动脚本

set -e

echo "🚀 启动前端开发服务器..."

cd "$(dirname "$0")/frontend"

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 未找到 Node.js，请先安装"
    exit 1
fi

# 安装依赖
if [ ! -d "node_modules" ]; then
    echo "📦 安装前端依赖..."
    npm install
fi

# 启动开发服务器
echo "✅ 启动 Vite 开发服务器 (端口 5173)..."
npm run dev
