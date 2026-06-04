# 算小智 2.1 Bug 修复说明

> 更新日期：2026-06-03

## 总览

本次修复涉及 7 个问题，全部在前端完成，其中 3 个同时需要后端配合（已说明）。

---

## 问题 1：理财推荐区不受筛选影响 / 顺序混乱

**文件：** `src/domains/products/pages/FinancialProductsPage.tsx`

**根因：** 推荐区（`recommended`）与筛选列表（`items`）是独立数据源，推荐结果未按 `score` 排序。

**修复：**
- 推荐结果加 `.sort((a, b) => b.score - a.score)` 降序排列
- 推荐区加副标题"基于你的风险画像智能匹配，与下方筛选条件独立"
- 筛选区加标题"全部产品（筛选结果）"并显示当前条数

**设计说明：** 推荐区与筛选区独立是正确的产品逻辑，两者应视觉上明显区分，不互相干扰。

---

## 问题 2：风险等级与预期收益筛选强制 AND 逻辑无提示

**文件：** `src/domains/products/pages/FinancialProductsPage.tsx`

**方案：** 方案 B——高级搜索折叠区 + 当前筛选标签提示

**修复：**
- 工具栏下方添加"高级搜索"折叠按钮，点击展开双维度筛选面板
- 当前生效的筛选条件以标签形式显示，点 `×` 单独清除
- 两个条件同时选中时显示提示文字："当前为 AND 逻辑，如需单独筛选请清除另一条件"
- 高级搜索关闭时工具栏仍保留原有快速筛选按钮组（向后兼容）

---

## 问题 3：首页总负债无负号

**文件：** `src/domains/home/pages/HomePage.tsx`

**根因：** 总负债金额 `¥25,320.00` 前端写死，未加负号，颜色与总资产相同。

**修复：** 改为 `-¥25,320.00`，颜色由 `text-text-primary` 改为 `text-danger`（红色）。

**注意：** 对接真实 API 后，后端应返回正数（负债的绝对值），前端渲染时统一加 `-` 前缀，**不要在数据库中存入负号**。

---

## 问题 4：我的规划方案编辑/删除无效

**文件：** `src/domains/analysis/pages/FinancialPlanningPage.tsx`

**根因：** `handleEditPlan` / `handleDeletePlan` 只有 `console.log`，未接 API。

**修复：**
- 导入 `fetchPlans` / `updatePlan` / `deletePlan`（端点已存在于 `endpoints.ts`）
- 页面加载时调用 `fetchPlans()` 拉取服务端规划列表，有服务端数据则优先展示，否则显示本地静态示例
- 编辑按钮打开弹窗（名称、目标描述、状态三个字段），保存调用 `PATCH /api/v1/plans/:planId`
- 删除按钮确认后调用 `DELETE /api/v1/plans/:planId`，成功后刷新列表

**后端接口（已存在）：**
```
GET    /api/v1/plans
PATCH  /api/v1/plans/:planId
DELETE /api/v1/plans/:planId
```

---

## 问题 5：账户管理添加/编辑/删除无效

**文件：** `src/domains/auth/pages/UserSettingsPage.tsx`

**根因：** 三个 handler 均为 `alert('功能开发中...')`，账户列表为硬编码 JSX。

**修复：**
- 导入 `fetchAccounts` / `createAccount` / `updateAccount` / `deleteAccount`
- 切换到"账户管理"标签时自动调用 `fetchAccounts()` 拉取真实账户列表
- 添加/编辑按钮打开统一弹窗（账户名、类型、余额），保存后刷新列表
- 删除按钮确认后调用 `DELETE`，成功后刷新

**后端接口（已存在）：**
```
GET    /api/v1/accounts
POST   /api/v1/accounts
PATCH  /api/v1/accounts/:accountId
DELETE /api/v1/accounts/:accountId
```

---

## 问题 6：规划页产品跳转同一界面

**文件：** `src/domains/analysis/pages/FinancialPlanningPage.tsx`

**根因：**
1. `handleViewInvestmentProduct` 跳转到 `/financial-products?productId=xxx`，但产品列表页不读取该参数，导致三个产品跳同一个列表
2. `handleViewSavingsDetail` 只有 `console.log`，无跳转

**修复：** 两个函数统一改为 `navigate('/product-detail?productId=${productId}')`，复用已有的产品详情页（含收益测算器）。

---

## 问题 7：家庭成员（孩子账户）无权限查看交易

**文件：** `src/domains/home/pages/HomePage.tsx`

**根因：**
- 首页"查看全部"跳 `/accounting`，该路由要求 `TRANSACTION_WRITE` 权限
- `FAMILY_MEMBER` 角色只有 `TRANSACTION_READ`，因此跳转后被拦截到 403

**修复：**
- 首页读取当前用户角色（`readStoredSession().role`）
- `FAMILY_MEMBER` 角色：跳只读的 `/consumption-analysis`
- 其他角色：保持原有跳 `/accounting`
- 大额预警"查看账单"按钮同步适配

**权限映射（现状）：**
| 角色 | TRANSACTION_READ | TRANSACTION_WRITE | FAMILY_READ |
|------|:---:|:---:|:---:|
| OWNER | ✅ | ✅ | ✅ |
| FAMILY_MEMBER | ✅ | ❌ | ✅ |

**后端侧仍需确认：** `GET /api/v1/transactions` 接口是否对 `FAMILY_MEMBER` token 正确返回 200（当前可能返回 401，导致家庭成员首页数据为空）。如有问题需后端在鉴权中间件放行 `TRANSACTION_READ` 角色的 GET 请求。

---

## 遗留问题（本次未处理）

| 编号 | 问题 | 原因 | 下一步 |
|------|------|------|--------|
| — | 老人端字体/简化模式 | 需产品设计 UI 方案 | 在设置中添加"无障碍模式"开关，统一放大字号 |
| — | 家庭组两账号首页交易数据不同 | 正常——各自显示自己的个人账本 | 如需显示共享账本，首页需角色判断后切换数据源 |
| — | 总负债/总资产未对接真实 API | 首页数据全部写死 | 待后端提供账户聚合接口后替换 |

---

## 修改文件清单

| 文件 | 改动类型 |
|------|---------|
| `src/domains/products/pages/FinancialProductsPage.tsx` | 推荐排序、高级搜索UI、区域标题 |
| `src/domains/home/pages/HomePage.tsx` | 负债负号、角色感知路由 |
| `src/domains/analysis/pages/FinancialPlanningPage.tsx` | 规划列表API对接、编辑弹窗、产品路由修复 |
| `src/domains/auth/pages/UserSettingsPage.tsx` | 账户管理API对接、添加/编辑弹窗 |
