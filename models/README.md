# Models Guide

## 目录定位

`models/` 用于存放 Comic2Video 项目中与模型能力接入相关的说明文档。

当前重点不是绑定某个上游默认模型，而是明确“如何替换、如何接入、如何联调”。

## 当前分类

```text
models/
├── ocr/                 # OCR 能力说明
└── script/              # 剧本 / 分镜 / 文本生成能力说明
```

后续如接入 TTS、视频生成、镜头规划等能力，可继续按领域拆分子目录。

## 文档原则

- 优先描述 Comic2Video 中的职责和接入位置
- 优先描述接口约定、运行方式、配置方式、故障排查
- 不保留与本项目无关的上游演示说明
- 不把模型供应商文档原样搬运进来，尽量转化为本项目可执行的接入指南

## 推荐阅读顺序

- OCR 接入：`ocr/paddleocr.md`
- Script 服务接入：`script/openai-compatible-server.md`

