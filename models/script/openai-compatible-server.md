# Script Provider Example: OpenAI-Compatible Server

## 适用场景

当 Comic2Video 需要把 OCR 结果、页面摘要或分镜素材进一步转换成：

- 旁白草稿
- 分镜说明
- 镜头脚本
- 视频文案

可以通过 OpenAI-compatible 接口对接自建 LLM / 网关服务，而不把项目绑定到某一个单独供应商。

## 在本项目中的职责

Script provider 建议负责：

- 接收标准化输入，如 OCR 文本、页面元数据、任务语言设置
- 输出结构化脚本结果，而不是仅返回自由文本
- 支持工作流重试、日志记录和结果持久化

## 推荐接口形态

推荐在 Comic2Video 内部封装统一调用层，对外只暴露类似能力：

- `generate_scene_script`
- `generate_narration`
- `summarize_page`
- `repair_script_json`

底层服务如兼容 OpenAI Chat Completions / Responses 风格接口，接入成本会更低。

## 启动前准备

至少需要明确以下配置：

```env
SCRIPT_API_BASE_URL=http://localhost:8001/v1
SCRIPT_API_KEY=your-key
SCRIPT_MODEL=your-model-name
```

如果后端已统一配置模型 provider，也可以把这些变量继续收敛到平台主配置中。

## 启动

如果你有自建的 OpenAI-compatible 服务，确保它满足：

- 可通过 HTTP 调用
- 支持鉴权头
- 可返回稳定 JSON 或可控文本输出
- 最好支持超时、重试和并发限制

## 默认设计

在 Comic2Video 中，建议把该服务当作“脚本生成能力提供者”，而不是直接散落在各业务模块里发请求。

建议：

- provider 层统一封装模型名、base URL、认证信息
- workflow 层只关心输入输出，不关心具体供应商
- 对返回结果做结构化校验，减少后续步骤脆弱性

## 待确认

- 最终采用 Chat Completions 风格还是 Responses 风格
- 脚本结果是否统一要求 JSON schema
- 出错时是自动重试、降级生成，还是转人工处理

