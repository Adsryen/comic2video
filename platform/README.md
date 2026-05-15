# Comic2Video Platform

## 说明

`platform/` 是本仓库正式二开的主代码目录。

这里承载的是 Comic2Video 的平台化实现。后续所有前后端功能开发、接口演进、工作流重构，均以这里的代码与结构为准。

## 当前目标

`platform/` 目录当前主要服务于以下目标：

- 建立稳定的前后端开发骨架
- 支撑漫画转视频平台的项目、任务、运行记录与产物管理
- 为 OCR、脚本生成、TTS、视频渲染等模型能力预留接入层
- 让工作流从单次执行逐步演进为可恢复、可重试、可追踪的运行系统

## 目录结构

```text
platform/
├── backend/      # FastAPI / Celery / 数据模型 / 工作流执行
└── frontend/     # React / Vite / 平台前端界面
```

## 开发原则

- 文档、命名、接口优先使用 `Comic2Video` 项目语义
- 所有新增功能以平台工作流和可维护性为中心
- 先保证任务流闭环，再逐步替换具体模型能力

## 与仓库根目录的关系

- 仓库根目录 `README.md` 负责介绍整个项目
- `platform/README.md` 说明本目录在整体架构中的职责
- 启动方式、环境变量、工作流计划请分别查看 `docs/` 下文档

## 相关文档

- `../docs/platform-startup.md`
- `../docs/frontend-env.md`
- `../docs/platform-workflow-plan.md`
- `../docs/platform-workflow-phase1-plan.md`
- `../models/README.md`

