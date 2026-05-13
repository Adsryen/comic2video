# Compose Directory Guide

这个目录集中放置仓库内所有 Docker Compose 编排文件，并按“用途”分层组织。

## 目录约定

- `local-infra/`
  - 本地开发依赖
  - 一般是消息队列、缓存、数据库这类基础容器
- `model-services/`
  - 模型服务
  - 按能力继续拆分，例如 `ocr/`、`script/`、`tts/`
- `platform-runtime/`
  - 平台运行栈
  - 用于启动后端、Worker、整个平台服务
- `reference/`
  - 参考样例
  - 保留上游或历史编排，仅供参考，不建议作为主入口

## 当前文件说明

### `local-infra/`

- `compose/local-infra/rabbitmq-redis.compose.yml`
  - 本地启动 `RabbitMQ` 和 `Redis`
  - 供 Celery、后台任务和缓存使用

### `model-services/ocr/`

- `compose/model-services/ocr/paddleocr.compose.yml`
  - 通用 OCR provider 模板
  - 需要通过 `models/.env` 注入镜像、端口、挂载路径

- `compose/model-services/ocr/paddleocr-vl-vllm-server.compose.yml`
  - 面向 `PaddleOCR-VL` 的具体服务样例
  - 更适合你现有 K100 / DCU 风格环境参考

### `model-services/script/`

- `compose/model-services/script/openai-compatible-server.compose.yml`
  - 通用 OpenAI-compatible Script/LLM 服务模板
  - 适合接 `vLLM`、本地大模型推理服务

### `platform-runtime/`

- `compose/platform-runtime/backend.compose.yml`
  - 平台后端相关编排

- `compose/platform-runtime/platform-stack.compose.yml`
  - 平台整套运行栈编排

## 命名规范

推荐统一使用：

- `{service-or-purpose}.compose.yml`
- 如果需要更具体：`{service}-{variant}.compose.yml`

例如：

- `rabbitmq-redis.compose.yml`
- `paddleocr.compose.yml`
- `paddleocr-vl-vllm-server.compose.yml`
- `openai-compatible-server.compose.yml`

这样看到文件名就能大致知道：

1. 起什么容器 / 服务
2. 属于哪类用途
3. 是通用模板还是具体变体
