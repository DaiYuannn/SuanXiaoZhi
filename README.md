# 算小智金融助手（B/C 双端）

## 项目简介
算小智是一个前后端一体化的金融管理系统，支持 B 端（管理后台）和 C 端（用户端）双模式。

- C 端：移动端优先，同时兼容桌面浏览器
- B 端：桌面管理后台，含权限分级
- 后端：Express + Prisma + SQLite
- 前端：React + Vite + TypeScript + Tailwind

## 当前已实现内容

### 前端
- B/C 双布局拆分：`MobileLayout`、`AdminLayout`
- 登录页支持三类身份入口卡片（账户主人 / 家庭成员 / 管理端）
- 登录后按身份分流：
	- `owner/family` 进入 C 端首页 `/`
	- `super_admin/operator/viewer` 进入 B 端 `/admin`
- 路由守卫：
	- 未登录访问业务路由 -> `/login`
	- 越权访问 -> `/403`
- C 端：手机优先 + 桌面全屏自适配，支持家庭信息分级展示（户主全量/成员脱敏）
- B 端：纯桌面控制台，用户管理支持搜索、角色筛选、账户详情与最近交易查看

### 后端
- `mobile` 与 `admin` API 路由分组
- 登录/注册接口
- Bearer Token 基础鉴权（`Authorization: Bearer token-<userId>`）
- 权限校验中间件
- Prisma 数据模型（用户、账本、交易、分类、任务等）

### 测试与工程化
- TypeScript 双配置（前端/服务端）
- Vitest（单测、集成、E2E、性能）
- 错误处理与审计上报基础链路

## 运行方式

### 1. 安装依赖
```bash
pnpm install
```

### 2. 启动开发环境（前后端同时）
```bash
pnpm dev
```

默认端口：
- 前端：`http://localhost:5173`
- 后端：`http://localhost:3000`

### 3. 类型检查
```bash
pnpm typecheck
```

### 4. 测试命令
```bash
pnpm test
pnpm test:integration
pnpm test:e2e
pnpm test:perf
```

### 5. 生产部署（前后端一体）
```bash
pnpm build
pnpm start
```

说明：
- `pnpm build` 会构建前端 `dist` 并完成 TypeScript 编译。
- `pnpm start` 启动 Express 服务，同时自动托管前端 `dist` 静态资源。
- 默认访问地址：
	- 应用首页：`http://localhost:3000`
	- 健康检查：`http://localhost:3000/health`

## 不同身份组登录账号（本地演示）

以下账号已写入当前本地数据库，可直接用于登录验证：

| 身份组 | 用户名 | 密码 | 登录后入口 |
|---|---|---|---|
| C端-业主 | `demo_owner` | `demo123` | `/` |
| C端-家庭成员 | `demo_family` | `demo123` | `/` |
| B端-运营 | `demo_operator` | `demo123` | `/admin` |
| B端-超级管理员 | `demo_admin` | `demo123` | `/admin` |
| B端-只读查看 | `demo_viewer` | `demo123` | `/admin` |

兼容账号：
- `demo / demo`（历史保留账号，角色通常为 `owner`）

## 账号补充说明
- 注册接口当前默认创建 `owner` 角色。
- 若要新增其他角色账号，可在数据库中修改 `user.role` 字段为：
	- `owner`
	- `family`
	- `operator`
	- `super_admin`
	- `viewer`
- 后端鉴权会校验用户 `isActive=true`，停用账号无法登录业务接口。

## Demo 数据说明（与账号匹配）
- 初始化会自动创建演示家庭：`demo_owner + demo_family`。
- 自动创建账本：
	- 户主主账户（PERSONAL）
	- 家庭成员账户（PERSONAL）
	- 演示家庭共享账本（FAMILY）
- 自动生成较大体量交易数据用于曲线展示：
	- `demo_owner` 约 120 天、每天 2~6 笔
	- `demo_family` 约 90 天、每天 1~4 笔
	- `demo_operator` 约 45 天、每天 1~3 笔
- 交易包含收入/支出、分类、备注、异常标记，首页趋势图可展示更丰富波动。

如需补充或重建 demo 数据，可执行：
```bash
pnpm seed
```

## 常见问题

### 1. `npm run dev` / `pnpm dev` 启动失败，提示端口被占用
通常是本机残留 `node` 进程占用了 `3000` 或 `5173`。

可在 PowerShell 执行：
```powershell
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
```

然后重新执行：
```bash
pnpm dev
```

### 2. 为什么访问页面会跳转到登录页
- 本项目已启用“未登录不可访问业务路由”策略。
- 请先登录，再访问业务路径。

### 3. 为什么手机访问 B 端会提示不可用
- B 端为纯桌面控制台，移动端会显示拦截提示。
- 手机端请使用 C 端路径（`/`）。

## 目录结构（简版）
- `src/`：前端业务代码（domains/router/shared/admin）
- `server/`：后端服务与 Prisma
- `tests/`：测试代码
- `docs/`：设计文档、重构报告、Bug 报告

## 备注
若你后续希望我继续维护 README，我可以再补：
1. API 示例（curl）
2. 数据库初始化流程图
3. 角色权限矩阵（页面级 + 接口级）