#!/bin/bash
# 算小智 v2.1 - Ubuntu 24.04 一键部署脚本
# 复制到服务器后执行: bash deploy-setup.sh

set -e
echo "=== 算小智 v2.1 服务器部署 ==="

# 1. 安装 Node.js 22
echo "[1/6] 安装 Node.js..."
if ! command -v node &>/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi
echo "Node $(node -v)"

# 2. 安装 pnpm
echo "[2/6] 安装 pnpm..."
if ! command -v pnpm &>/dev/null; then
  npm install -g pnpm
fi

# 3. 安装 PostgreSQL
echo "[3/6] 安装 PostgreSQL..."
if ! command -v psql &>/dev/null; then
  sudo apt-get install -y postgresql postgresql-contrib
  sudo systemctl enable postgresql
  sudo systemctl start postgresql
fi

# 4. 创建数据库用户和数据库
echo "[4/6] 配置数据库..."
sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='suanxiaozhi'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE ROLE suanxiaozhi WITH LOGIN PASSWORD 'suanxiaozhi123';"
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='suanxiaozhi'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE DATABASE suanxiaozhi OWNER suanxiaozhi;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE suanxiaozhi TO suanxiaozhi;"
sudo -u postgres psql -d suanxiaozhi -c "GRANT ALL ON SCHEMA public TO suanxiaozhi;"

# 5. 克隆项目
echo "[5/6] 克隆项目..."
if [ -d /home/ubuntu/suanxiaozhi ]; then
  cd /home/ubuntu/suanxiaozhi && git pull
else
  cd /home/ubuntu && git clone https://github.com/daiyuannn/suanxiaozhi.git suanxiaozhi
  cd /home/ubuntu/suanxiaozhi
fi

# 6. 安装依赖 + 迁移 + 构建
echo "[6/6] 安装依赖 + 构建..."
export PNPM_HOME="/home/ubuntu/.local/share/pnpm"
export PATH="$PNPM_HOME:$PATH"
pnpm config set approve-builds "cpu-features ssh2" 2>/dev/null || true
pnpm install
pnpm prisma generate --schema server/prisma/schema.prisma
DATABASE_URL="postgresql://suanxiaozhi:suanxiaozhi123@localhost:5432/suanxiaozhi?schema=public" \
  pnpm prisma migrate deploy --schema server/prisma/schema.prisma 2>/dev/null || \
  DATABASE_URL="postgresql://suanxiaozhi:suanxiaozhi123@localhost:5432/suanxiaozhi?schema=public" \
  pnpm prisma db push --schema server/prisma/schema.prisma
pnpm build

echo ""
echo "=== 部署完成 ==="
echo "启动命令: cd /home/ubuntu/suanxiaozhi && pnpm start"
echo "访问地址: http://43.137.41.6:3000"
echo "演示账号: demo_owner / demo123"
