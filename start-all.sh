#!/bin/bash

# 一键启动脚本（同时启动前后端）

set -e

echo "🚀 启动脊卫童行 Python 版本（前后端）..."

# 获取脚本目录
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# 启动后端（后台运行）
echo "📡 启动后端服务..."
cd "$SCRIPT_DIR"
bash start-backend.sh > logs/backend.log 2>&1 &
BACKEND_PID=$!
echo "后端 PID: $BACKEND_PID"

# 等待后端启动
sleep 3

# 启动前端（前台运行）
echo "🎨 启动前端服务..."
bash start-frontend.sh

# 清理：当前端退出时，杀掉后端
trap "kill $BACKEND_PID 2>/dev/null" EXIT
