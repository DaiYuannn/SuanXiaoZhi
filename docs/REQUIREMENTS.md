# 算小智 v2.1 需求文档

> 本文档供 AI 编程助手使用，包含 60 项具体需求的完整描述、涉及文件、预期行为和验收标准。
>
> **状态标记**：✅ 已完成 | ⏳ 部分完成 | ⬜ 待完成 | 🔧 需手动操作

---

## 进度总览

| 阶段 | 完成 | 待做 | 合计 |
|------|:----|:-----|:----:|
| 第一阶段：致命问题 | 20 | 0 | 20 |
| 第二阶段：功能/合规 | 6 | 12 | 18 |
| 第三阶段：运维/质量 | 6 | 16 | 22 |
| **合计** | **32** | **28** | **60** |

---

## 项目背景

算小智（SuanXiaoZhi）是一个个人财务管理 Web 应用，采用前后端分离架构：

- **前端**：React 19 + TypeScript + Vite + Tailwind CSS，domain-based 目录结构
- **后端**：Express + TypeScript + Prisma + PostgreSQL
- **认证**：JWT 签名认证（7天有效）
- **部署**：pm2 裸机部署，端口 3000

---

# 第一阶段：致命问题修复（20 项）

| # | 内容 | 状态 |
|---|------|:---:|
| 1 | 密码 bcrypt 哈希化 | ✅ |
| 2 | JWT 认证替换 Token 伪造方案 | ✅ |
| 3 | 轮换 DeepSeek API Key | 🔧 |
| 4 | 修复 ErrorBoundary（含重试 UI） | ✅ |
| 5 | 注册页对接真实 API | ✅ |
| 6 | 修复金额分/元显示 + 账户 API 加载 | ✅ |
| 7 | 修复账户 ID 映射（API 动态加载） | ✅ |
| 8 | 修复账本余额原子更新 | ✅ |
| 9 | 首页替换硬编码数据为 API 数据 | ✅ |
| 10 | 重写转账页面（中文 + 真实账户） | ✅ |
| 11 | 产品申购/赎回（真实交易记录） | ✅ |
| 12 | 忘记密码流程（弹窗 + 后端接口） | ✅ |
| 13 | 批量编辑 | ⬜ |
| 14 | 消费分析报告导出（window.print） | ✅ |
| 15 | 规划创建/生成 | ⬜ |
| 16 | 邀请码加入功能 | ⬜ |
| 17 | 隐私政策和服务条款页面 | ⬜ |
| 18 | 数据删除功能 | ⬜ |
| 19 | 数据导出功能 | ⬜ |
| 20 | 交易所有权校验 | ✅ |

---

# 第二阶段：功能完善与合规（18 项）

| # | 内容 | 状态 |
|---|------|:---:|
| 21 | "记住我"功能实现（localStorage/sessionStorage） | ✅ |
| 22 | 首页待办提醒改为动态数据 | ⬜ |
| 23 | 消费分析去掉假数据 | ✅ |
| 24 | 产品数据改为真实数据 | ⬜ |
| 25 | 去掉所有硬编码演示数据 | ⬜ |
| 26 | Nginx + HTTPS 配置 | ⬜ |
| 27 | 优雅关闭（SIGTERM/SIGINT） | ✅ |
| 28 | 数据库备份脚本 | ⬜ |
| 29 | PM2 配置 | ⬜ |
| 30 | Helmet 安全头 | ✅ |
| 31 | 速率限制（auth 10/min, general 120/min） | ✅ |
| 32 | 请求日志（morgan） | ✅ |
| 33 | 全局 Toast 组件 | ⬜ |
| 34 | admin/reports 路由注册 | ✅ |
| 35 | 前端错误上报修复 | ⬜ |
| 36 | 产品类型筛选器 | ⬜ |
| 37 | 产品分页改为真实分页 | ⬜ |
| 38 | 消费分析收入真实查询 | ✅ |

---

# 第三阶段：运维与质量（22 项）

| # | 内容 | 状态 |
|---|------|:---:|
| 39 | PWA 支持（manifest + service-worker） | ⬜ |
| 40 | robot.png 压缩（473KB → <30KB） | ⬜ |
| 41 | Font Awesome 树摇 | ⬜ |
| 42 | CI/CD 恢复 | ⬜ |
| 43 | ESLint + Prettier | ⬜ |
| 44 | Docker 化 | ⬜ |
| 45 | 前端测试框架 | ⬜ |
| 46 | 数据库索引 | ⬜ |
| 47 | 结构化日志（pino） | ⬜ |
| 48 | 健康检查增强（含 DB 连通性） | ✅ |
| 49 | 色彩对比度修复 | ✅ |
| 50 | 无障碍改进（aria 标签） | ⬜ |
| 51 | 路径别名（@/ @shared/） | ⬜ |
| 52 | 死代码清理 | ⬜ |
| 53 | 删除多余锁文件（package-lock.json） | ✅ |
| 54 | pnpm 移到 devDependencies | ✅ |
| 55 | eng.traineddata 移到 server/data | ✅ |
| 56 | .gitignore 完善 | ✅ |
| 57 | 响应式图片/懒加载 | ⬜ |
| 58 | 前端性能优化（Vite chunk 拆分） | ⬜ |
| 59 | 覆盖率报告更新 | ⬜ |
| 60 | 清理未提交变更 | ⬜ |

---

## 已完成项完整清单（32 项）

| # | 内容 | 涉及文件 |
|---|------|----------|
| 1 | 密码 bcrypt 哈希化 | `auth.ts`、`db.ts` |
| 2 | JWT 认证（7天有效） | `auth.ts`、`middlewares/auth.ts` |
| 4 | ErrorBoundary 含重试 | `ErrorBoundary.tsx` |
| 5 | 注册页对接真实 API | `RegisterPage.tsx` |
| 6 | 金额显示 /100 + 账户下拉 API 加载 | `UserSettingsPage.tsx`、`AddTransactionPage.tsx` |
| 7 | 账户 ID 从 API 动态加载 | `AddTransactionPage.tsx` |
| 8 | 账本余额原子更新 | `transactions.ts` POST |
| 9 | 首页卡片 API 驱动 | `HomePage.tsx`、`accounts.ts` `/summary` |
| 10 | 转账页重写中文可用 | `TransferPage.tsx` |
| 11 | 产品申购/赎回 | `ProductDetailPage.tsx` |
| 12 | 忘记密码流程 | `LoginPage.tsx`、`auth.ts` `/forgot-password` |
| 14 | 报告导出 window.print() | `ConsumptionAnalysisPage.tsx` |
| 20 | 交易所有权校验 | `transactions.ts` PATCH/DELETE |
| 21 | "记住我"持久化 | `auth-session.ts`、`LoginPage.tsx` |
| 23 | 消费分析 ×1.45 去掉 | `ConsumptionAnalysisPage.tsx` |
| 27 | 优雅关闭（SIGTERM） | `index.ts` |
| 30 | Helmet 安全头 | `app.ts` |
| 31 | 速率限制 | `app.ts` |
| 32 | 请求日志（morgan） | `app.ts` |
| 34 | admin/reports 路由注册 | `routes.ts` |
| 38 | 后端收入真实计算 | `analysis.ts` |
| 48 | 健康检查含 DB 连通 | `app.ts` `/health` |
| 49 | 色彩对比度修复 | `tailwind.config.js` |
| 53 | 删除 package-lock.json | 根目录 |
| 54 | pnpm → devDependencies | `package.json` |
| 55 | eng.traineddata → server/data | `server/data/` |
| 56 | .gitignore 完善 | `.gitignore` |
| — | 登录回退移除 demo 后门 | `auth-api.ts` |
| — | 登录页隐藏 demo 凭据 | `LoginPage.tsx` |
| — | 种子数据密码哈希化 | `db.ts` |
| — | 后端账户汇总新接口 | `accounts.ts` `/summary` |

---

## 剩余 28 项（按优先级排序）

| 优先级 | # | 内容 | 预计工时 |
|:---:|:---:|------|:---:|
| 高 | 13 | 批量编辑 | 中 |
| 高 | 15 | 规划创建/生成 | 中 |
| 高 | 16 | 邀请码加入功能 | 中 |
| 高 | 22 | 首页待办提醒动态数据 | 小 |
| 高 | 24 | 产品数据真实读取 | 小 |
| 高 | 25 | 去掉硬编码演示数据 | 小 |
| 高 | 33 | 全局 Toast 组件 | 大 |
| 高 | 46 | 数据库索引 | 小 |
| 中 | 17 | 隐私政策/服务条款页面 | 中 |
| 中 | 18 | 数据删除功能 | 中 |
| 中 | 19 | 数据导出功能 | 中 |
| 中 | 26 | Nginx + HTTPS 配置 | 中 |
| 中 | 28 | 数据库备份脚本 | 小 |
| 中 | 29 | PM2 配置 | 小 |
| 中 | 35 | 前端错误上报修复 | 小 |
| 中 | 36 | 产品类型筛选器 | 小 |
| 中 | 37 | 产品分页真实分页 | 小 |
| 中 | 42 | CI/CD 恢复 | 中 |
| 中 | 58 | Vite chunk 拆分 | 小 |
| 末 | 39 | PWA 支持 | 中 |
| 末 | 40 | robot.png 压缩 | 小 |
| 末 | 41 | Font Awesome 树摇 | 中 |
| 末 | 43 | ESLint + Prettier | 中 |
| 末 | 44 | Docker 化 | 中 |
| 末 | 45 | 前端测试框架 | 大 |
| 末 | 47 | 结构化日志 pino | 中 |
| 末 | 50 | 无障碍改进 | 大 |
| 末 | 51-60 | 其余清理项 | 小 |

---

## 附录 A：项目依赖清单

```
backend deps: express, prisma, @prisma/client, zod, cors
             ✅ bcryptjs, jsonwebtoken, helmet, express-rate-limit, morgan
             建议: pino

frontend deps: react 19, react-router-dom 7, tailwindcss 3, chart.js, marked, dompurify, tesseract.js

devDeps: typescript 5.8, vite 7.1, vitest 4.1, supertest, pnpm
         待安装: eslint, prettier, @testing-library/react
```

## 附录 B：关键文件路径索引

```
认证相关：
  server/src/routes/v1/mobile/auth.ts        # 注册/登录/改密/忘记密码 + JWT
  server/src/middlewares/auth.ts             # JWT 验证中间件
  server/src/middlewares/apiGateway.ts       # API 网关
  src/domains/auth/pages/LoginPage.tsx        # 登录页（含忘记密码弹窗）
  src/domains/auth/pages/RegisterPage.tsx     # 注册页（已对接 API）
  src/domains/auth/api/auth-api.ts            # 后门已移除
  src/shared/utils/auth-session.ts            # Token 存储（含记住我）

交易相关：
  server/src/routes/v1/mobile/transactions.ts # CRUD + 所有权校验 + 余额原子更新
  src/domains/ledger/pages/AccountingPage.tsx # 记账列表
  src/domains/ledger/pages/AddTransactionPage.tsx # 添加交易（账户从 API 加载）
  src/domains/ledger/pages/TransferPage.tsx   # 转账页（中文化 + 真实账户）

账户相关：
  server/src/routes/v1/mobile/accounts.ts     # 含 /summary 汇总接口
  src/domains/home/pages/HomePage.tsx         # 首页（卡片接 API）
  src/domains/auth/pages/UserSettingsPage.tsx # 余额已 /100

分析/产品：
  server/src/routes/v1/mobile/analysis.ts     # 收入真实计算
  src/domains/analysis/pages/ConsumptionAnalysisPage.tsx  # ×1.45 已去，window.print 导出
  src/domains/analysis/pages/FinancialPlanningPage.tsx     # 规划创建待修
  server/src/routes/v1/mobile/products.ts                  # 伪随机待修
  src/domains/products/pages/ProductDetailPage.tsx         # 申购/赎回已实现

基础设施：
  server/src/app.ts                           # Helmet + 限流 + morgan + 健康检查
  server/src/db.ts                            # 种子密码哈希化
  server/src/index.ts                         # SIGTERM 优雅关闭
  server/prisma/schema.prisma                 # 数据模型（缺索引）
  src/shared/components/ErrorBoundary.tsx      # 含重试 UI
  tailwind.config.js                          # 色彩对比度已修复
  vite.config.ts                              # 构建配置
  deploy.sh                                   # 部署脚本
```
