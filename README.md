<p align="center">
  <img src="robot.png" width="120" alt="算小智 Logo" />
</p>

<h1 align="center">算小智 SuanXiaoZhi</h1>
<p align="center"><strong>AI-Powered Personal Finance Manager</strong></p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Vite-7-646CFF?logo=vite" alt="Vite" />
  <img src="https://img.shields.io/badge/Express-4-000000?logo=express" alt="Express" />
  <img src="https://img.shields.io/badge/Prisma-5-2D3748?logo=prisma" alt="Prisma" />
  <img src="https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Tailwind-3-06B6D4?logo=tailwindcss" alt="Tailwind" />
  <img src="https://img.shields.io/badge/pnpm-10-F69220?logo=pnpm" alt="pnpm" />
</p>

<p align="center">
  <b>智能记账 · AI 财务顾问 · 家庭共享账本 · 风险测评 · 双端管理</b>
</p>

---

## ✨ 核心功能

<table>
<tr>
<td width="50%">

### 📱 C 端（用户端）
- **智能记账** — 收入/支出/转账，支持手动录入与 OCR 票据识别
- **AI 财务助手** — 基于 DeepSeek 的对话式理财顾问，结合你的真实交易数据给出个性化建议
- **消费分析** — 多维度消费趋势图表、分类占比、收支对比
- **财务规划** — 创建储蓄/还款/投资计划，跟踪进度
- **金融产品** — 浏览理财产品，模拟申购赎回
- **风险评估** — 风险承受能力测评，匹配投资策略
- **家庭账本** — 家庭成员共享账本，户主全量/成员脱敏分级展示
- **积分激励** — 每日任务、成就徽章、积分累积
- **智能提醒** — 账单提醒、储蓄提醒、每周复盘提醒

</td>
<td width="50%">

### 🖥️ B 端（管理后台）
- **运营仪表盘** — 系统总览、关键指标、趋势图表
- **用户管理** — 搜索、角色筛选、用户详情、最近交易
- **交易管理** — 全平台交易查询与管理
- **产品管理** — 金融产品上下架与配置
- **系统监控** — 审计日志、安全事件追踪
- **权限分级** — 超级管理员 / 运营 / 只读查看，页面级 + 接口级权限控制

</td>
</tr>
</table>

## 🛠️ 技术栈

| 层级 | 技术 |
|------|------|
| 前端框架 | React 19 + TypeScript |
| 构建工具 | Vite 7 |
| CSS 框架 | Tailwind CSS 3 |
| 后端框架 | Express 4 + TypeScript |
| ORM | Prisma 5 |
| 数据库 | PostgreSQL 16 |
| 认证 | bcrypt + JWT（7天有效期） |
| AI 引擎 | DeepSeek Chat API |
| OCR | Tesseract.js |
| 测试 | Vitest + Supertest |
| 包管理 | pnpm |

## 🚀 快速开始

### 环境要求

- Node.js ≥ 20
- pnpm ≥ 10
- PostgreSQL ≥ 16

### 本地开发

```bash
# 1. 克隆项目
git clone https://github.com/DaiYuannn/SuanXiaoZhi.git
cd SuanXiaoZhi

# 2. 安装依赖
pnpm install

# 3. 配置环境变量（参考 .env.example 创建 .env）
cp .env.example .env

# 4. 初始化数据库
npx prisma db push --schema server/prisma/schema.prisma

# 5. 填充演示数据（可选）
pnpm seed

# 6. 启动开发环境
pnpm dev
```

启动后访问：
- 前端开发服务器：`http://localhost:5173`
- 后端 API：`http://localhost:3000`
- 健康检查：`http://localhost:3000/health`

### 生产构建

```bash
pnpm build    # TypeScript 编译 + Vite 打包
pnpm start    # 启动 Express 服务（同时托管前端静态资源）
```

## 👥 演示账号

项目启动后会自动创建演示账号，包含模拟交易数据（`demo_owner` 约 500 条）：

| 角色 | 用户名 | 密码 | 入口 |
|------|--------|------|------|
| 🏠 家庭户主 | `demo_owner` | `demo123` | `/` |
| 👨‍👩‍👧 家庭成员 | `demo_family` | `demo123` | `/` |
| 🔧 超级管理员 | `demo_admin` | `demo123` | `/admin` |
| 📋 运营人员 | `demo_operator` | `demo123` | `/admin` |
| 👁️ 只读查看 | `demo_viewer` | `demo123` | `/admin` |

> 💡 也支持直接注册新账号，默认创建 `owner` 角色。

## 📁 项目结构

```
算小智/
├── src/                          # 前端源码
│   ├── admin/                    # B 端管理后台页面
│   │   └── pages/                # Dashboard, Users, Transactions, Products, System
│   ├── domains/                  # 业务领域（Domain-based 架构）
│   │   ├── analysis/             # 消费分析与财务规划
│   │   ├── assistant/            # AI 智能客服
│   │   ├── auth/                 # 登录/注册/设置
│   │   ├── family/               # 家庭管理
│   │   ├── home/                 # C 端首页仪表盘
│   │   ├── incentives/           # 积分与成就
│   │   ├── ledger/               # 记账/转账/票据上传
│   │   └── products/             # 金融产品/风险测评
│   ├── router/                   # 路由配置与权限守卫
│   └── shared/                   # 共享组件/Hooks/工具
├── server/                       # 后端源码
│   ├── prisma/                   # 数据库 Schema 与迁移
│   └── src/
│       ├── config/               # 环境配置
│       ├── contracts/            # API 契约（Zod Schema）
│       ├── middlewares/           # 鉴权/权限/错误处理/API 网关
│       ├── routes/v1/mobile/     # C 端 API（19 个路由模块）
│       ├── routes/v1/admin/      # B 端 API（6 个路由模块）
│       └── services/             # RBAC 权限服务
├── tests/                        # 测试
│   ├── integration/              # 集成测试
│   ├── e2e/                      # 端到端测试
│   └── perf/                     # 性能测试
├── docs/                         # 设计文档与重构报告
└── .env.example                  # 环境变量模板
```

## 🔒 安全特性

- **密码安全**：bcrypt（10 轮盐）哈希存储
- **JWT 认证**：7 天过期，支持 Token 吊销
- **速率限制**：登录接口 10次/分钟，通用接口 120次/分钟
- **安全头**：Helmet 中间件，CSP/CORS 策略
- **权限控制**：页面级 + 接口级 RBAC，5 种角色分级
- **审计日志**：关键操作全程记录
- **优雅关闭**：SIGTERM/SIGINT 信号处理

## 📝 可用脚本

| 命令 | 说明 |
|------|------|
| `pnpm dev` | 启动前后端开发服务器 |
| `pnpm build` | 生产构建 |
| `pnpm start` | 启动生产服务 |
| `pnpm test` | 运行单元测试 |
| `pnpm test:integration` | 运行集成测试 |
| `pnpm test:e2e` | 运行端到端测试 |
| `pnpm typecheck` | TypeScript 类型检查 |
| `pnpm seed` | 填充演示数据 |

## 📄 License

MIT

---

<p align="center">
  <sub>Made with ❤️ by SuanXiaoZhi Team</sub>
</p>
