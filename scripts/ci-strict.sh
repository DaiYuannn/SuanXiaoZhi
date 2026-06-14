#!/usr/bin/env bash
set -Eeuo pipefail

export NODE_ENV=test
export DISABLE_RATE_LIMIT_IN_TESTS=true
export COVERAGE_STRICT=false
export DATABASE_URL="postgresql://postgres:123456@localhost:5432/suanxiaozhi?schema=public"


SCHEMA="server/prisma/schema.prisma"

echo "=========================================="
echo "  算小智 strict CI"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "=========================================="

echo ""
echo "[0/8] Check Node version"
node -e "const major=Number(process.versions.node.split('.')[0]); if (![20,22].includes(major)) { console.error('Strict CI requires Node 20 or Node 22, current=' + process.version); process.exit(1); } console.log('Node OK:', process.version);"

echo ""
echo "[1/8] Check Docker PostgreSQL"
docker rm -f suan-db 2>/dev/null || true
docker run -d \
  --name suan-db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=123456 \
  -e POSTGRES_DB=suanxiaozhi \
  -p 5432:5432 \
  postgres:15

for i in {1..30}; do
  if docker exec suan-db pg_isready -U postgres -d suanxiaozhi >/dev/null 2>&1; then
    echo "PostgreSQL is ready"
    break
  fi
  sleep 1
  if [ "$i" = "30" ]; then
    echo "PostgreSQL did not become ready in time"
    exit 1
  fi
done

docker exec suan-db psql -U postgres -d suanxiaozhi -c "SELECT 1 as test;"

echo ""
echo "[2/8] Install dependencies"
pnpm install

echo ""
echo "[3/8] Generate Prisma Client"
pnpm prisma generate --schema "$SCHEMA"

echo ""
echo "[4/8] Push Prisma schema"
pnpm prisma db push --schema "$SCHEMA"

echo ""
echo "[5/8] Seed database"
pnpm seed

echo ""
echo "[6/8] Run tests"
pnpm test:runtime
pnpm test:ci
pnpm test:e2e
pnpm test:perf

echo ""
echo "[7/8] Build"
pnpm build

echo ""
echo "[8/8] Check artifacts"
test -f coverage/index.html
test -f dist/index.html

mkdir -p ci_artifacts
cat > ci_artifacts/strict-ci-summary.txt <<EOF_SUMMARY
=== 算小智 2.1 Strict CI Summary ===
Time: $(date '+%Y-%m-%d %H:%M:%S')
Node: $(node -v)
pnpm: $(pnpm -v)
Docker PostgreSQL: suan-db postgres:15
Prisma: db push completed
Seed: completed
frontend-runtime: passed
tests: completed
e2e: passed
perf: passed
build: passed
coverage/index.html: exists
dist/index.html: exists
EOF_SUMMARY

tar -czf "ci_artifacts/suanxiaozhi-2.1-strict-ci-results.tar.gz" coverage/ dist/ ci_artifacts/strict-ci-summary.txt

echo "=========================================="
echo "  Strict CI passed"
echo "  Artifact: ci_artifacts/suanxiaozhi-2.1-strict-ci-results.tar.gz"
echo "=========================================="
