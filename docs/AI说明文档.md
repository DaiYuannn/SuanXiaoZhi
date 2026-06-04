# 算小智 AI 说明文档

## 1. 文档目标
本说明文档用于描述当前项目中 AI 能力的实现现状、调用链路、配置方式、安全边界与运维要点，帮助开发、测试与运维团队快速理解并稳定使用相关能力。

适用范围：
- 智能客服与聊天问答
- OCR 票据识别与分类
- 基于规则的理财规划生成
- 意图识别联动（导航/激励）

---

## 2. 当前 AI 能力总览

### 2.1 能力清单
1. 智能聊天（移动端 AI 路由）
- 接口：`POST /api/v1/mobile/ai/chat`
- 能力：结合用户最近交易数据构建上下文，调用 DeepSeek 生成回复；失败时本地降级回复。

2. OCR 识别与分类
- 接口：`POST /api/v1/mobile/ocr/classify`（图片）
- 接口：`POST /api/v1/mobile/ocr/classify-text`（文本）
- 能力：先 OCR（Tesseract），再调用 DeepSeek 做结构化分类；失败时用规则兜底金额与默认分类。

3. 智能客服前端体验
- 页面：智能客服页 + 悬浮助手面板
- 能力：Markdown 渲染 + HTML 安全净化 + 意图识别联动页面跳转。

4. 规划建议生成（规则引擎）
- 接口：`POST /api/v1/mobile/plan/generate`
- 能力：根据目标、预算、截止时间、约束条件生成两套可执行计划（非大模型推理，属于模板化策略）。

### 2.2 关键技术栈
- 服务端：Express + Prisma + Zod
- 模型调用：DeepSeek Chat Completions（OpenAI 风格接口）
- OCR：tesseract.js（当前默认语言 `eng`）
- 前端渲染：marked + DOMPurify

---

## 3. 系统架构与调用链路

### 3.1 智能聊天链路
1. 前端调用 `aiChat(messages)`。
2. 后端 `mobile/ai/chat` 解析消息，抽取最后一条用户问题。
3. 创建/复用聊天会话，落库用户消息。
4. 查询用户最近 30 笔交易，提取：
- 交易条数
- 支出总额
- 最高支出分类
5. 组装系统提示词（强调“先结论，再给 3 条可执行建议”）。
6. 若配置有效 API Key，则调用 DeepSeek；超时 10 秒自动中断。
7. 若模型失败或无内容，使用本地 fallback 生成可执行建议。
8. 落库助手回复并返回。

### 3.2 OCR 分类链路
1. 前端上传图片（`multipart/form-data`）或文本。
2. 图片路径先做 OCR，得到文本块数组。
3. 调用 DeepSeek 要求返回严格 JSON 结构（金额、商户、时间、分类分值）。
4. 若模型无有效结果，按正则提取金额并补默认分类。
5. 结果写入内存缓存（按输入指纹去重），返回结构化数据。

### 3.3 意图识别联动
1. 前端发送用户文本到意图识别接口。
2. 获取意图后按分值排序，命中导航意图则生成可点击 CTA。
3. 用户点击后进入对应业务页面，形成“问答 -> 操作”闭环。

---

## 4. 目录与关键文件

### 4.1 服务端
- `server/src/routes/v1/mobile/ai.ts`
- `server/src/routes/v1/mobile/ocr.ts`
- `server/src/routes/v1/mobile/plan.ts`
- `server/src/routes/index.ts`
- `server/src/config/env.ts`
- `server/src/contracts/api.ts`

### 4.2 前端
- `src/shared/constants/endpoints.ts`
- `src/domains/assistant/components/AssistantPanel.tsx`
- `src/domains/assistant/pages/CustomerServicePage.tsx`
- `src/domains/assistant/hooks/useAssistant.ts`
- `src/domains/assistant/hooks/useAssistantFallback.ts`

---

## 5. 接口说明

### 5.1 聊天接口
- 路径：`POST /api/v1/mobile/ai/chat`
- 鉴权：需 Bearer Token
- 请求体（当前实际支持）
```json
{
  "message": "如何控制本月餐饮支出？",
  "sessionId": "optional",
  "messages": [
    { "role": "system", "content": "..." },
    { "role": "user", "content": "..." }
  ]
}
```
- 响应体（当前实现）
```json
{
  "ok": true,
  "code": 0,
  "message": "ok",
  "data": {
    "content": "...",
    "sessionId": "..."
  }
}
```

说明：
- 合同文件中 `aiChatSchema` 仅定义 `message` 字段，但路由实现已经兼容 `messages` 与 `sessionId`。
- 前端主要按 `messages` 方式调用。

### 5.2 OCR 图片分类接口
- 路径：`POST /api/v1/mobile/ocr/classify`
- Content-Type：`multipart/form-data`
- 表单字段：`image`（可多文件）
- 可选查询参数：`noCache=1`（绕过缓存）

返回数据示例：
```json
{
  "ok": true,
  "code": 0,
  "message": "ok",
  "data": {
    "ocr": [{ "text": "..." }],
    "categories": [{ "label": "餐饮", "score": 0.93 }],
    "amount": 35.8,
    "merchant": "示例商户",
    "ts": "2026-04-08T10:00:00.000Z"
  }
}
```

### 5.3 OCR 文本分类接口
- 路径：`POST /api/v1/mobile/ocr/classify-text`
- 请求体：`{ "text": "..." }`
- 其余返回结构与图片分类一致。

### 5.4 计划生成接口（规则）
- 路径：`POST /api/v1/mobile/plan/generate`
- 输入：`target`、`budget`、`deadline`、`constraints[]`
- 输出：固定为两套计划模板（30 天执行计划、90 天稳态计划）。

---

## 6. 环境变量与配置

服务端环境变量定义在 `server/src/config/env.ts`：

- `DEEPSEEK_API_KEY`
- `DEEPSEEK_BASE_URL`（默认 `https://api.deepseek.com`）
- `DEEPSEEK_MODEL`（默认 `deepseek-chat`）

推荐配置：
```env
DEEPSEEK_API_KEY=your-real-key
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat
```

注意：
- 当 `DEEPSEEK_API_KEY` 未配置或等于 `mock-key`，聊天接口会走本地降级逻辑。
- `NODE_ENV=test` 下默认不走外部模型调用，便于测试稳定性。

---

## 7. 降级与容错策略

### 7.1 聊天降级
触发条件：
- 模型请求异常
- 超时
- 响应无有效内容

降级行为：
- 使用本地规则根据用户问题关键词（预算/超支/理财等）生成可执行建议。
- 建议内容仍引用用户近期交易概况（条数、支出、高频分类）。

### 7.2 OCR 降级
触发条件：
- 模型不可用
- 模型返回非 JSON 或无法解析

降级行为：
- 使用文本数字正则提取候选金额并选取最大合理值。
- 分类默认回退为 `[{ label: "其他", score: 0.5 }]`。

### 7.3 前端降级
- 智能客服页面在 `aiChat` 失败时会走本地规则回复。
- 保障关键用户路径不会因模型不可用而完全阻断。

---

## 8. 安全与合规

1. 鉴权与权限
- AI 与 OCR 属于移动端路由，受统一鉴权中间件保护。
- 请求需 `Authorization: Bearer token-<userId>`。

2. 输出安全
- 前端对模型返回 Markdown 转 HTML 后，使用 DOMPurify 进行净化。
- 降低 XSS 风险。

3. 数据最小化原则（当前状态）
- 聊天上下文仅使用最近 30 笔交易摘要，不直接拼接完整敏感字段。
- 仍建议在后续版本进一步脱敏与字段分级。

4. 合规提示
- 客服页面已集成 `ComplianceNotice` 组件，提示 AI 建议仅供参考。

---

## 9. 缓存与性能

1. OCR 缓存
- 使用进程内 Map 缓存，按输入指纹（sha256）命中。
- 缓存量超过 200 条时清空。
- 适合单实例开发环境，不适合多实例共享场景。

2. 模型超时控制
- 聊天接口外部调用超时设为 10 秒，避免请求长期挂起。

3. 建议优化方向
- 生产环境将 OCR 缓存替换为 Redis（带 TTL）。
- 增加模型调用重试与熔断策略。

---

## 10. 测试与验证建议

### 10.1 冒烟验证
1. 配置真实 `DEEPSEEK_API_KEY`。
2. 登录后在智能客服页发送问题，确认返回内容与交易相关。
3. 上传票据图片，确认 `amount/categories/merchant` 有返回。
4. 删除或置空 API Key，确认聊天与 OCR 都能正常降级。

### 10.2 回归重点
- `message` 与 `messages` 两种聊天入参兼容性。
- OCR 在无文本、噪声文本、多数字文本情况下的金额提取稳定性。
- DOMPurify 对富文本输出的安全净化是否生效。
- 意图识别结果为空时，UI 不应报错。

---

## 11. 已知限制

1. OCR 语言当前固定 `eng`，中文票据识别精度受限。
2. 聊天会话虽有落库，但前端会话管理能力仍可增强（例如历史会话列表与检索）。
3. `aiChatSchema` 与路由实际入参存在轻微不一致（schema 偏窄）。
4. OCR 缓存为进程内缓存，不支持跨实例共享。

---

## 12. 后续演进建议

1. 增加统一 Prompt 模板管理与版本化。
2. 收敛 AI 接口契约（更新 schema 覆盖 `messages/sessionId`）。
3. 接入可观测指标：模型耗时、失败率、降级率、token 用量。
4. 引入 PII 脱敏中间件与敏感词审计。
5. OCR 支持多语言（`chi_sim+eng`）与票据版式识别增强。

---

## 13. 快速排障

### 13.1 AI 总是走降级
检查：
- `DEEPSEEK_API_KEY` 是否为空或为 `mock-key`
- 服务是否读取到最新环境变量
- 外网是否可访问 `DEEPSEEK_BASE_URL`

### 13.2 OCR 无法识别金额
检查：
- 上传图片是否清晰、是否包含有效数字
- 模型返回是否为 JSON（或可提取 JSON）
- 文本中数字格式是否可被正则匹配

### 13.3 聊天回复与用户场景弱相关
检查：
- 最近交易数据是否为空
- 鉴权用户是否正确
- 提示词是否被前端系统消息覆盖或冲突

---

## 14. 版本信息
- 文档版本：v1.0
- 更新时间：2026-04-08
- 维护建议：每次 AI 路由、提示词、鉴权或模型配置变更后同步更新本文件。
