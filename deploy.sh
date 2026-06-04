#!/bin/bash
set -e

# ============================================================
# 算小智生产部署脚本
# 用法: chmod +x deploy.sh && ./deploy.sh
# ============================================================

export PATH="$HOME/.npm-global/bin:$PATH"

APP_DIR="/opt/SuanXiaoZhi"
APP_NAME="suanxiaozhi"

echo "=========================================="
echo "  算小智部署脚本"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "=========================================="

cd "$APP_DIR"

# ---- 1. 拉取最新代码 ----
echo ""
echo "=== [1/7] Git pull ==="
git pull 2>&1

# ---- 2. Approve builds ----
echo ""
echo "=== [2/7] Approve builds ==="
echo "y" | pnpm approve-builds 2>&1 || true

# ---- 3. 安装依赖 ----
echo ""
echo "=== [3/7] Install dependencies ==="
pnpm install 2>&1

# ---- 4. 数据库迁移 ----
echo ""
echo "=== [4/7] Prisma migrate deploy ==="
npx prisma migrate deploy --schema server/prisma/schema.prisma 2>&1

# ---- 5. 生成 Prisma Client ----
echo ""
echo "=== [5/7] Prisma generate ==="
npx prisma generate --schema server/prisma/schema.prisma 2>&1

# ---- 6. 构建 ----
echo ""
echo "=== [6/7] Build ==="
pnpm build 2>&1

# ---- 验证构建产物 ----
if [ -f dist/index.html ]; then
    echo "BUILD_SUCCESS: dist/index.html OK"
else
    echo "BUILD_FAILED: dist/index.html not found!"
    exit 1
fi

# ---- 7. PM2 重启 ----
echo ""
echo "=== [7/7] PM2 restart ==="

# 检查是否已有该进程
if pm2 list | grep -q "$APP_NAME"; then
    echo "Restarting existing $APP_NAME..."
    pm2 restart "$APP_NAME"
else
    echo "Starting new $APP_NAME..."
    pm2 start "pnpm start" --name "$APP_NAME" --cwd "$APP_DIR"
fi

pm2 save

echo ""
echo "=========================================="
echo "  部署完成！"
echo "=========================================="
pm2 ls

# 健康检查
echo ""
echo "=== Health check ==="
sleep 2
curl -s http://127.0.0.1:3000/health || echo "Health check failed (server may still be starting)"
