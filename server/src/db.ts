import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "file:./server/prisma/dev.db";
}

export const prisma = new PrismaClient();

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

export const ensureDemoUser = async (): Promise<string> => {
  let user = await prisma.user.findFirst({ where: { username: "demo" } });
  if (!user) {
    user = await prisma.user.create({
      data: { username: "demo", passwordHash: "demo", role: "owner" }
    });
  } else if (user.passwordHash !== "demo") {
    user = await prisma.user.update({ where: { id: user.id }, data: { passwordHash: "demo" } });
  }

  return user.id;
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

  const demoId = await ensureDemoUser();

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

  const ownerRole = await prisma.role.findUnique({ where: { code: "owner" } });
  if (ownerRole) {
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: demoId, roleId: ownerRole.id } },
      update: {},
      create: { userId: demoId, roleId: ownerRole.id }
    });
  }
};