# Script Provider Example: OpenAI-Compatible Server

这个文件用于记录一个 `script` 能力下的 provider 示例。

## 适用场景

- 剧本生成
- scene narration 生成
- 对 OCR 结果进行整理、补全和结构化输出

## 推荐接口形态

优先使用 OpenAI-compatible 接口，方便平台后端复用统一的 client 适配层。

建议后续平台配置为：

```env
SCRIPT_PROVIDER=openai_compatible
SCRIPT_API_BASE=http://your-host:8001/v1
SCRIPT_MODEL_NAME=your-model-name
```

## 启动前准备

1. 复制环境变量模板：

```bash
cp models/.env.example models/.env
```

2. 调整这些变量：

- `SCRIPT_IMAGE`
- `SCRIPT_MODEL_PATH`
- `SCRIPT_MODEL_NAME`
- `SCRIPT_PORT`
- `SCRIPT_TENSOR_PARALLEL_SIZE`

## 启动

```bash
docker compose --env-file models/.env -f compose/model-services/script/openai-compatible-server.compose.yml up -d
```

## 默认设计

- 采用 `vLLM` 风格启动
- 默认暴露 OpenAI-compatible API
- 端口默认使用 `8001`
- 通过环境变量控制 tensor parallel、上下文长度和显存利用率

## 待确认

在你自己的服务器上接入前，需要确认：

- 现有镜像是否已经内置 `vllm serve`
- 模型目录实际挂载路径
- 是否需要 `--trust-remote-code`
- 是否要多卡张量并行
