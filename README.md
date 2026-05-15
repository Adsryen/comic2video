# Comic2Video

中文 | [English](#english)

## 中文

### 项目简介

Comic2Video 是一个围绕 **漫画 / PDF / CBZ 转视频** 场景进行二次开发的平台化项目。

项目目标是把漫画上传、解析、OCR、分镜、脚本、配音、渲染串成可持续演进的工作流，并为后续替换自建模型、接入企业内部服务、扩展任务编排提供稳定底座。

### 开发状态

本项目 **仍在持续开发中**。

当前重点包括：

- 完善前后端平台骨架
- 收敛漫画转视频工作流
- 补齐任务运行、步骤状态、产物追踪能力
- 优化模型接入层，降低后续替换成本

### 未来计划

未来计划逐步适配 **Seedance 2.0 视频生成模型**，用于增强漫画转视频流程中的视频生成与镜头表达能力。

在正式接入前，当前阶段会优先完成：

- 工作流输入输出结构稳定化
- OCR / Script / TTS / Render 接口边界收敛
- 运行记录与错误恢复能力建设

### 主要目录

```text
.
├── compose/              # 本地基础设施、模型服务、平台运行编排示例
├── docs/                 # 平台设计、启动说明、环境变量、阶段计划、TODO
├── models/               # OCR / 脚本模型接入说明
├── platform/             # 本项目正式二开代码（前端 / 后端）
├── setup-platform.sh     # Linux / WSL 初始化脚本
├── start-platform.sh     # Linux / WSL 启动脚本
└── start-platform.ps1    # Windows 启动脚本
```

### 技术方向

**后端**
- FastAPI
- Celery / 异步任务执行
- SQLAlchemy / 持久化
- 面向工作流的任务运行与状态记录

**前端**
- React
- Vite
- React Router
- React Query
- 中英文界面切换

**模型能力**
- OCR：可替换为 PaddleOCR 或内部 OCR 服务
- Script / LLM：可替换为 OpenAI-compatible 或企业内部推理服务
- TTS / 渲染：后续按平台工作流逐步接入

### 本地开发

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

默认开发地址：

- 前端：`http://localhost:5173`
- 后端：`http://localhost:8000`
- 后端文档：`http://localhost:8000/docs`

### 文档导航

- 平台启动说明：`docs/platform-startup.md`
- 前端环境变量：`docs/frontend-env.md`
- 平台待办：`docs/platform-todo.md`
- 工作流整体设计：`docs/platform-workflow-plan.md`
- Phase 1 执行计划：`docs/platform-workflow-phase1-plan.md`
- Compose 目录说明：`compose/README.md`
- 模型接入说明：`models/README.md`

---

## English

### Overview

Comic2Video is a forked and productized project focused on the **comic / PDF / CBZ to video** workflow.

The goal is to turn upload, parsing, OCR, storyboard, script, narration, and rendering into a maintainable workflow, while keeping the system ready for self-hosted model integration and future workflow expansion.

### Development Status

This project is **still under active development**.

Current priorities include:

- improving the platform foundation
- consolidating the comic-to-video workflow
- strengthening run, step, and artifact tracking
- stabilizing model integration boundaries

### Roadmap

Comic2Video is expected to support the **Seedance 2.0 video generation model** in a future phase to enhance video generation quality and shot expression.

### Key Directories

- `compose/`: local infra and runtime compose files
- `docs/`: platform docs, plans, startup notes, TODOs
- `models/`: OCR and script provider integration notes
- `platform/`: main forked product code

### Local Development

Start local infra first, then run the setup/start scripts from the repository root.

### Documentation Index

- `docs/platform-startup.md`
- `docs/frontend-env.md`
- `docs/platform-todo.md`
- `docs/platform-workflow-plan.md`
- `docs/platform-workflow-phase1-plan.md`
- `compose/README.md`
- `models/README.md`

