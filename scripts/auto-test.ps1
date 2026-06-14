Write-Output "=== start automated tests ==="

Write-Output "1) lint"
pnpm lint

Write-Output "2) typecheck"
pnpm typecheck

Write-Output "3) unit"
pnpm test

Write-Output "4) integration"
pnpm test:integration

Write-Output "5) e2e"
pnpm test:e2e

Write-Output "6) perf"
pnpm test:perf

Write-Output "7) build"
pnpm build

Write-Output "8) report"
pnpm test:report

Write-Output "=== done ==="