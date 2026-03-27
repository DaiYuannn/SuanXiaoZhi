#!/usr/bin/env bash

set -euo pipefail

echo "=== start automated tests ==="

echo "1) lint"
pnpm lint

echo "2) typecheck"
pnpm typecheck

echo "3) unit"
pnpm test

echo "4) integration"
pnpm test:integration

echo "5) e2e"
pnpm test:e2e

echo "6) perf"
pnpm test:perf

echo "7) build"
pnpm build

echo "8) report"
pnpm test:report

echo "=== done ==="