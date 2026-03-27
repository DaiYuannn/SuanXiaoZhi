# 算小智双模式 API 文档（v1）

## 基础说明
- Base URL: /api/v1
- 鉴权头: x-user-id, x-role
- 移动端角色: owner, family
- 管理端角色: super_admin, operator, viewer

## Mobile API

### POST /api/v1/mobile/auth/login
请求体:
```json
{
  "username": "demo",
  "password": "demo"
}
```

响应体:
```json
{
  "ok": true,
  "token": "token-demo",
  "role": "owner"
}
```

### GET /api/v1/mobile/transactions
权限: transaction:read

### POST /api/v1/mobile/transactions
权限: transaction:write

### GET /api/v1/mobile/analysis
权限: transaction:read

### GET /api/v1/mobile/family
权限: family:read

### POST /api/v1/mobile/ai/chat
AI 对话接口（当前为占位实现）。

## Admin API

### GET /api/v1/admin/users
权限: user:manage

### POST /api/v1/admin/users
权限: user:manage

### GET /api/v1/admin/transactions
权限: transaction:manage

### GET /api/v1/admin/products
权限: product:manage

### GET /api/v1/admin/reports
权限: report:read

### GET /api/v1/admin/system
权限: system:manage

## 错误响应
```json
{
  "ok": false,
  "error": "permission-denied"
}
```

## 契约来源
- 前端共享契约: src/shared/contracts/api-contracts.ts
- 后端请求契约: server/src/contracts/api.ts