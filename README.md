# SuanXiaoZhi

算小智：基于类脑大模型的记账系统（前端 Web + 后端 API + 文档与脚本）。

## 目录结构

- `src/`：前端（Vite + React + TS）
- `server/`：后端（Express + Prisma + SQLite），生产环境会同时托管前端 `dist/` 静态资源
- `docs/`：项目文档（需求/架构/接口/运维）
- `scripts/`：冒烟与联调脚本

## 本地开发

安装依赖：

```bash
pnpm install
pnpm -C server install
```

启动：

- 启动前后端一起（推荐）：`pnpm dev:all`
- 仅前端：`pnpm dev`
- 仅后端：`pnpm -C server dev`

检查：

- 冒烟测试（后端连通 & 结构校验）：`pnpm smoke`

接口文档见 [docs/后端接口文档.md](docs/后端接口文档.md)。

## 生产构建

在项目根目录执行：

```bash
pnpm install
pnpm -C server install
pnpm build:all
```

其中：

- `pnpm build`：构建前端到 `dist/`
- `pnpm -C server build`：构建后端到 `server/dist/`

## 部署（不使用宝塔面板）

部署目标：使用 **Node.js + PM2** 运行后端进程（通过 `server/ecosystem.config.cjs`），并由后端进程托管前端 `dist/`。

1) 服务器安装 Node.js（建议 18+）

2) 安装 PM2

```bash
npm i -g pm2
pm2 -v
```

3) 上传项目文件到服务器（包含 `dist/`、`server/dist/`、`server/prisma/` 等）

4) 安装/升级依赖（按你的发布习惯选择“安装”或“升级”）

```bash
pnpm install
pnpm -C server install
```

5) 配置环境变量

- 复制并修改：`server/.env.example` → `server/.env`
- 按实际环境修改（端口、数据库路径、允许跨域来源、AI Key 等）

6) 修改 PM2 配置

- 编辑 `server/ecosystem.config.cjs`（端口/DB 路径/允许跨域来源/日志路径等）

7) 启动与守护

```bash
pm2 start server/ecosystem.config.cjs
pm2 status
pm2 logs app-backend
pm2 save
```

更多运维细节见 [server/README-deploy.md](server/README-deploy.md)。
