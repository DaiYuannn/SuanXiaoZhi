# Smoke Tests (Backend API & DeepSeek Connectivity)

These scripts provide quick, independent connectivity and schema checks for:

* Your backend API (transactions, reminders, consumption summary)
* DeepSeek LLM (chat completions)

They run in Node (via tsx), do not depend on the browser, and can be integrated into CI.

## Files

* deepseek.test.ts: connectivity test against DeepSeek chat completions API
* backend-api.test.ts: smoke tests for core backend endpoints
* validator.ts: lightweight schemas using zod
* run.ts: orchestrator, prints per-test results and a final summary
* env.example: example environment file

## Setup

1. Copy `scripts/smoke/env.example` to `.env.smoke` in project root and fill values (do NOT commit secrets):

```env
SMOKE_API_BASE=https://api-dev.example.com
SMOKE_DEEPSEEK_BASE=https://api.deepseek.com/v1
SMOKE_DEEPSEEK_KEY=
SMOKE_TIMEOUT_MS=12000
SMOKE_MODEL=deepseek-chat
```

1. Install dev dependencies (already added to package.json): tsx, node-fetch, zod, dotenv

## Run

```sh
pnpm smoke
```

Exit code is 0 when all checks pass; non-zero when any test fails.

## Notes

* These scripts only perform minimal checks and should not modify real data (except optional transaction create test which can be disabled if needed).
* Sensitive keys must not be committed. Use `.env.smoke` locally or CI secret stores.
* Windows PowerShell one-liner (ephemeral) to run with a key without writing file:

```powershell
$env:SMOKE_DEEPSEEK_KEY="<your_key_here>"; pnpm smoke
```
