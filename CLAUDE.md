# CLAUDE.md

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
