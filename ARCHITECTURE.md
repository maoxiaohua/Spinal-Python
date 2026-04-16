# 脊卫童行 Python 版本 - 技术架构设计

## 项目概述

**项目名称**: 脊卫童行 (Spinal-Python)
**目标**: 创建一个低内存占用的儿童脊柱健康筛查系统
**技术栈**: Python FastAPI + Vue 3 (轻量级)
**预期内存占用**: 400-700MB (vs Next.js 1.5-2GB)

---

## 架构设计

```
┌─────────────────────────────────────────────────────────┐
│                    Nginx (可选)                          │
│              (反向代理 + 静态资源服务)                     │
└────────────┬──────────────────────────┬─────────────────┘
             │                          │
    ┌────────▼────────┐        ┌───────▼────────┐
    │  Vue 3 前端     │        │ FastAPI 后端   │
    │   (静态文件)    │        │   (Port 8100)  │
    │  - 图像采集     │        │   Python 3.11  │
    │  - 骨骼可视化   │        │   内存: 200-400MB│
    │  - 结果展示     │        └────────┬───────┘
    │  内存: 50-100MB │                 │
    └─────────────────┘        ┌────────┼────────┐
                               │        │        │
                         ┌─────▼──┐  ┌──▼───┐  ┌▼────┐
                         │SQLite  │  │Redis │  │通义 │
                         │(开发)  │  │(可选)│  │千问 │
                         └────────┘  └──────┘  └─────┘
```

---

## 目录结构

```
/opt/Spinal-Python/
├── backend/                      # Python 后端
│   ├── src/
│   │   ├── main.py              # FastAPI 应用入口
│   │   ├── config.py            # 配置管理
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   ├── deps.py          # 依赖注入
│   │   │   └── v1/
│   │   │       ├── __init__.py
│   │   │       ├── screening.py # 筛查相关 API
│   │   │       └── router.py    # 路由汇总
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── base.py          # 基础模型
│   │   │   └── screening.py     # 筛查数据模型
│   │   ├── schemas/
│   │   │   ├── __init__.py
│   │   │   └── screening.py     # Pydantic 模式
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── ai_service.py    # AI 分析服务
│   │   │   ├── pose_detection.py # 姿态检测（可选）
│   │   │   └── measurement.py   # 测量算法
│   │   ├── database/
│   │   │   ├── __init__.py
│   │   │   └── session.py       # 数据库会话
│   │   └── utils/
│   │       ├── __init__.py
│   │       └── logger.py        # 日志工具
│   ├── requirements.txt         # Python 依赖
│   ├── .env.example             # 环境变量示例
│   └── Dockerfile               # Docker 配置
├── frontend/                     # Vue 3 前端
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── main.js              # 入口文件
│   │   ├── App.vue              # 根组件
│   │   ├── components/
│   │   │   ├── ImageCapture.vue # 图像采集
│   │   │   ├── PoseVisualizer.vue # 骨骼可视化
│   │   │   └── ResultReport.vue # 结果报告
│   │   ├── services/
│   │   │   ├── api.js           # API 客户端
│   │   │   └── poseDetection.js # TensorFlow.js 集成
│   │   ├── utils/
│   │   │   └── measurement.js   # 测量算法（前端）
│   │   └── router/
│   │       └── index.js         # 路由配置
│   ├── package.json             # 前端依赖
│   └── vite.config.js           # Vite 配置
├── docker-compose.yml           # Docker Compose 配置
├── start.sh                     # 启动脚本
├── README.md                    # 项目说明
└── ARCHITECTURE.md              # 本文件
```

---

## 核心功能模块

### 1. 图像采集模块
**前端实现** (Vue 3 + TensorFlow.js)

- 图像上传（相册选择）
- 摄像头直拍
- 实时骨骼检测
- 姿势质量评分

### 2. 骨骼检测模块
**前端实现** (TensorFlow.js MoveNet)

- 33 个关键点检测
- MediaPipe 格式输出
- 可视化绘制

### 3. 测量算法模块
**前端 + 后端双重实现**

**前端 (JavaScript)**:
- 实时计算（用户反馈）
- 肩高差、倾斜角等

**后端 (Python)**:
- 验证前端计算
- 存储到数据库

### 4. AI 分析模块
**后端实现** (Python)

- 接收骨骼坐标
- 调用通义千问 API
- 生成分析报告

### 5. 数据存储模块
**后端实现** (SQLAlchemy)

- 筛查记录
- 骨骼坐标
- AI 分析结果
- 用户信息（可选）

---

## API 设计

### 1. 上传骨骼坐标
```
POST /api/v1/screening/landmarks
Content-Type: application/json

Request:
{
  "landmarks": [
    {"x": 0.5, "y": 0.3, "z": 0.1, "visibility": 0.9},
    ...
  ],
  "metrics": {
    "shoulderHeightDiffPx": 15.5,
    "shoulderSlopeDeg": 3.2,
    "pelvisTiltDeg": 2.1,
    "spinalCurvatureDeg": 8.5,
    "postureConfidence": 0.85,
    "severity": "attention"
  },
  "sessionId": "uuid-string"
}

Response:
{
  "success": true,
  "sessionId": "uuid-string",
  "message": "数据已保存",
  "aiAnalysis": {
    "status": "completed",
    "analysis": "AI 分析文本...",
    "model": "qwen3.6-plus",
    "timestamp": "2026-04-13T10:00:00Z"
  }
}
```

### 2. 查询分析结果
```
GET /api/v1/screening/analysis/{sessionId}

Response:
{
  "status": "completed",
  "sessionId": "uuid-string",
  "metrics": {...},
  "aiAnalysis": {...},
  "createdAt": "2026-04-13T10:00:00Z"
}
```

### 3. 健康检查
```
GET /health

Response:
{
  "status": "healthy",
  "version": "1.0.0",
  "memory_mb": 250
}
```

---

## 数据库设计

### 表: screening_sessions
```sql
CREATE TABLE screening_sessions (
    id VARCHAR(36) PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- 测量指标
    shoulder_height_diff FLOAT,
    shoulder_slope_deg FLOAT,
    pelvis_tilt_deg FLOAT,
    spinal_curvature_deg FLOAT,
    posture_confidence FLOAT,
    severity VARCHAR(20),

    -- 骨骼坐标 (JSON)
    landmarks JSON,

    -- AI 分析
    ai_analysis TEXT,
    ai_model VARCHAR(50),
    ai_timestamp TIMESTAMP,

    -- 状态
    status VARCHAR(20) DEFAULT 'processing'
);

CREATE INDEX idx_created_at ON screening_sessions(created_at);
CREATE INDEX idx_status ON screening_sessions(status);
```

---

## 技术选型

### 后端
| 组件 | 技术 | 版本 | 说明 |
|------|------|------|------|
| Web 框架 | FastAPI | 0.104+ | 高性能异步框架 |
| ASGI 服务器 | Uvicorn | 0.24+ | 生产级服务器 |
| ORM | SQLAlchemy | 2.0+ | 数据库 ORM |
| 数据库 | SQLite | 3.x | 开发环境 |
| 验证 | Pydantic | 2.5+ | 数据验证 |
| HTTP 客户端 | httpx | 0.25+ | 异步 HTTP |
| 日志 | loguru | 0.7+ | 日志管理 |

### 前端
| 组件 | 技术 | 版本 | 说明 |
|------|------|------|------|
| 框架 | Vue 3 | 3.4+ | 渐进式框架 |
| 构建工具 | Vite | 5.0+ | 快速构建 |
| AI 模型 | TensorFlow.js | 4.22+ | 浏览器端 ML |
| 姿态检测 | MoveNet | 2.1+ | 姿态检测模型 |
| HTTP 客户端 | Axios | 1.6+ | HTTP 请求 |

---

## 内存优化策略

### 1. 后端优化
- 使用 SQLite 而非 PostgreSQL（开发环境）
- 按需加载模型（如果后端做姿态检测）
- 限制并发请求数
- 使用流式响应处理大数据

### 2. 前端优化
- 使用 Vite 构建（比 webpack 快）
- 按需加载 TensorFlow.js 模型
- 图像压缩后再处理
- 懒加载组件

### 3. 部署优化
- 使用 Uvicorn 单进程模式
- 限制 Python 堆内存
- 使用 Nginx 缓存静态资源

---

## 部署方案

### 方案 1: 直接运行（推荐开发）
```bash
# 后端
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn src.main:app --host 0.0.0.0 --port 8100 --reload

# 前端
cd frontend
npm install
npm run dev
```

### 方案 2: 生产构建
```bash
# 前端构建
cd frontend
npm run build

# 后端服务静态文件
cd backend
uvicorn src.main:app --host 0.0.0.0 --port 8100
```

### 方案 3: Docker Compose
```bash
docker-compose up -d
```

---

## 功能对照表

| 功能 | Next.js 版本 | Python 版本 | 说明 |
|------|-------------|------------|------|
| 图像上传 | ✅ | ✅ | 完全一致 |
| 摄像头直拍 | ✅ | ✅ | 完全一致 |
| 骨骼检测 | ✅ (前端) | ✅ (前端) | TensorFlow.js |
| 测量算法 | ✅ | ✅ | 算法移植 |
| AI 分析 | ✅ | ✅ | 通义千问 |
| 结果展示 | ✅ | ✅ | 完全一致 |
| 数据存储 | ❌ (内存) | ✅ (SQLite) | Python 版增强 |
| 用户认证 | ❌ | 🔄 (可选) | 可扩展 |
| 历史记录 | ❌ | 🔄 (可选) | 可扩展 |

---

## 性能指标

### 内存占用对比
| 环境 | Next.js | Python 版本 | 节省 |
|------|---------|------------|------|
| 开发模式 | 1.5-2GB | 400-700MB | 60% |
| 生产模式 | 300-500MB | 200-400MB | 30% |

### 启动时间对比
| 环境 | Next.js | Python 版本 |
|------|---------|------------|
| 开发模式 | 30-60s | 5-10s |
| 生产模式 | 5-10s | 2-5s |

---

## 开发计划

### Phase 1: 基础架构 ✅
- [x] 项目结构设计
- [x] 技术选型
- [x] API 设计
- [x] 数据库设计

### Phase 2: 后端开发 (进行中)
- [ ] FastAPI 应用搭建
- [ ] 数据库模型
- [ ] API 接口实现
- [ ] AI 服务集成
- [ ] 测量算法移植

### Phase 3: 前端开发
- [ ] Vue 3 项目搭建
- [ ] 图像采集组件
- [ ] 骨骼可视化组件
- [ ] 结果展示组件
- [ ] API 集成

### Phase 4: 测试与优化
- [ ] 功能测试
- [ ] 性能测试
- [ ] 内存占用测试
- [ ] 与 Next.js 版本对比

### Phase 5: 部署与文档
- [ ] 部署脚本
- [ ] 使用文档
- [ ] 对比报告
- [ ] 迁移指南

---

**设计完成时间**: 2026-04-13
**预计开发时间**: 2-3 小时
**目标内存占用**: < 700MB
