import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "postgresql://suanxiaozhi:suanxiaozhi123@localhost:5432/suanxiaozhi?schema=public";
}

export const prisma = new PrismaClient();

type DemoAccount = {
  username: string;
  password: string;
  role: "owner" | "family" | "super_admin" | "operator" | "viewer";
};

const demoAccounts: DemoAccount[] = [
  { username: "demo", password: "demo", role: "owner" },
  { username: "demo_owner", password: "demo123", role: "owner" },
  { username: "demo_family", password: "demo123", role: "family" },
  { username: "demo_admin", password: "demo123", role: "super_admin" },
  { username: "demo_operator", password: "demo123", role: "operator" },
  { username: "demo_viewer", password: "demo123", role: "viewer" },
  // Extra test users for cross-family testing
  { username: "test_owner2", password: "test123", role: "owner" },
  { username: "test_family2", password: "test123", role: "family" },
];

export const ensureDemoAccounts = async (): Promise<Record<string, string>> => {
  // --- Roles ---
  const roleRows = [
    { code: "owner", name: "用户本人" },
    { code: "family", name: "家庭授权人" },
    { code: "super_admin", name: "超级管理员" },
    { code: "operator", name: "运营人员" },
    { code: "viewer", name: "查看人员" },
  ] as const;

  for (const role of roleRows) {
    await prisma.role.upsert({
      where: { code: role.code },
      update: {},
      create: role,
    });
  }

  const roleMap = new Map<string, string>();
  const dbRoles = await prisma.role.findMany({});
  dbRoles.forEach((role) => roleMap.set(role.code, role.id));

  // --- Users ---
  const idMap: Record<string, string> = {};

  for (const account of demoAccounts) {
    const passwordHash = await bcrypt.hash(account.password, 10);
    const user = await prisma.user.upsert({
      where: { username: account.username },
      update: { passwordHash, role: account.role, isActive: true },
      create: {
        username: account.username,
        passwordHash,
        role: account.role,
        isActive: true,
      },
    });
    idMap[account.username] = user.id;

    const roleId = roleMap.get(account.role);
    if (roleId) {
      await prisma.userRole.upsert({
        where: { userId_roleId: { userId: user.id, roleId } },
        update: {},
        create: { userId: user.id, roleId },
      });
    }
  }

  // --- Seed profile data for demo_owner ---
  if (idMap.demo_owner) {
    await prisma.user.update({
      where: { id: idMap.demo_owner },
      data: {
        email: "zhang.san@example.com",
        phone: "13812348888",
        gender: "male",
        address: "北京市朝阳区金融街88号"
      }
    }).catch(() => undefined); // ignore if fields don't exist yet
  }

  // --- Family 1: Demo Family (owner + family member) ---
  const ownerId = idMap.demo_owner;
  const familyUserId = idMap.demo_family;

  if (ownerId && familyUserId) {
    let family = await prisma.family.findFirst({ where: { name: "演示家庭" } });
    if (!family) {
      family = await prisma.family.create({
        data: { name: "演示家庭", description: "户主与家庭成员联动演示" },
      });
    }

    await prisma.user.update({ where: { id: ownerId }, data: { familyId: family.id } });
    await prisma.user.update({ where: { id: familyUserId }, data: { familyId: family.id } });

    // Owner personal ledger
    await prisma.ledger.upsert({
      where: { id: `ledger-owner-${ownerId}` },
      update: {},
      create: {
        id: `ledger-owner-${ownerId}`,
        name: "户主主账户",
        type: "PERSONAL",
        ownerId,
        currency: "CNY",
        balanceCent: 20000000, // ¥200,000
      },
    });

    // Family member personal ledger
    await prisma.ledger.upsert({
      where: { id: `ledger-family-${familyUserId}` },
      update: {},
      create: {
        id: `ledger-family-${familyUserId}`,
        name: "家庭成员账户",
        type: "PERSONAL",
        ownerId: familyUserId,
        currency: "CNY",
        balanceCent: 5000000, // ¥50,000
      },
    });

    // Shared family ledger
    await prisma.ledger.upsert({
      where: { id: `ledger-shared-${family.id}` },
      update: {},
      create: {
        id: `ledger-shared-${family.id}`,
        name: "家庭共享账本",
        type: "FAMILY",
        familyId: family.id,
        ownerId,
        currency: "CNY",
        balanceCent: 8000000, // ¥80,000
      },
    });
  }

  // --- Family 2: Test Family (for cross-family isolation testing) ---
  const owner2Id = idMap.test_owner2;
  const family2UserId = idMap.test_family2;

  if (owner2Id && family2UserId) {
    let family2 = await prisma.family.findFirst({ where: { name: "测试家庭" } });
    if (!family2) {
      family2 = await prisma.family.create({
        data: { name: "测试家庭", description: "用于跨家庭隔离测试" },
      });
    }

    await prisma.user.update({ where: { id: owner2Id }, data: { familyId: family2.id } });
    await prisma.user.update({ where: { id: family2UserId }, data: { familyId: family2.id } });

    await prisma.ledger.upsert({
      where: { id: `ledger-owner-${owner2Id}` },
      update: {},
      create: {
        id: `ledger-owner-${owner2Id}`,
        name: "测试户主账户",
        type: "PERSONAL",
        ownerId: owner2Id,
        currency: "CNY",
        balanceCent: 10000000,
      },
    });

    await prisma.ledger.upsert({
      where: { id: `ledger-family-${family2UserId}` },
      update: {},
      create: {
        id: `ledger-family-${family2UserId}`,
        name: "测试家庭成员账户",
        type: "PERSONAL",
        ownerId: family2UserId,
        currency: "CNY",
        balanceCent: 3000000,
      },
    });
  }

  return idMap;
};

export const ensureDemoUser = async (): Promise<string> => {
  const idMap = await ensureDemoAccounts();
  return idMap.demo ?? idMap.demo_owner;
};

export const initDB = async (): Promise<void> => {
  // --- Core seed data ---
  const idMap = await ensureDemoAccounts();

  // --- Tasks (6) ---
  const tasks = [
    { code: "DAILY_LOGIN", name: "每日登录", description: "每天登录应用", points: 10, type: "DAILY", target: 1 },
    { code: "ADD_TRANSACTION", name: "每日记账", description: "每天记录至少一笔交易", points: 20, type: "DAILY", target: 1 },
    { code: "WEEKLY_REVIEW", name: "每周复盘", description: "查看一次周报", points: 50, type: "WEEKLY", target: 1 },
    { code: "SET_BUDGET", name: "设置预算", description: "首次设置月度预算", points: 100, type: "ONE_TIME", target: 1 },
    { code: "MONTHLY_SAVING", name: "月度储蓄挑战", description: "当月储蓄率达到20%", points: 80, type: "MONTHLY", target: 1 },
    { code: "INVITE_FAMILY", name: "邀请家人", description: "邀请一位家庭成员加入", points: 150, type: "ONE_TIME", target: 1 },
  ] as const;

  for (const task of tasks) {
    await prisma.task.upsert({
      where: { code: task.code },
      update: {},
      create: task,
    });
  }

  // --- Achievements (5) ---
  const achievements = [
    { code: "FIRST_STEP", name: "记账第一步", description: "完成第1笔手动记账", icon: "fa-flag" },
    { code: "SAVING_MASTER", name: "省钱达人", description: "月度储蓄率超过30%", icon: "fa-piggy-bank" },
    { code: "STREAK_7", name: "坚持就是胜利", description: "连续记账7天", icon: "fa-fire" },
    { code: "STREAK_30", name: "记账月神", description: "连续记账30天", icon: "fa-calendar-check" },
    { code: "CENTURY", name: "百笔达人", description: "累计完成100笔交易", icon: "fa-trophy" },
  ] as const;

  for (const achievement of achievements) {
    await prisma.achievement.upsert({
      where: { code: achievement.code },
      update: {},
      create: achievement,
    });
  }

  // --- Products (6) ---
  const products = [
    { productCode: "P001", name: "稳健理财A", riskLevel: "LOW", expectedYield: 2.8, termDays: 90, description: "低风险稳健组合，适合保守型投资者" },
    { productCode: "P002", name: "平衡理财B", riskLevel: "MID", expectedYield: 3.6, termDays: 180, description: "收益与风险均衡，适合稳健型投资者" },
    { productCode: "P003", name: "进取理财C", riskLevel: "HIGH", expectedYield: 5.2, termDays: 365, description: "高风险高波动产品，适合进取型投资者" },
    { productCode: "P004", name: "养老储蓄计划D", riskLevel: "LOW", expectedYield: 3.1, termDays: 365, description: "专为养老设计的长期储蓄产品" },
    { productCode: "P005", name: "子女教育金E", riskLevel: "MID", expectedYield: 4.0, termDays: 730, description: "中长期教育储蓄计划" },
    { productCode: "P006", name: "短期灵活理财F", riskLevel: "LOW", expectedYield: 1.8, termDays: 30, description: "短期灵活存取（已下架）", isActive: false },
  ] as const;

  for (const product of products) {
    await prisma.product.upsert({
      where: { productCode: product.productCode },
      update: {},
      create: product,
    });
  }

  // --- Categories (14) ---
  const categories = [
    { name: "餐饮", icon: "fa-utensils", color: "#F97316", type: "EXPENSE" },
    { name: "购物", icon: "fa-shopping-bag", color: "#3B82F6", type: "EXPENSE" },
    { name: "交通", icon: "fa-bus", color: "#10B981", type: "EXPENSE" },
    { name: "娱乐", icon: "fa-gamepad", color: "#8B5CF6", type: "EXPENSE" },
    { name: "医疗", icon: "fa-hospital", color: "#EF4444", type: "EXPENSE" },
    { name: "教育", icon: "fa-book", color: "#06B6D4", type: "EXPENSE" },
    { name: "住房", icon: "fa-home", color: "#78716C", type: "EXPENSE" },
    { name: "水电煤", icon: "fa-bolt", color: "#EAB308", type: "EXPENSE" },
    { name: "工资", icon: "fa-money-bill-wave", color: "#22C55E", type: "INCOME" },
    { name: "奖金", icon: "fa-gift", color: "#A855F7", type: "INCOME" },
    { name: "理财收益", icon: "fa-chart-line", color: "#6366F1", type: "INCOME" },
    { name: "转账收入", icon: "fa-exchange-alt", color: "#14B8A6", type: "INCOME" },
    { name: "转账支出", icon: "fa-exchange-alt", color: "#F43F5E", type: "EXPENSE" },
    { name: "其他", icon: "fa-ellipsis-h", color: "#9CA3AF", type: "EXPENSE" },
  ] as const;

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { id: `cat-${cat.name}` },
      update: {},
      create: { id: `cat-${cat.name}`, ...cat },
    });
  }

  // --- Persona records for demo users ---
  const personas = [
    { userId: idMap.demo_owner, ageBand: "60-70", incomeBand: "5000-10000", savingRate: 0.35, riskProfile: "稳健", spendTopCategories: JSON.stringify(["餐饮", "医疗", "住房"]) },
    { userId: idMap.demo_family, ageBand: "35-45", incomeBand: "10000-20000", savingRate: 0.25, riskProfile: "平衡", spendTopCategories: JSON.stringify(["购物", "教育", "餐饮"]) },
    { userId: idMap.demo_admin, ageBand: "30-40", incomeBand: "15000-25000", savingRate: 0.40, riskProfile: "进取", spendTopCategories: JSON.stringify(["投资", "住房", "交通"]) },
  ];

  for (const p of personas) {
    const userId = p.userId;
    if (userId) {
      await prisma.persona.upsert({
        where: { userId },
        update: {},
        create: { userId, ageBand: p.ageBand, incomeBand: p.incomeBand, savingRate: p.savingRate, riskProfile: p.riskProfile, spendTopCategories: p.spendTopCategories },
      });
    }
  }

  // --- Risk assessments ---
  const ownerUserId = idMap.demo_owner;
  if (ownerUserId) {
    const existingRA = await prisma.riskAssessment.findFirst({ where: { userId: ownerUserId } });
    if (!existingRA) {
      await prisma.riskAssessment.create({
        data: { userId: ownerUserId, score: 65, level: "MID", status: "COMPLETED", answers: JSON.stringify([{ q: "投资经验", a: "1-3年" }, { q: "风险偏好", a: "稳健" }, { q: "投资目标", a: "养老储蓄" }]) },
      });
      await prisma.riskAssessment.create({
        data: { userId: ownerUserId, score: 0, level: "MID", status: "NEW", answers: null },
      });
    }
  }

};
