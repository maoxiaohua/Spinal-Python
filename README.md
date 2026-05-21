# 脊卫童行

儿童脊柱健康初筛系统，当前版本采用：

- 后端：Python + FastAPI
- 前端：Vue 3 + Vite
- 姿态识别：浏览器端 TensorFlow.js MoveNet
- AI 解读：后端调用大模型生成结构化分析

项目目标是让家长在手机或电脑上完成一轮背部照片初筛：上传或拍摄照片，识别关键点，计算基础指标，再生成 AI 报告。

## 当前能力

- 上传照片或用手机引导拍摄
- 在浏览器中完成骨骼关键点识别
- 计算肩高差、肩部倾角、骨盆倾角、脊柱曲线估计
- 生成 AI 分析报告
- 提供移动端优化界面，尽量把主操作和主结果留在当前视口

## 目录结构

```text
Spinal-Python/
├── backend/
│   ├── src/
│   │   ├── api/          # FastAPI 路由
│   │   ├── database/     # 数据库连接
│   │   ├── models/       # ORM 模型
│   │   ├── schemas/      # Pydantic 数据结构
│   │   ├── services/     # AI / 测量等业务逻辑
│   │   └── utils/        # 日志等工具
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/   # 页面组件
│   │   ├── services/     # API / 姿态识别
│   │   └── utils/        # 测量 / 下载报告
│   └── package.json
├── start-backend.sh
├── start-frontend.sh
└── start-all.sh
```

## 运行要求

开发环境需要：

- Python 3.11 或更高
- Node.js 18 或更高
- npm

说明：

- Python 用于后端 API 和 AI 调用
- Node.js 只用于前端开发/构建，不再涉及旧版 Node/Next.js 项目结构

## 快速启动

### 一键启动

```bash
cd /opt/Spinal-Python
bash start-all.sh
```

默认地址：

- 前端：`http://localhost:5173`
- 后端：`http://localhost:8101`

### 分别启动

后端：

```bash
cd /opt/Spinal-Python
bash start-backend.sh
```

前端：

```bash
cd /opt/Spinal-Python
bash start-frontend.sh
```

## 环境配置

首次启动后端时，如果 `backend/.env` 不存在，脚本会根据 `backend/.env.example` 自动生成。

重点配置项：

```env
AI_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
AI_API_KEY=your-api-key
AI_MODEL=qwen3.5-omni-plus-2026-03-15
```

默认数据库为本地 SQLite：

- 路径：`backend/spinal.db`

## API 文档

启动后访问：

- Swagger UI：`http://localhost:8101/api/docs`
- ReDoc：`http://localhost:8101/api/redoc`

## 前端说明

前端当前是独立的 Vue 3 + Vite 项目。

主要页面职责：

- `ImageCapture.vue`：照片采集、姿态识别、移动端快捷操作
- `ResultReport.vue`：指标、AI 分析、报告下载、移动端结果切换
- `GuidedCamera.vue`：手机拍摄引导与相机控制

## 常见问题

### 1. 后端启动失败

检查：

- 是否已安装 Python 3
- `backend/venv` 是否正常创建
- 端口 `8101` 是否被占用

### 2. 前端启动失败

检查：

- 是否已安装 Node.js 和 npm
- `frontend/node_modules` 是否完整

可以尝试：

```bash
cd /opt/Spinal-Python/frontend
rm -rf node_modules package-lock.json
npm install
```

### 3. AI 报告生成失败

检查：

- `backend/.env` 中的 `AI_API_KEY` 是否正确
- `AI_BASE_URL` 和 `AI_MODEL` 是否可用

### 4. 识别结果异常

优先检查拍摄条件：

- 背部是否完整入镜
- 站姿是否自然
- 光线是否均匀
- 是否存在明显遮挡

## 生产部署提示

前端构建：

```bash
cd /opt/Spinal-Python/frontend
npm run build
```

后端启动：

```bash
cd /opt/Spinal-Python/backend
source venv/bin/activate
uvicorn src.main:app --host 0.0.0.0 --port 8101
```

### 配置开机自启

项目已经提供 `systemd` 服务模板，后端会直接托管 `frontend/dist`：

```bash
cd /opt/Spinal-Python
bash scripts/setup-production.sh
sudo bash scripts/install-systemd-service.sh
```

常用命令：

```bash
sudo systemctl status spinal-python.service
sudo systemctl restart spinal-python.service
sudo systemctl enable spinal-python.service
```

服务启动后默认监听：

- 页面和 API：`http://服务器IP:8101`
- 健康检查：`http://服务器IP:8101/health`

如果服务器前面有 `nginx`，建议把外部 HTTPS 入口统一反向代理到 `8101`，不要继续把首页代理到 Vite 开发端口 `5173`。仓库已提供参考配置：

```bash
/opt/Spinal-Python/deploy/nginx/spinal.conf
```

## 医疗免责声明

本项目仅用于家庭初筛参考，不替代医生面诊，不替代影像学检查，也不等同于临床 Cobb 角诊断。
