# 算小智记账系统 - 全面重构指令

## 指令概述

请作为高级全栈工程师，**一次性完成**算小智记账系统的全面重构工作。本指令要求你独立完成所有重构任务、测试流程，并提供详细的执行报告。

---

## 一、重构目标

### 1.1 核心目标
将当前单一前端应用重构为**双模式架构**：
- **主模式（C端）**：手机端APP内置浏览器型服务功能
  - 支持用户本人完全访问权限（读写）
  - 支持家庭授权人只读访问权限
- **副模式（B端）**：面向B端用户的服务器后台管理中心
  - 支持超级管理员、运营人员、查看人员三级权限

### 1.2 重构原则
1. 严格遵循 `docs/重构流程图/` 目录下所有文档的设计规范
2. 保持现有功能完整性，确保业务逻辑不变
3. 提升代码可维护性和可扩展性
4. 确保所有测试通过

---

## 二、必读文档清单

在开始重构前，**必须完整阅读**以下文档：

```
docs/重构流程图/
├── 项目全量梳理与重构基线.md    # 核心重构规范（必读）
├── 01-系统整体架构流程图.md      # 架构设计参考
├── 02-核心业务流程图.md          # 业务流程参考
├── 03-数据模型与数据库架构.md    # 数据模型参考
├── 04-安全防护体系流程图.md      # 安全设计参考
├── 05-双模式架构重构方案.md      # 双模式架构核心
├── 06-用户交互与界面设计流程图.md # 交互设计参考
├── 07-重构实施路径与任务分解.md  # 实施路径参考
└── README.md                     # 文档索引
```

---

## 三、重构任务清单

### 阶段一：基础架构调整

#### 任务1.1：建立领域目录结构
```
src/
├── domains/                    # 领域模块目录
│   ├── auth/                   # 认证领域
│   │   ├── components/         # 认证相关组件
│   │   ├── hooks/              # 认证相关hooks
│   │   ├── api/                # 认证API
│   │   └── types/              # 认证类型定义
│   ├── ledger/                 # 账本领域
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── api/
│   │   └── types/
│   ├── analysis/               # 分析领域
│   ├── assistant/              # AI助手领域
│   ├── products/               # 产品领域
│   ├── incentives/             # 激励领域
│   └── family/                 # 家庭领域
├── shared/                     # 共享模块
│   ├── components/             # 共享组件
│   ├── hooks/                  # 共享hooks
│   ├── utils/                  # 工具函数
│   ├── types/                  # 共享类型
│   └── constants/              # 常量定义
└── admin/                      # B端管理后台
    ├── components/             # 管理后台组件
    ├── pages/                  # 管理后台页面
    ├── hooks/                  # 管理后台hooks
    └── api/                    # 管理后台API
```

#### 任务1.2：抽取共享模块
- 创建 `src/shared/errors/` 统一错误处理
- 创建 `src/shared/audit/` 审计模块
- 创建 `src/shared/config/` 配置管理
- 创建 `src/shared/types/` 类型定义

#### 任务1.3：统一API契约
- 使用Zod定义所有API的请求/响应Schema
- 生成前后端共享的类型定义
- 创建API契约测试

#### 任务1.4：配置管理分离
- 分离环境变量配置
- 创建配置验证机制
- 编写配置文档

### 阶段二：权限体系重构

#### 任务2.1：设计权限模型
```typescript
// 权限角色定义
enum UserRole {
  OWNER = 'owner',           // 用户本人
  FAMILY_MEMBER = 'family',  // 家庭授权人
  SUPER_ADMIN = 'super_admin', // 超级管理员
  OPERATOR = 'operator',     // 运营人员
  VIEWER = 'viewer'          // 查看人员
}

// 权限定义
enum Permission {
  // C端权限
  TRANSACTION_READ = 'transaction:read',
  TRANSACTION_WRITE = 'transaction:write',
  FAMILY_READ = 'family:read',
  
  // B端权限
  USER_MANAGE = 'user:manage',
  TRANSACTION_MANAGE = 'transaction:manage',
  PRODUCT_MANAGE = 'product:manage',
  SYSTEM_MANAGE = 'system:manage'
}
```

#### 任务2.2：实现角色管理
- 扩展Prisma Schema添加Role模型
- 创建用户-角色关联表
- 实现角色CRUD接口

#### 任务2.3：添加权限中间件
```typescript
// 后端权限中间件
const requirePermission = (permission: Permission) => {
  return async (req, res, next) => {
    const user = req.user;
    const hasPermission = await checkPermission(user, permission);
    if (!hasPermission) {
      return res.status(403).json({ error: 'Permission denied' });
    }
    next();
  };
};

// 前端权限守卫
const PermissionGuard = ({ permission, children }) => {
  const { hasPermission } = usePermissions();
  if (!hasPermission(permission)) {
    return <AccessDenied />;
  }
  return children;
};
```

#### 任务2.4：前端权限控制
- 实现路由守卫
- 创建权限指令/组件
- 实现菜单权限过滤

### 阶段三：双模式前端开发

#### 任务3.1：移动端适配优化
- 实现响应式布局（支持375px-428px）
- 优化触摸交互体验
- 实现手势操作（左滑删除、下拉刷新）
- 优化移动端性能

#### 任务3.2：B端后台开发
创建完整的管理后台：

**仪表盘页面**
- KPI卡片展示
- 趋势图表
- 实时数据监控

**用户管理页面**
- 用户列表（搜索、筛选、分页）
- 用户详情抽屉
- 用户画像展示
- 批量操作

**交易管理页面**
- 交易列表（高级筛选）
- 交易详情
- 异常处理
- 数据导出

**产品管理页面**
- 产品列表（卡片/列表视图）
- 产品配置
- 推荐设置

**系统管理页面**
- 配置管理
- 日志审计
- 权限管理

**报表中心**
- 标准报表
- 自定义报表

#### 任务3.3：路由分离配置
```typescript
// 移动端路由
const mobileRoutes = [
  { path: '/', component: Home },
  { path: '/accounting', component: Accounting },
  { path: '/analysis', component: Analysis },
  // ...
];

// B端管理路由
const adminRoutes = [
  { path: '/admin', component: AdminDashboard },
  { path: '/admin/users', component: UserManagement },
  { path: '/admin/transactions', component: TransactionManagement },
  // ...
];

// 路由配置
const routes = [
  { path: '/mobile/*', children: mobileRoutes },
  { path: '/admin/*', children: adminRoutes, auth: 'admin' }
];
```

#### 任务3.4：组件复用抽取
- 抽取通用UI组件库
- 创建组件文档
- 编写组件测试

### 阶段四：UI/UX实现

#### 任务4.1：实现颜色方案
```css
:root {
  /* 主色调 */
  --color-primary: #00C9A7;
  --color-bg-gradient-start: #F5F7FA;
  --color-bg-gradient-end: #FFFFFF;
  --color-card-bg: #FFFFFF;
  
  /* 功能色 */
  --color-success: #52C41A;
  --color-error: #FF4D4F;
  --color-warning: #FAAD14;
  
  /* 文字色 */
  --color-text-primary: #262626;
  --color-text-secondary: #595959;
  --color-text-tertiary: #8C8C8C;
  
  /* 间距 */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;
  
  /* 圆角 */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 20px;
  
  /* 阴影 */
  --shadow-card: 0 2px 8px rgba(0, 0, 0, 0.08);
  --shadow-modal: 0 4px 16px rgba(0, 0, 0, 0.12);
}
```

#### 任务4.2：实现核心组件
- 圆角卡片组件
- 底部Tab导航组件
- 悬浮按钮组件
- 交易列表项组件
- 分类图标网格组件
- 数据图表组件

#### 任务4.3：实现交互功能
- 左滑删除/编辑
- 下拉刷新
- 上拉加载更多
- 图表交互
- 手势识别

### 阶段五：后端API重构

#### 任务5.1：API路由重构
```
server/src/routes/
├── v1/                        # API版本控制
│   ├── mobile/                # 移动端API
│   │   ├── auth.ts
│   │   ├── transactions.ts
│   │   ├── analysis.ts
│   │   ├── family.ts
│   │   └── ai.ts
│   └── admin/                 # 管理端API
│       ├── users.ts
│       ├── transactions.ts
│       ├── products.ts
│       ├── reports.ts
│       └── system.ts
└── index.ts                   # 路由总入口
```

#### 任务5.2：API网关实现
```typescript
// API网关中间件
const apiGateway = (req, res, next) => {
  const path = req.path;
  
  // 移动端API
  if (path.startsWith('/api/v1/mobile')) {
    return mobileAuthMiddleware(req, res, next);
  }
  
  // 管理端API
  if (path.startsWith('/api/v1/admin')) {
    return adminAuthMiddleware(req, res, next);
  }
  
  next();
};
```

#### 任务5.3：数据同步服务
- 实现主从数据库连接
- 实现缓存层（Redis）
- 实现消息队列（异步同步）

### 阶段六：测试与验证

#### 任务6.1：单元测试
```bash
# 运行所有单元测试
pnpm test

# 测试覆盖率要求
- 语句覆盖率: >= 80%
- 分支覆盖率: >= 70%
- 函数覆盖率: >= 80%
- 行覆盖率: >= 80%
```

#### 任务6.2：集成测试
```bash
# 运行API集成测试
pnpm test:integration

# 测试内容
- 认证流程测试
- 交易CRUD测试
- AI接口测试
- 权限控制测试
```

#### 任务6.3：E2E测试
```bash
# 运行端到端测试
pnpm test:e2e

# 测试场景
- 用户登录注册流程
- 记账完整流程
- 家庭协作流程
- 管理后台操作流程
```

#### 任务6.4：性能测试
```bash
# 运行性能测试
pnpm test:perf

# 性能指标
- 首屏加载时间: < 3s
- API响应时间: < 500ms
- 页面切换时间: < 200ms
```

---

## 四、测试配置

### 4.1 DeepSeek API配置
```env
# 测试环境配置
DEEPSEEK_API_KEY=your_test_api_key
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat
```

### 4.2 测试用例
```typescript
// AI功能测试用例
describe('AI Assistant', () => {
  it('should respond to user query', async () => {
    const response = await aiService.chat('帮我分析本月消费');
    expect(response).toBeDefined();
    expect(response.content).toBeTruthy();
  });

  it('should classify transaction correctly', async () => {
    const result = await aiService.classify('午餐花了30元');
    expect(result.category).toBe('餐饮');
    expect(result.amount).toBe(30);
  });
});

// OCR功能测试用例
describe('OCR Service', () => {
  it('should extract text from image', async () => {
    const result = await ocrService.recognize(testImagePath);
    expect(result.text).toContain('金额');
    expect(result.confidence).toBeGreaterThan(0.8);
  });
});
```

### 4.3 自动化测试脚本
```bash
#!/bin/bash
# 自动化测试脚本

echo "=== 开始自动化测试 ==="

# 1. 代码检查
echo "1. 运行代码检查..."
pnpm lint
pnpm typecheck

# 2. 单元测试
echo "2. 运行单元测试..."
pnpm test --coverage

# 3. 集成测试
echo "3. 运行集成测试..."
pnpm test:integration

# 4. E2E测试
echo "4. 运行E2E测试..."
pnpm test:e2e

# 5. 构建测试
echo "5. 运行构建测试..."
pnpm build

# 6. 生成测试报告
echo "6. 生成测试报告..."
pnpm test:report

echo "=== 测试完成 ==="
```

---

## 五、执行要求

### 5.1 一次性执行
- **必须**一次性完成所有重构任务
- **不得**中途停止等待用户确认
- **不得**跳过任何任务步骤

### 5.2 代码规范
- 遵循现有代码风格
- 使用TypeScript严格模式
- 所有函数必须有类型注解
- 关键逻辑必须有注释说明

### 5.3 测试要求
- 所有新代码必须有对应测试
- 测试必须全部通过
- 覆盖率必须达标

### 5.4 文档要求
- 更新README.md
- 更新API文档
- 添加迁移指南

---

## 六、执行报告要求

完成重构后，**必须**提供以下报告：

### 6.1 重构内容报告
```
## 重构内容报告

### 1. 目录结构变更
- 新增目录列表
- 删除目录列表
- 移动文件列表

### 2. 代码变更统计
- 新增文件数
- 修改文件数
- 删除文件数
- 代码行数变化

### 3. 功能模块变更
- 新增功能列表
- 修改功能列表
- 删除功能列表

### 4. API变更
- 新增API列表
- 修改API列表
- 废弃API列表
```

### 6.2 测试结果报告
```
## 测试结果报告

### 1. 单元测试
- 测试用例总数
- 通过数量
- 失败数量
- 覆盖率统计

### 2. 集成测试
- 测试场景列表
- 通过/失败统计
- 性能指标

### 3. E2E测试
- 测试流程列表
- 通过/失败统计
- 截图/录像

### 4. 性能测试
- 首屏加载时间
- API响应时间
- 内存使用情况
```

### 6.3 问题与建议报告
```
## 问题与建议报告

### 1. 已知问题
- 问题描述
- 影响范围
- 解决方案建议

### 2. 潜在风险
- 风险描述
- 影响程度
- 缓解措施

### 3. 优化建议
- 性能优化建议
- 代码优化建议
- 架构优化建议

### 4. 后续工作
- 待完成功能
- 待优化项目
- 技术债务清单
```

### 6.4 部署指南
```
## 部署指南

### 1. 环境要求
- Node.js版本
- 数据库版本
- 其他依赖

### 2. 配置说明
- 环境变量列表
- 配置文件说明

### 3. 部署步骤
- 数据库迁移
- 依赖安装
- 构建命令
- 启动命令

### 4. 回滚方案
- 回滚步骤
- 数据备份
```

---

## 七、验收标准

### 7.1 功能验收
- [ ] 所有原有功能正常运行
- [ ] 双模式架构正确实现
- [ ] 权限控制正确实现
- [ ] UI/UX符合设计规范

### 7.2 质量验收
- [ ] 所有测试通过
- [ ] 代码覆盖率达标
- [ ] 无严重Bug
- [ ] 性能指标达标

### 7.3 文档验收
- [ ] API文档完整
- [ ] 部署文档完整
- [ ] 迁移指南完整
- [ ] 测试报告完整

---

## 八、开始执行

请立即开始执行重构工作，按照以下顺序：

1. **阅读文档** → 完整阅读所有重构文档
2. **阶段一** → 完成基础架构调整
3. **阶段二** → 完成权限体系重构
4. **阶段三** → 完成双模式前端开发
5. **阶段四** → 完成UI/UX实现
6. **阶段五** → 完成后端API重构
7. **阶段六** → 完成测试与验证
8. **生成报告** → 提供完整执行报告

**重要提醒**：
- 必须一次性完成所有任务
- 必须确保所有测试通过
- 必须提供完整执行报告
- 严格遵循文档规范

开始执行！
