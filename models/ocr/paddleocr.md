# OCR Provider Example: PaddleOCR

这个文件用于记录一个 OCR provider 示例的启动方式和最小部署说明。

## 适用场景

- 漫画页 OCR
- 气泡文本抽取
- 作为 `ocr` 能力下的一个可选 provider

## 启动前准备

1. 复制根目录模板：

```bash
cp models/.env.example models/.env
```

2. 按实际环境修改：

- `OCR_IMAGE`
- `OCR_PORT`
- `OCR_MODEL_DIR`

## 启动

```bash
docker compose --env-file models/.env -f compose/model-services/ocr/paddleocr.compose.yml up -d
```

## 约定

- 默认把 OCR 服务端口暴露为 `8118`
- 默认把模型目录挂载到容器内 `/models/ocr`
- 镜像和启动命令不写死，方便适配你自己的 GPU / 定制镜像环境

## 待确认

真正接入前需要确认：

- 镜像里是否已经封装 HTTP API
- 健康检查地址是什么
- 单图推理接口字段是什么
- 是否支持批量图片 OCR

## 接入平台建议

```env
OCR_PROVIDER=paddleocr
OCR_API_BASE=http://your-host:8118
```
