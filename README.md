# 脊卫童行 Python 版本

## 项目简介

这是一个基于 Python FastAPI + Vue 3 的儿童脊柱健康筛查系统，专为低内存服务器优化。

**内存占用对比：**
- Next.js 版本：1.5-2GB（开发模式）
- Python 版本：400-700MB（开发模式）✅

## 快速开始

### 方式 1：一键启动（推荐）

```bash
cd /opt/Spinal-Python
bash start-all.sh
```

访问：http://localhost:5173 (前端) 或 http://localhost:8101 (后端 API)

### 方式 2：分别启动

**启动后端：**
```bash
cd /opt/Spinal-Python
bash start-backend.sh
```

**启动前端（新终端）：**
```bash
cd /opt/Spinal-Python
bash start-frontend.sh
```

## 配置

### 1. 配置 AI API

编辑 `backend/.env` 文件：

```env
AI_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
AI_API_KEY=your-api-key-here
AI_MODEL=qwen-plus
```

### 2. 数据库

默认使用 SQLite（`backend/spinal.db`），无需额外配置。

## 功能特性

✅ 图像上传与拍摄
✅ AI 骨骼检测（TensorFlow.js MoveNet）
✅ 脊柱测量算法（Cobb 角、肩高差等）
✅ 通义千问 AI 分析
✅ 结果报告展示
✅ 数据持久化存储
✅ 低内存占用（< 700MB）

## 技术栈

**后端：**
- Python 3.11
- FastAPI 0.104
- SQLAlchemy 2.0
- SQLite

**前端：**
- Vue 3.4
- Vite 5.0
- TensorFlow.js 4.22
- Axios 1.6

## API 文档

启动后访问：
- Swagger UI: http://localhost:8100/api/docs
- ReDoc: http://localhost:8100/api/redoc

## 项目结构

```
/opt/Spinal-Python/
├── backend/              # Python 后端
│   ├── src/
│   │   ├── main.py      # FastAPI 入口
│   │   ├── api/         # API 路由
│   │   ├── models/      # 数据模型
│   │   ├── schemas/     # Pydantic 模式
│   │   ├── services/    # 业务逻辑
│   │   └── utils/       # 工具函数
│   ├── requirements.txt
│   └── .env
├── frontend/            # Vue 3 前端
│   ├── src/
│   │   ├── App.vue
│   │   ├── components/  # Vue 组件
│   │   ├── services/    # API 客户端
│   │   └── utils/       # 工具函数
│   └── package.json
├── start-backend.sh     # 后端启动脚本
├── start-frontend.sh    # 前端启动脚本
├── start-all.sh         # 一键启动
└── README.md
```

## 内存监控

查看实时内存占用：

```bash
# 后端内存
curl http://localhost:8100/health

# 系统内存
free -h
```

## 与 Next.js 版本对比

| 特性 | Next.js 版本 | Python 版本 |
|------|-------------|------------|
| 开发模式内存 | 1.5-2GB | 400-700MB ✅ |
| 启动时间 | 30-60s | 5-10s ✅ |
| 数据持久化 | ❌ | ✅ |
| 历史记录 | ❌ | ✅ |
| 核心功能 | ✅ | ✅ |

## 故障排查

### 后端启动失败

```bash
# 查看日志
tail -f /opt/Spinal-Python/backend/logs/app.log

# 检查端口占用
lsof -i :8100
```

### 前端启动失败

```bash
# 重新安装依赖
cd frontend
rm -rf node_modules package-lock.json
npm install
```

### AI 分析失败

检查 `backend/.env` 中的 API Key 是否正确。

## 生产部署

### 构建前端

```bash
cd frontend
npm run build
```

### 启动生产服务

```bash
cd backend
source venv/bin/activate
uvicorn src.main:app --host 0.0.0.0 --port 8100
```

前端构建产物会自动被后端服务。

## 开发团队

- 架构设计：Claude (Anthropic)
- 项目需求：用户

## 许可证

MIT License

---

**⚠️ 重要提示：** 本工具仅供初步筛查参考，不能替代专业医疗诊断。
