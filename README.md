# Comic2Video Platform

中文 | [English](#english)

## 中文

### 项目简介

Comic2Video Platform 是一个面向 **PDF / CBZ 漫画转视频** 场景的全流程平台。

当前仓库以 `platform/` 为正式二开目录，目标是把漫画上传、解析、分镜、配音、渲染、结果管理这些环节串成一个可以持续迭代的平台，而不是只做单点脚本。

它适合：

- 企业内网或私有化部署
- 使用自建模型 / 自有 GPU 服务器替换第三方模型
- 围绕漫画转视频场景继续扩展工作流、管理台和任务编排

### 当前能力

- 支持上传 `PDF`、`CBZ` 漫画源文件
- 支持项目化管理：项目、任务、素材、结果统一归档
- 支持漫画解析、分镜构建、旁白生成、视频合成的基础流水线
- 支持中英文前端界面，默认中文，并可根据浏览器语言自动切换
- 支持本地开发启动脚本与基础容器化配置
- 支持把前端单独部署到 Vercel 作为演示站

### 仓库结构

```text
.
├── docs/                  # 设计文档、计划、启动说明、TODO
├── platform/              # 正式二开目录
│   ├── backend/           # FastAPI + Celery 后端
│   └── frontend/          # React + Vite 前端
├── reference/             # 参考项目目录，不作为正式二开代码提交主体
├── setup-platform.sh      # Linux 环境初始化脚本
├── start-platform.sh      # Linux 一键启动脚本
└── start-platform.ps1     # Windows 一键启动脚本
```

### 技术栈

**后端**
- FastAPI
- Celery
- SQLAlchemy
- PDF / 图像解析工具链
- TTS / OCR / LLM 可替换适配层

**前端**
- React
- Vite
- React Router
- React Query
- 中英文切换上下文

### 本地启动

#### Linux / WSL

```bash
docker compose -f compose/local-infra/rabbitmq-redis.compose.yml up -d
bash setup-platform.sh
bash start-platform.sh
```

#### Windows PowerShell

```powershell
docker compose -f compose/local-infra/rabbitmq-redis.compose.yml up -d
.\start-platform.ps1
```

默认地址：

- 前端：`http://localhost:5173`
- 后端：`http://localhost:8000`

### 前端 Vercel 演示部署

如果你只是想先上线一个 **演示前端**，不依赖真实后端，也可以直接部署 `platform/frontend` 到 Vercel。

#### 推荐方式

在 Vercel 项目里这样配置：

- **Framework Preset**: `Vite`
- **Root Directory**: `platform/frontend`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`

#### 演示模式环境变量

在 Vercel 配置：

```env
VITE_DEMO_MODE=true
```

这样前端会：

- 使用内置 mock 数据展示项目、任务、分镜和结果
- 不依赖后端 API 即可打开演示站
- 保留中英文切换、平台页面结构和素材展示能力

#### 如果要接真实后端

把下面环境变量配置到 Vercel：

```env
VITE_API_BASE_URL=https://your-backend-domain.com
VITE_DEMO_MODE=false
```

说明：

- `VITE_API_BASE_URL`：前端访问平台后端 API 的地址
- 前端登录改为本地认证 API；如需 Google 登录，请配置后端 Google OAuth 环境变量

### 模型替换思路

这个平台当前更适合作为“流程骨架”。如果你们公司有可免费使用的 GPU 服务器，可以逐层替换能力：

- OCR：替换当前 OCR 检测 / 识别模块
- 剧本 / 分镜：替换为自建 LLM / VLM 服务
- 配音：替换为企业内部 TTS 服务
- 视频：替换为更强的镜头生成 / 合成模型

推荐替换顺序：

1. OCR
2. 文本分析 / 分镜生成
3. TTS
4. 视频渲染 / 合成

这样更容易定位质量问题和性能瓶颈。

### 当前定位

这个仓库现阶段更偏向：

- 把产品骨架先搭起来
- 保证平台可以上传、创建任务、展示资产、查看结果
- 让后续“替换模型”和“扩展任务编排”有落点

它还不是最终商业版，但已经适合作为一个持续演进的工程底座。

---

## English

### Overview

Comic2Video Platform is a full-stack workflow platform for turning **PDF / CBZ comics into narrated videos**.

The `platform/` directory is the main productized fork in this repository. The goal is to provide a maintainable foundation for upload, parsing, storyboard generation, audio generation, rendering, and asset management instead of a one-off script.

It is suitable for:

- private or enterprise deployment
- replacing third-party models with self-hosted models on internal GPU servers
- extending the comic-to-video workflow into a real platform with job orchestration and management UI

### Current Capabilities

- Upload comic source files in `PDF` and `CBZ`
- Organize everything around projects, jobs, assets, and outputs
- Run a baseline pipeline for parsing, storyboard generation, narration, and rendering
- Serve a bilingual frontend with Chinese and English support
- Start locally with bootstrap scripts and basic container scaffolding
- Deploy the frontend separately to Vercel as a demo site

### Repository Structure

```text
.
├── docs/                  # design docs, plans, startup notes, TODOs
├── platform/              # primary forked product workspace
│   ├── backend/           # FastAPI + Celery backend
│   └── frontend/          # React + Vite frontend
├── reference/             # reference-only upstream materials
├── setup-platform.sh      # Linux environment bootstrap
├── start-platform.sh      # Linux one-command startup script
└── start-platform.ps1     # Windows one-command startup script
```

### Tech Stack

**Backend**
- FastAPI
- Celery
- SQLAlchemy
- PDF / image parsing utilities
- replaceable adapters for OCR, TTS, and LLM / VLM services

**Frontend**
- React
- Vite
- React Router
- React Query
- bilingual locale context

### Local Startup

#### Linux / WSL

```bash
bash setup-platform.sh
bash start-platform.sh
```

#### Windows PowerShell

```powershell
.\start-platform.ps1
```

Default URLs:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:8000`

### Deploying a Vercel Demo Frontend

If you want a **frontend-only demo** first, you can deploy `platform/frontend` directly to Vercel without a live backend.

#### Recommended Vercel Settings

- **Framework Preset**: `Vite`
- **Root Directory**: `platform/frontend`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`

#### Demo Mode Environment Variable

Set this in Vercel:

```env
VITE_DEMO_MODE=true
```

In demo mode, the frontend will:

- use built-in mock projects, jobs, storyboard data, and result assets
- render a deployable product demo without backend APIs
- keep the bilingual platform experience intact

#### Connecting a Real Backend

If you want the deployed frontend to call your real platform backend, configure:

```env
VITE_API_BASE_URL=https://your-backend-domain.com
VITE_DEMO_MODE=false
```

Notes:

- `VITE_API_BASE_URL` points the frontend to your backend API
- Frontend auth now uses the local backend auth APIs; configure backend Google OAuth values if you want Google sign-in.

### Model Replacement Strategy

This repository is currently best treated as a **workflow shell**. If your company already has GPU servers, you can replace model-backed capabilities layer by layer:

- OCR
- script / storyboard generation
- TTS
- video rendering / composition

Recommended replacement order:

1. OCR
2. script / storyboard generation
3. TTS
4. video rendering / composition

This makes it easier to isolate quality regressions and performance bottlenecks.

### Current Positioning

At this stage, the repository focuses on:

- getting the product skeleton working end to end
- enabling uploads, jobs, asset inspection, and result viewing
- creating a stable base for future model replacement and orchestration work

It is not the final polished commercial product yet, but it is already a practical engineering foundation for continued iteration.
