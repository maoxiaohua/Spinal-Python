#!/bin/bash

# 脊卫童行 Python 版本 - 启动脚本

set -e

echo "🚀 启动脊卫童行 Python 版本..."

# 检查 Python 版本
if ! command -v python3 &> /dev/null; then
    echo "❌ 未找到 Python 3，请先安装"
    exit 1
fi

# 进入后端目录
cd "$(dirname "$0")/backend"

# 检查虚拟环境
if [ ! -d "venv" ]; then
    echo "📦 创建 Python 虚拟环境..."
    python3 -m venv venv
fi

# 激活虚拟环境
source venv/bin/activate

# 安装依赖
if [ ! -f "venv/.installed" ]; then
    echo "📦 安装 Python 依赖..."
    pip install --upgrade pip
    pip install -r requirements.txt
    pip install psutil  # 用于内存监控
    touch venv/.installed
fi

# 复制环境变量
if [ ! -f ".env" ]; then
    echo "📝 创建 .env 文件..."
    cp .env.example .env
    echo "⚠️  请编辑 backend/.env 文件，配置 AI API Key"
fi

# 启动后端服务
echo "✅ 启动 FastAPI 后端服务 (端口 8101)..."
python -m uvicorn src.main:app --host 0.0.0.0 --port 8101 --reload
