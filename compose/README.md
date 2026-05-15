# Compose Directory Guide

## 目录定位

`compose/` 用于存放 Comic2Video 的容器编排文件，目标是把“本地基础设施”“模型服务”“平台运行时”分层管理。

## 目录约定

```text
compose/
├── local-infra/         # 本地开发依赖，如 Redis、RabbitMQ、MinIO 等
├── model-services/      # 可独立启动的模型服务编排示例
│   ├── ocr/
│   └── script/
└── platform-runtime/    # 平台前后端及其依赖的组合运行方式
```

## 当前文件说明

### `local-infra/`

用于本地开发的公共基础设施，例如：

- `redis`
- `rabbitmq`
- 对象存储
- 数据库

建议保持“轻量、可替换、便于单机启动”的原则。

### `model-services/ocr/`

用于 OCR 服务的独立编排示例，服务于 Comic2Video 的 OCR 接入测试与联调。

### `model-services/script/`

用于脚本生成 / LLM 服务的独立编排示例，优先围绕 OpenAI-compatible、自建网关或企业内网模型服务来组织。

### `platform-runtime/`

用于平台整体运行时组合，例如：

- 后端 API
- Worker
- 前端
- 任务依赖服务

当本项目进入更完整的联调阶段，可把一键联调方案集中维护在这里。

## 命名规范

- 文件名优先体现“用途 + 场景”，例如：`rabbitmq-redis.compose.yml`
- 文档中的服务说明，应以 Comic2Video 的开发和部署场景为准

