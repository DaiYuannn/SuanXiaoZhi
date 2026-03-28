import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "file:./server/prisma/dev.db";
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
  { username: "demo_viewer", password: "demo123", role: "viewer" }
];

const parseSqlitePath = (url?: string): string | null => {
  if (!url) {
    return null;
  }

  if (url.startsWith("file:")) {
    const withoutPrefix = url.slice("file:".length);
    const filePart = withoutPrefix.split("?")[0];
    return path.isAbsolute(filePart) ? filePart : path.resolve(process.cwd(), filePart);
  }

  return null;
};

export const ensureDemoAccounts = async (): Promise<Record<string, string>> => {
  const roleRows = [
    { code: "owner", name: "用户本人" },
    { code: "family", name: "家庭授权人" },
    { code: "super_admin", name: "超级管理员" },
    { code: "operator", name: "运营人员" },
    { code: "viewer", name: "查看人员" }
  ] as const;

  for (const role of roleRows) {
    await prisma.role.upsert({
      where: { code: role.code },
      update: {},
      create: role
    });
  }

  const roleMap = new Map<string, string>();
  const dbRoles = await prisma.role.findMany({});
  dbRoles.forEach((role) => roleMap.set(role.code, role.id));

  const idMap: Record<string, string> = {};

  for (const account of demoAccounts) {
    const user = await prisma.user.upsert({
      where: { username: account.username },
      update: {
        passwordHash: account.password,
        role: account.role,
        isActive: true
      },
      create: {
        username: account.username,
        passwordHash: account.password,
        role: account.role,
        isActive: true
      }
    });

    idMap[account.username] = user.id;

    const roleId = roleMap.get(account.role);
    if (roleId) {
      await prisma.userRole.upsert({
        where: { userId_roleId: { userId: user.id, roleId } },
        update: {},
        create: { userId: user.id, roleId }
      });
    }
  }

  const ownerId = idMap.demo_owner;
  const familyId = idMap.demo_family;

  if (ownerId && familyId) {
    let family = await prisma.family.findFirst({ where: { name: "演示家庭" } });
    if (!family) {
      family = await prisma.family.create({
        data: {
          name: "演示家庭",
          description: "用于 C 端户主与家庭成员联动演示"
        }
      });
    }

    await prisma.user.update({ where: { id: ownerId }, data: { familyId: family.id } });
    await prisma.user.update({ where: { id: familyId }, data: { familyId: family.id } });

    const ownerLedger = await prisma.ledger.findFirst({
      where: { ownerId, type: "PERSONAL", name: "户主主账户" }
    });
    if (!ownerLedger) {
      await prisma.ledger.create({
        data: {
          name: "户主主账户",
          type: "PERSONAL",
          ownerId,
          currency: "CNY",
          balanceCent: 12856000
        }
      });
    }

    const familyLedger = await prisma.ledger.findFirst({
      where: { ownerId: familyId, type: "PERSONAL", name: "家庭成员账户" }
    });
    if (!familyLedger) {
      await prisma.ledger.create({
        data: {
          name: "家庭成员账户",
          type: "PERSONAL",
          ownerId: familyId,
          currency: "CNY",
          balanceCent: 2350000
        }
      });
    }

    const sharedLedger = await prisma.ledger.findFirst({
      where: { familyId: family.id, type: "FAMILY", name: "演示家庭共享账本" }
    });
    if (!sharedLedger) {
      await prisma.ledger.create({
        data: {
          name: "演示家庭共享账本",
          type: "FAMILY",
          familyId: family.id,
          ownerId,
          currency: "CNY",
          balanceCent: 3680000
        }
      });
    }
  }

  return idMap;
};

export const ensureDemoUser = async (): Promise<string> => {
  const idMap = await ensureDemoAccounts();
  return idMap.demo ?? idMap.demo_owner;
};

export const initDB = async (): Promise<void> => {
  const sqlitePath = parseSqlitePath(process.env.DATABASE_URL);
  if (sqlitePath) {
    const dir = path.dirname(sqlitePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  try {
    await prisma.$executeRawUnsafe("PRAGMA journal_mode=WAL;");
    await prisma.$executeRawUnsafe("PRAGMA synchronous=NORMAL;");
  } catch {
    // Ignore sqlite pragma errors in constrained environments.
  }

  await ensureDemoAccounts();

  const tasks = [
    { code: "DAILY_LOGIN", name: "每日登录", description: "每天登录应用", points: 10, type: "DAILY", target: 1 },
    { code: "ADD_TRANSACTION", name: "每日记账", description: "每天记录至少一笔交易", points: 20, type: "DAILY", target: 1 },
    { code: "WEEKLY_REVIEW", name: "每周复盘", description: "查看一次周报", points: 50, type: "WEEKLY", target: 1 },
    { code: "SET_BUDGET", name: "设置预算", description: "首次设置月度预算", points: 100, type: "ONE_TIME", target: 1 }
  ] as const;

  for (const task of tasks) {
    await prisma.task.upsert({
      where: { code: task.code },
      update: {},
      create: task
    });
  }

  const achievements = [
    { code: "FIRST_STEP", name: "记账第一步", description: "完成第1笔手动记账", icon: "fa-flag" },
    { code: "SAVING_MASTER", name: "省钱达人", description: "月度储蓄率超过30%", icon: "fa-piggy-bank" },
    { code: "STREAK_7", name: "坚持就是胜利", description: "连续记账7天", icon: "fa-fire" }
  ] as const;

  for (const achievement of achievements) {
    await prisma.achievement.upsert({
      where: { code: achievement.code },
      update: {},
      create: achievement
    });
  }

  const products = [
    {
      productCode: "P001",
      name: "稳健理财A",
      riskLevel: "LOW",
      expectedYield: 2.8,
      termDays: 90,
      description: "低风险稳健组合"
    },
    {
      productCode: "P002",
      name: "平衡理财B",
      riskLevel: "MID",
      expectedYield: 3.6,
      termDays: 180,
      description: "收益与风险均衡"
    },
    {
      productCode: "P003",
      name: "进取理财C",
      riskLevel: "HIGH",
      expectedYield: 5.2,
      termDays: 365,
      description: "高风险高波动产品"
    }
  ] as const;

  for (const product of products) {
    await prisma.product.upsert({
      where: { productCode: product.productCode },
      update: {},
      create: product
    });
  }

  await ensureDemoAccounts();
};