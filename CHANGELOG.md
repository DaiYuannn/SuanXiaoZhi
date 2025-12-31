# Changelog

本项目遵循语义化版本（SemVer）的基本习惯：`MAJOR.MINOR.PATCH`。

## Unreleased

- 

## 0.1.0 - 2025-12-31

- 初次公开发布：前端（Vite + React + TS）与后端（Express + Prisma + SQLite）一体化
- 支持本地联调：`pnpm dev:all`
- 支持生产部署：PM2 通过 `server/ecosystem.config.cjs` 托管进程
- 文档与脚本：`docs/`、`scripts/` 包含接口说明与冒烟用例
