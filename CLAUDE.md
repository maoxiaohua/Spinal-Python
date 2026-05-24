# CLAUDE.md

# Claude Code Project Rules
你是我的项目开发助手。我不是专业开发者，所以你必须主动控制风险，不能为了快速完成而跳过验证。
## 核心原则
1. 不要偏离用户原始需求。
2. 不要做无关重构。
3. 不要随意修改目录结构。
4. 不要删除已有功能。
5. 不要引入不必要的新依赖。
6. 不要只改前端忘记后端。
7. 不要只改后端忘记前端。
8. 不要声称问题解决，除非真实验证过。
9. 如果无法验证，必须明确说“无法完全验证”。
10. 所有修改都要以减少 bug 为目标，而不是看起来更复杂。
11. 所有的修改，都必须PC端和移动端保持同步。
## 开发前必须做
每次写代码前先说明：
- 用户要解决的问题
- 涉及范围
- 计划修改的文件
- 不会修改的内容
- 风险点
- 验证方法
## 前后端规则
如果修改前端：
- 必须检查后端接口是否存在
- 必须检查请求 method 是否一致
- 必须检查字段名是否一致
- 必须检查返回数据是否匹配
- 必须检查错误提示和 loading 状态
如果修改后端：
- 必须检查前端是否调用该接口
- 必须检查前端字段是否同步
- 必须检查错误格式是否前端可识别
- 必须检查接口是否可以真实访问
## UI 规则
所有按钮必须检查：
- 文字颜色
- 图标颜色
- 背景颜色
- hover 状态
- disabled 状态
- loading 状态
禁止出现：
- 白字白底
- 黑字黑底
- 图标和背景同色
- hover 后文字消失
- disabled 后完全看不见
- 危险按钮和普通按钮没有区别
## 测试规则
修改完成后必须说明：
- 运行了什么命令
- 命令是否成功
- 是否验证了用户真正的问题
- 哪些部分没有验证
- 最终结论是：已解决 / 部分解决 / 未解决 / 无法完全验证
禁止：
- 只跑 build 就说功能完成
- 只跑 lint 就说 bug 修复
- 没运行测试却说已测试
- 测试失败但说完成
- 修改测试来掩盖问题
## 默认工作流
1. 理解需求
2. 限定范围
3. 找相关文件
4. 最小修改
5. 检查前后端一致性
6. 检查 UI 可见性
7. 运行真实测试
8. 汇报已验证和未验证内容
## 推荐使用的 agents
- project-manager：开发前控制范围
- frontend-backend-reviewer：检查前后端一致性
- ui-quality-reviewer：检查按钮、图标、文字可见性
- test-verifier：确认是否真实解决
- bug-hunter：查隐藏 bug
## 推荐使用的 skills
- /project-guard
- /minimal-change
- /frontend-backend-sync
- /ui-visibility-check
- /real-test-verification

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Spinal-Python is a children's spinal health screening system. It uses browser-side TensorFlow.js (MoveNet) for pose detection, sends landmarks to a Python backend for storage and AI analysis via Alibaba Qwen API, and displays results in a Vue 3 frontend. The design goal is low memory usage (~400-700MB) compared to the prior Next.js version (~1.5-2GB).

## Development Commands

### Start Everything
```bash
bash start-all.sh          # Starts backend (port 8101) + frontend dev server (port 5173)
bash start-backend.sh      # Backend only — creates venv, installs deps, runs uvicorn
bash start-frontend.sh     # Frontend only — npm install + vite dev
```

### Backend (Python)
```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn src.main:app --host 0.0.0.0 --port 8101 --reload
```

### Frontend (Node)
```bash
cd frontend
npm install
npm run dev      # Dev server at http://localhost:5173
npm run build    # Production build to dist/
```

### Production
```bash
cd frontend && npm run build   # Build static assets
# Backend serves frontend/dist at http://server:8101
uvicorn src.main:app --host 0.0.0.0 --port 8101
```

## Environment Setup

Copy `backend/.env.example` to `backend/.env` and set:
- `AI_API_KEY` — Alibaba Qwen API key
- `AI_BASE_URL` — Qwen API base URL
- `PORT` — defaults to 8101

## Architecture

**Data flow:**
1. User uploads/captures image in browser
2. TensorFlow.js MoveNet detects 17 keypoints (mapped to 33 MediaPipe indices) client-side
3. Frontend calculates spinal metrics (shoulder diff, curvature, pelvis tilt) via `frontend/src/utils/`
4. POST to `/api/v1/screening/landmarks` — backend validates, stores in SQLite, calls Qwen API async
5. Frontend displays AI analysis; results cached in localStorage for 12 hours

**Backend layers:** `api/v1/` → `services/` → `models/` + `database/`
- Async-first: SQLAlchemy async ORM + aiosqlite, httpx for Qwen calls
- FastAPI `Depends()` for DB session injection
- In production, backend serves `frontend/dist/` as static files

**Frontend structure:** `App.vue` orchestrates state between `ImageCapture.vue` (capture flow) and `ResultReport.vue` (results display). `services/api.js` handles all HTTP, `services/poseDetection.js` owns TensorFlow.js lifecycle.

## Key Files

| File | Role |
|------|------|
| `backend/src/main.py` | FastAPI app, middleware, static file serving, lifespan |
| `backend/src/config.py` | Pydantic Settings from `.env` |
| `backend/src/api/v1/screening.py` | POST `/landmarks`, GET `/analysis/{sessionId}` |
| `backend/src/services/ai_service.py` | Qwen API calls, retry logic (2 attempts, 90s timeout) |
| `backend/src/services/measurement.py` | Spinal metric calculations and severity classification |
| `backend/src/models/screening.py` | SQLAlchemy `ScreeningSession` model |
| `frontend/src/App.vue` | Root component, state orchestration |
| `frontend/src/services/poseDetection.js` | MoveNet init, keypoint detection, WebGL/CPU fallback |
| `frontend/vite.config.js` | Dev proxy: `/api` → `http://localhost:8101` |

## API Endpoints

- `POST /api/v1/screening/landmarks` — upload pose landmarks + metrics, triggers AI analysis
- `GET /api/v1/screening/analysis/{sessionId}` — retrieve stored analysis
- `GET /health` — health check
- `GET /api/docs` — Swagger UI (dev)

## Database

SQLite at `backend/spinal.db`. Single table `screening_sessions` with columns for all spinal metrics, raw landmarks (JSON), AI analysis text, and status. Managed via SQLAlchemy async migrations on startup.
