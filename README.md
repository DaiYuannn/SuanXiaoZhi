# 算小智记账系统 - 双模式重构基线工程

## 概述
本工程按照 docs/重构流程图 下的重构规范，建立了双模式架构的可运行基础实现：
- C端（mobile）业务路由和权限控制
- B端（admin）管理路由和权限控制
- 共享契约层（Zod）与配置校验
- 审计、错误处理、API网关中间件
- 单元/集成/E2E/性能测试骨架

## 快速开始
1. 安装依赖：
```bash
pnpm install
```
2. 启动服务：
```bash
pnpm start
```
3. 运行测试：
```bash
pnpm test
pnpm test:integration
pnpm test:e2e
pnpm test:perf
```

## 目录
- src/: 前端双模式领域结构和共享模块
- src/migration/pages/: 从 app/src/pages 迁移的旧版页面源码基线（待逐步组件化改造）
- server/: 后端 v1 mobile/admin 路由与权限中间件
- tests/: 契约、集成、E2E、性能测试
- docs/: 重构流程、迁移指南、API文档与执行报告

## 说明
当前仓库初始状态仅包含重构文档，本次提交已补齐可执行代码骨架和验证链路。