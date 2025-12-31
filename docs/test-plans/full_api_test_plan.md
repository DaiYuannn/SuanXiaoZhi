# 全面接入 API 测试计划（V1）

本计划覆盖：日常记账、财务分析、规划与建议、理财决策，以及智能客服对话编排。采用“Smoke → 接口联调 → E2E 回归”的三层策略。

## 一、环境与配置

- 前端：Vite+TS+React；API_BASE 由 VITE_API_BASE 注入
- Smoke：.env.smoke（DeepSeek/Backend/超时/图片路径/开关）
- 账户：DeepSeek 有额度；后端提供 dev/staging 基础地址

## 二、接口清单（草案）

- 记账/交易
  - GET /transactions?page&size&filter
  - POST /transactions
  - PATCH /transactions/:id { isAnomaly?, category? }
- 异常扫描
  - POST /transactions/scanAnomalies
- 提醒
  - GET/POST/PATCH /reminders
- 消费分析
  - GET /analytics/consumptionSummary?month
- 用户画像
  - GET /user/persona
- 规划与建议
  - POST /planning/suggestions
- 理财推荐与风险
  - POST /products/recommend
  - GET /risk/assessment?userId

以上为前端需要的最小集；实际以后端提供为准。

## 三、数据契约要点

- 统一响应：{ code, message, data }
- 金额单位：分（int）
- 时间：ISO 字符串；前端展示再本地化
- 记账项：{ id, amountCent, category, note, ts, isAnomaly? }
- 画像：{ ageBand, incomeBand, savingRate, spendTopCategories[], riskProfile }
- 建议：{ options:[{title, steps[], budget?, impact?}] }
- 推荐：{ products:[{name, yieldRange?, risk, horizon, why}] , riskTips[] }

## 四、联调顺序（建议）

1) 核心读写：Transactions 列表/创建/分类更新（含异常标记）
2) 消费分析：/analytics/consumptionSummary → 图表联动
3) 提醒：获取/更新频率与状态
4) 画像：/user/persona → 首页卡片 & 分析页说明
5) 规划：/planning/suggestions → 计划页与助手编排
6) 推荐+风险：/products/recommend & /risk/assessment → 产品页/详情页
7) 智能客服：串联上面工具，完成多轮任务流

## 五、测试矩阵

- Smoke（已具备）
  - DeepSeek 文本连通（必跑）
  - Vision：若不支持则自动本地OCR回退
  - Backend：transactions/reminders/consumptionSummary（可扩展）
- 接口联调（Postman/脚本）
  - 正常、边界、错误码、超时重试
- E2E（用户路径）
  - 文字/图片快速记账 → 列表可见 → 分析可见
  - 助手：分类确认 → 结构化落地
  - 规划：生成3个方案 → 用户选择 → 首页插卡
  - 理财：推荐列表 → 风险提示 → 详情页跳转

## 六、通过标准（示例）

- 记账：文本或图片两条路径，平均≤3秒完成，分类准确率≥80%
- 分析：最近30天趋势与Top类目不为空，且与交易数据一致
- 助手：少于1次追问完成一次完整记账
- 规划与推荐：均返回≥1个可选项，包含风险提示

## 七、持续改进

- 采集匿名指标（耗时、准确率、失败率）
- A/B：分类模型/提示词
- 移动端适配与无障碍（字体、对比度、触控区）
