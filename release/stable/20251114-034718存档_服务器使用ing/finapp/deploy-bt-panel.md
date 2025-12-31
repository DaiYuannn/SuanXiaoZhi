# 金智通前后端一体化部署（宝塔面板 · Linux）

本文档说明需要上传到服务器的文件清单，以及在宝塔（BT）Linux 面板上的完整部署步骤。默认前端用 Nginx 提供静态文件，`/api` 由 Nginx 反向代理至 Node.js 后端（PM2 常驻）。

## 架构概览
- Browser → Nginx
  - 静态站点根指向前端 `dist/`
  - `/api/` → 反向代理到 `http://127.0.0.1:5177`
- Node.js（Express）监听 `5177`，提供 `/api/v1/*` 与 `/health`
- 数据库：SQLite（单机文件），建议路径 `server/data/app.sqlite`

```
[Client] ──HTTP──> [Nginx]
   |  /              |  /api/* → http://127.0.0.1:5177
   |  static         |  static dist + SPA fallback
   v                 v
[ Frontend dist ]   [ Node.js API + SQLite ]
```

## 需要上传到服务器的内容
你有两种方式：

方式 A（推荐）在服务器构建：
- 整个项目目录（排除 `node_modules/`）
  - 根目录：`package.json`, `pnpm-lock.yaml`, `vite.config.ts`, `tsconfig*.json`, `src/`（前端）
  - `server/`：后端代码及 `package.json`、`tsconfig`、源码
  - `docs/`：文档（可选）
- 在服务器上安装依赖并构建产物（见下文步骤）

方式 B 本地构建、仅上传制品：
- 前端：`dist/` 目录（由 `pnpm build` 生成）
- 后端：`server/` 子目录中的：
  - `package.json`, `pnpm-lock.yaml`
  - 编译后目录 `dist/`（由 `pnpm -C server build` 生成）
  - 新建 `data/` 目录（放置 SQLite：`server/data/app.sqlite`）
  - 新建 `.env`（见下方示例）
- 注意：无需上传 `node_modules/`，在服务器执行安装生产依赖即可

## 环境准备（宝塔面板）
1) 安装 Node.js 与 PM2
- 在宝塔左侧「软件商店」搜索安装「Node.js 项目管理器」或通过 SSH：
```bash
# 推荐安装 LTS 版本 Node.js、pnpm、pm2
curl -fsSL https://get.pnpm.io/install.sh | sh -
export PNPM_HOME="$HOME/.local/share/pnpm"; export PATH="$PNPM_HOME:$PATH"
corepack enable # 或 npm i -g pnpm
npm i -g pm2
node -v && pnpm -v && pm2 -v
```

2) 创建站点目录（示例）
```bash
# 前端静态目录
sudo mkdir -p /www/wwwroot/finapp/dist
# 后端目录（放 server 子项目）
sudo mkdir -p /www/wwwroot/finapp/server/data
sudo chown -R www:www /www/wwwroot/finapp
```

## 构建与运行

### 方式 A：在服务器构建
1) 上传整个项目（排除 node_modules）到 `/www/wwwroot/finapp`
2) 安装依赖并构建
```bash
cd /www/wwwroot/finapp
pnpm install
pnpm build              # 构建前端，生成 dist/
pnpm -C server install
pnpm -C server build    # 构建后端，生成 server/dist/
```
3) 配置后端环境变量 `.env`
在 `/www/wwwroot/finapp/server/.env` 写入：
```
PORT=5177
NODE_ENV=production
# DeepSeek/LLM API Key（必须）
DEEPSEEK_API_KEY=sk-xxxxxxxx
# SQLite 文件（相对 server 目录）
DATABASE_URL="file:./data/app.sqlite"
# 允许的跨域来源（逗号分隔）——本部署统一使用同一地址
ALLOWED_ORIGINS=http://118.25.141.83:5177
```
4) 首次启动后端（PM2 常驻）
```bash
cd /www/wwwroot/finapp
pm2 start --name finapp-server pnpm -- -C server start
pm2 save
pm2 startup   # 根据提示执行，保证重启自启
```
5) 验证健康检查
```bash
curl -fsS http://127.0.0.1:5177/health
```

### 方式 B：本地构建后上传
1) 本地执行
```bash
pnpm install
pnpm build
pnpm -C server install
pnpm -C server build
```
2) 上传以下到服务器：
- 上传本地 `dist/` → `/www/wwwroot/finapp/dist/`
- 上传 `server/dist/`、`server/package.json`、`server/pnpm-lock.yaml` → `/www/wwwroot/finapp/server/`
- 在 `/www/wwwroot/finapp/server/` 新建：
  - `.env`（同上）
  - `data/`（空目录或放置迁移后的 `app.sqlite`）
3) 启动后端同方式 A 第 4 步

## Nginx 站点配置（宝塔面板 → 网站 → 设置 → 配置文件）
将站点根指向 `/www/wwwroot/finapp/dist`，并添加如下反向代理及 SPA 回退：
```nginx
server {
  listen 80;
  server_name 118.25.141.83;
  root /www/wwwroot/finapp/dist;

    # 前端静态：单页应用回退
    location / {
        try_files $uri $uri/ /index.html;
    }

    # 反向代理后端 API
    location /api/ {
      proxy_pass http://127.0.0.1:5177/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 60s;
    }

    # 上传图片（OCR）等，适当放大
    client_max_body_size 10m;

    # 可选：基础安全响应头（按需收紧）
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options SAMEORIGIN;
    add_header Referrer-Policy strict-origin-when-cross-origin;
}
```
- HTTPS：在宝塔为站点申请证书并强制 https（常规操作，此处略）

## 快速验收清单
```bash
# 后端健康检查（本机）
curl -fsS http://127.0.0.1:5177/health

# 通过同一地址验证 API 与静态
curl -fsS http://118.25.141.83:5177/health
curl -fsS http://118.25.141.83:5177/ | head -c 200
```
浏览器打开 https://your-domain.com：
- 首页能看到“消费趋势”图表、底部 Tab（移动视图）
- 进入“智能记账/消费分析/财务规划/理财产品/客服”，底部 Tab 正常显示
- 非主导航页（如“添加交易”弹窗页/产品详情）底部 Tab 不显示

## 运行与维护
- 查看日志：`pm2 logs finapp-server --lines 200`
- 重启后端：`pm2 restart finapp-server`
- 更新代码后：
```bash
cd /www/wwwroot/finapp
pnpm -C server build && pm2 restart finapp-server
pnpm build && # 如有前端改动，替换 dist/ 并重载 Nginx（一般无需重启）
```
- SQLite 备份（建议每日定时）：
```bash
cd /www/wwwroot/finapp/server
mkdir -p backups
cp -f data/app.sqlite backups/app-$(date +%F-%H%M).sqlite
find backups -type f -mtime +7 -delete   # 清理7天前备份
```

## 常见问题

- Prisma 客户端/运行时报错（MODULE_NOT_FOUND 或 "Named export 'PrismaClient' not found"）：

  解决步骤（任选其一）：

  - 使用 pnpm（推荐）：

    ```bash
    cd /www/wwwroot/finapp/server
    pnpm config set ignore-scripts false
    pnpm install --include=dev   # 安装含 dev 依赖以便生成客户端
    pnpm prisma:generate         # 或 pnpm rebuild @prisma/client
    pm2 restart finapp-server
    ```

  - 使用 npm：

    ```bash
    cd /www/wwwroot/finapp/server
    npm ci                        # 不要加 --omit=dev，确保安装 prisma CLI
    npx prisma generate
    pm2 restart finapp-server
    ```

  备注：本项目已在 `server/package.json` 配置 `postinstall: prisma generate`，若面板安装过程禁用了 install scripts，请手工执行上面的 generate。

  另建议将后端 Node 版本切换为 LTS（Node 20/22）。
- 访问 `/api/*` 返回 502：
  - 确认 `pm2 ls` 中 `finapp-server` 进程为 online，`curl 127.0.0.1:5177/health` 成功
  - 确认 Nginx `location /api/` 的 `proxy_pass` 指向正确
- 前端首次加载白屏/404：
  - 确认 `location / { try_files ... /index.html; }` 已配置
  - 确认已上传 `dist/` 到 Nginx 根目录
- 图表不显示：
  - 已改为本地 `chart.js` 依赖，无需外部 CDN；请刷新缓存或清空浏览器缓存
- 审计上报 404：
  - 已在前端指向 `/api/v1/audit/batch`；若仍失败，请检查后端路由是否启用以及 Nginx 反代是否覆盖 `/api/`

---
如需我代为打包制品（仅上传 `dist/` 与 `server/dist/` 方案），请告知你的域名与期望目录，我可生成一份可直接上传的 zip 包清单。
