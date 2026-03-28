# 算小智 全链路缺陷报告（2026-03-28）

## 1. 排查范围
- 启动链路：`npm run dev`、前后端联动
- 路由链路：入口、登录、角色识别、守卫、默认跳转
- 身份权限：前端会话解析、后端鉴权中间件、RBAC 生效
- 界面显示：B/C 双端外壳与关键导航可见性

> 结论：当前存在 **3 个 P0、5 个 P1、3 个 P2**，其中 P0/P1 会直接导致你提到的“直接进入手机端/身份分流错误/路径跳转异常”。

---

## 2. 缺陷清单（按严重级别）

## P0（必须立即修）

### P0-1 未登录可直接进入 C 端首页（登录绕过）
- 位置：
  - [src/router/index.tsx](src/router/index.tsx#L67)
  - [src/router/index.tsx](src/router/index.tsx#L69)
  - [src/router/index.tsx](src/router/index.tsx#L72)
- 现象：未设置任何登录态时，`resolveSessionUser` 默认返回 `owner/demo`，直接通过多数路由。
- 影响：用户无需登录即可进入业务页面，身份入口失效。
- 复现：清空本地存储后打开 `/`，直接进入首页。
- 修复建议：
  1. `resolveSessionUser` 无 token 时返回 `null`。
  2. `renderRouteElement` 对非 `/login` `/register` 的路由统一重定向 `/login`。
  3. 仅在 token 有效且解析出用户角色后才放行。

### P0-2 登录页未接入真实登录链路，未写入会话
- 位置：
  - [src/domains/auth/pages/LoginPage.tsx](src/domains/auth/pages/LoginPage.tsx#L173)
  - [src/domains/auth/pages/LoginPage.tsx](src/domains/auth/pages/LoginPage.tsx#L175)
- 现象：登录按钮仅 `setTimeout` 后 `navigate('/home')`，没有调用登录 API，也没有写入 token/role/userId。
- 影响：身份识别分流不成立，刷新后状态错乱。
- 复现：任意输入满足前端校验即可“登录成功”。
- 修复建议：
  1. 调用 `/api/v1/mobile/auth/login`。
  2. 成功后写入 `AUTH_TOKEN_KEY`、`sx-role`、`sx-user-id`（键名统一见 P1-1）。
  3. 按 role 定向：C 端到 `/`，B 端到 `/admin`。

### P0-3 后端鉴权可伪造（仅信任请求头）
- 位置：
  - [server/src/middlewares/auth.ts](server/src/middlewares/auth.ts#L20)
  - [server/src/middlewares/auth.ts](server/src/middlewares/auth.ts#L23)
  - [server/src/middlewares/auth.ts](server/src/middlewares/auth.ts#L29)
  - [server/src/services/user-context.ts](server/src/services/user-context.ts#L10)
  - [server/src/services/user-context.ts](server/src/services/user-context.ts#L24)
- 现象：角色来自 `x-role` 头；用户不存在时自动 upsert 创建。
- 影响：可伪造身份直接拿到高权限，存在严重安全风险。
- 复现：请求带 `x-role: super_admin` 访问 admin API。
- 修复建议：
  1. 全部 API 使用 Bearer token 验签。
  2. 禁止通过请求头直传 role。
  3. 删除 `resolveRequestUser` 的自动创建逻辑，改为严格 401/403。

---

## P1（高优先级）

### P1-1 token 键名不一致，登出/鉴权链路断裂
- 位置：
  - [src/shared/config/env.ts](src/shared/config/env.ts#L32)
  - [src/shared/components/layouts/AdminLayout.tsx](src/shared/components/layouts/AdminLayout.tsx#L27)
- 现象：HTTP 客户端读取 `auth_token`，登出删除的是 `sx-token`。
- 影响：出现“看似登出但 token 仍在”或“已登录但请求不带 token”。
- 修复建议：统一为一套键（建议 `auth_token` + `sx-role` + `sx-user-id`）。

### P1-2 Admin 菜单未按权限过滤，点击后被踢到登录页
- 位置：
  - [src/shared/components/layouts/AdminLayout.tsx](src/shared/components/layouts/AdminLayout.tsx#L18)
  - [src/shared/components/layouts/AdminLayout.tsx](src/shared/components/layouts/AdminLayout.tsx#L47)
  - [src/router/index.tsx](src/router/index.tsx#L85)
- 现象：OPERATOR/VIEWER 仍看到无权限菜单，点击后路由守卫重定向 `/login`。
- 影响：后台体验混乱，误导为“会话失效”。
- 修复建议：在菜单层提前按 `hasPermission` 过滤；无权限页返回 403 页面而不是 `/login`。

### P1-3 兜底路由将未知路径强制跳到 `/`，放大未登录绕过
- 位置：
  - [src/router/index.tsx](src/router/index.tsx#L120)
- 现象：未知路径永远回首页。
- 影响：未登录时更容易落入 C 端首页。
- 修复建议：未登录跳 `/login`，已登录才按角色跳各自默认首页。

### P1-4 C 端底部 Tab 可见性规则与路由不一致
- 位置：
  - [src/shared/components/layouts/MobileLayout.tsx](src/shared/components/layouts/MobileLayout.tsx#L21)
  - [src/shared/components/MobileTabBar.tsx](src/shared/components/MobileTabBar.tsx#L9)
  - [src/router/routes.ts](src/router/routes.ts#L28)
  - [src/router/routes.ts](src/router/routes.ts#L37)
- 现象：Tab 包含 `/customer-service`，但 `showTabPaths` 未包含该路径；`/settings` 与 `/user-settings` 混用。
- 影响：进入某些页面后 Tab 消失或选中态异常。
- 修复建议：统一使用单一路径常量源（同一份 route config 派生 Tab 和 showTabPaths）。

### P1-5 登录 API 封装存在“失败也返回成功”逻辑
- 位置：
  - [src/domains/auth/api/auth-api.ts](src/domains/auth/api/auth-api.ts#L23)
  - [src/domains/auth/api/auth-api.ts](src/domains/auth/api/auth-api.ts#L24)
- 现象：catch 分支返回 `ok: true` 且默认 owner。
- 影响：后端错误/网络错误时仍放行登录。
- 修复建议：catch 应返回 `ok: false` 并透出错误。

---

## P2（中优先级）

### P2-1 路由模块动态导入写法触发 Vite 分析警告
- 位置：
  - [src/main.ts](src/main.ts#L30)
- 现象：`import(routerModulePath)` 会警告“cannot be analyzed”。
- 影响：开发告警噪音，影响问题定位效率。
- 修复建议：改为静态 `import('./router/index.js')`。

### P2-2 身份链路存在重复实现且未收敛
- 位置：
  - [src/domains/auth/pages/login-page.ts](src/domains/auth/pages/login-page.ts#L8)
  - [src/domains/auth/pages/LoginPage.tsx](src/domains/auth/pages/LoginPage.tsx)
- 现象：存在可调用登录封装，但页面未使用，形成“死代码 + 假登录页面”。
- 影响：后续维护容易误接错误链路。
- 修复建议：保留一套登录入口，删除未使用实现。

### P2-3 启动失败表象与真实状态不一致（操作层问题）
- 现象：你看到 `npm run dev exit 1`，但本次复现实测可正常启动（server 3000 + web 5173）。
- 影响：容易将“被中断/超时”误判为启动失败。
- 修复建议：
  1. 固定用一个终端前台运行 `npm run dev`。
  2. 另开终端看日志，不在运行终端重复触发命令。

---

## 3. 路径跳转专项结论

### 当前实际跳转链（存在问题）
1. 未登录访问 `/`：直接进入 C 端首页（错误）
2. 登录页点击登录：前端等待 1.5s 后跳 `/home`（错误，未鉴权）
3. Admin 无权限点击菜单：被重定向到 `/login`（不合理，应该 403）

### 目标正确链（建议）
1. 未登录访问任意业务页：统一跳 `/login`
2. 登录成功后：
   - `owner/family` -> `/`
   - `super_admin/operator/viewer` -> `/admin`
3. 已登录访问未知路径：按角色回默认首页
4. 已登录访问无权限页面：进入 `/403`（不清除会话）

---

## 4. 界面显示专项结论
- C 端：移动画布方向已建立，但导航可见性和路由别名仍有不一致（P1-4）。
- B 端：视觉已重构，但权限菜单未过滤导致体验断层（P1-2）。

---

## 5. 验证记录
- 类型检查：`pnpm run typecheck` 通过
- 开发启动：`npm run dev` 实测可拉起（server:3000, web:5173）

---

## 6. 一次性修复验收标准（供下一轮实施）
1. 清空 localStorage 后访问 `/` 必须到 `/login`
2. 登录后本地存储存在统一键名的 token/role/userId
3. OWNER 登录访问 `/admin` 返回 403 或跳 C 端首页（不出现无限跳转）
4. OPERATOR 登录后台菜单仅显示有权限项
5. `/customer-service`、`/settings` 等页面 Tab 显示与选中一致
6. Vite 控制台无动态导入警告

---

## 7. 处理优先顺序
1. P0-1 / P0-2 / P0-3
2. P1-1 / P1-2 / P1-4
3. P1-3 / P1-5 / P2-*