# Models

这个目录用于集中管理 Comic2Video 二开过程中使用的模型服务编排、启动文档和部署约定。

当前目录按“能力类型”组织，而不是按某一个具体模型写死：

- `ocr/`：OCR / 文本识别服务
- `script/`：脚本生成 / scene narration / 文本理解服务
- `tts/`：语音合成服务
- `video/`：视频生成或渲染增强服务

## 目录结构

```text
models/
├── README.md
├── .env.example
├── ocr/
│   └── paddleocr.md
├── script/
│   └── openai-compatible-server.md

compose/
└── models/
    ├── ocr/
    │   └── paddleocr.compose.yml
    └── script/
        └── openai-compatible-server.compose.yml
```

## 设计原则

- 这里放的是“模型服务层”，不是业务平台代码。
- 目录按能力分组，不按单个模型产品名固化。
- 每类能力下可以放多个 provider 示例：不同镜像、不同模型、不同部署方式。
- 优先保留可替换性，不把具体模型写死到平台主代码里。

## 推荐使用方式

### 1. 复制环境变量模板

```bash
cp models/.env.example models/.env
```

再根据你的服务器环境调整镜像、端口、模型目录。

### 2. 选择能力下的一个 provider 启动

启动 OCR 示例：

```bash
docker compose --env-file models/.env -f compose/model-services/ocr/paddleocr.compose.yml up -d
```

启动 Script 示例：

```bash
docker compose --env-file models/.env -f compose/model-services/script/openai-compatible-server.compose.yml up -d
```

### 3. 接入平台

后续平台后端建议通过环境变量接“能力类型默认 provider”：

```env
OCR_PROVIDER=paddleocr
OCR_API_BASE=http://your-host:8118
SCRIPT_PROVIDER=openai_compatible
SCRIPT_API_BASE=http://your-host:8001/v1
SCRIPT_MODEL_NAME=your-model-name
```

## 当前定位

这个目录当前提供的是：

- 按能力分组的模型服务目录规范
- compose 骨架示例
- 启动说明
- 与平台集成的环境变量约定

它不是最终生产版运维方案，但可以作为后续“边做边能用”的模型管理起点。
