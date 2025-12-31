# 部署与运维指南


## 环境准备

- Node.js 18+，pnpm 8+
- 可选：PM2（进程守护）与 Nginx（HTTPS/反向代理/静态缓存）
- DeepSeek API Key（如需 AI 能力）


## 环境变量

参考 `.env.example`：

```dotenv
PORT=5177
NODE_ENV=production
DATABASE_URL=file:./data/prod.db?connection_limit=1
ALLOWED_ORIGINS=https://yourdomain.com
DEEPSEEK_API_KEY=sk-***
```


## 构建与启动（PM2）

```powershell
pnpm -C server install
pnpm -C server build
pm2 start server/ecosystem.config.cjs
pm2 status
pm2 logs app-backend
```


## 健康检查

- HTTP: `GET /health` → `{ ok: true }`
- 前端路由：`/`、`/home` 等返回 200（SPA 回退）


## 数据库（SQLite）

- 推荐 WAL 模式（系统启动时已自动启用）。
- 数据文件路径由 `DATABASE_URL` 决定，示例放在 `server/data/prod.db`。
- 备份：

```powershell
pnpm -C server db:backup
```

将会在 `server/backups/` 生成带时间戳的副本。


## 安全基线

- CORS 白名单：通过 `ALLOWED_ORIGINS` 配置。
- Helmet：生产注入 CSP、Referrer-Policy。
- 限流：AI/上传/生成等重型接口有专用速率限制。


## 反向代理（Nginx 示意）

```nginx
server {
  listen 443 ssl;
  server_name yourdomain.com;
  # ssl_certificate ...; ssl_certificate_key ...;

  gzip on; gzip_types text/plain text/css application/json application/javascript;

  location / {
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_pass http://127.0.0.1:5177;
  }
}
```


## 故障与回滚

- 查看 PM2 日志：`pm2 logs app-backend`
- 查看结构化访问日志（含 requestId）：同上
- 回滚：保留上一个 dist 版本，切换后重启 PM2；数据库建议先备份再回滚
