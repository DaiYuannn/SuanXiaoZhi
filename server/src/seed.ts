import { prisma } from "./db.js";

const categories = ["餐饮", "购物", "交通", "娱乐", "医疗", "教育", "住房", "水电煤"];
const incomeCategories = ["工资", "奖金", "理财收益", "家庭转账"];
const expenseNotes = ["日常消费", "线上支付", "固定支出", "通勤开销", "周末活动"];

const randomInt = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

const pick = <T>(list: T[]): T => list[randomInt(0, list.length - 1)];

const main = async (): Promise<void> => {
  const users = await prisma.user.findMany({
    where: {
      username: {
        in: ["demo_owner", "demo_family", "demo", "demo_admin", "demo_operator", "demo_viewer"]
      }
    }
  });

  if (users.length === 0) {
    return;
  }

  const userMap = new Map(users.map((item) => [item.username, item]));
  const owner = userMap.get("demo_owner") ?? userMap.get("demo");
  const family = userMap.get("demo_family");
  const operator = userMap.get("demo_operator");

  const ledgers = await prisma.ledger.findMany({});
  const ownerLedger = owner ? ledgers.find((item) => item.ownerId === owner.id && item.type === "PERSONAL") : undefined;
  const familyLedger = family ? ledgers.find((item) => item.ownerId === family.id && item.type === "PERSONAL") : undefined;
  const sharedLedger = owner ? ledgers.find((item) => item.familyId !== null && item.type === "FAMILY") : undefined;

  const targets: Array<{
    username: string;
    days: number;
    minPerDay: number;
    maxPerDay: number;
    incomeChance: number;
    anomalyThreshold: number;
    baseAmountMin: number;
    baseAmountMax: number;
    ledgerId?: string;
  }> = [
    {
      username: owner?.username ?? "",
      days: 120,
      minPerDay: 2,
      maxPerDay: 6,
      incomeChance: 0.16,
      anomalyThreshold: 280000,
      baseAmountMin: 1200,
      baseAmountMax: 23800,
      ledgerId: ownerLedger?.id
    },
    {
      username: family?.username ?? "",
      days: 90,
      minPerDay: 1,
      maxPerDay: 4,
      incomeChance: 0.08,
      anomalyThreshold: 180000,
      baseAmountMin: 800,
      baseAmountMax: 12800,
      ledgerId: familyLedger?.id ?? sharedLedger?.id
    },
    {
      username: operator?.username ?? "",
      days: 45,
      minPerDay: 1,
      maxPerDay: 3,
      incomeChance: 0.05,
      anomalyThreshold: 150000,
      baseAmountMin: 600,
      baseAmountMax: 9800,
      ledgerId: undefined
    }
  ].filter((item) => Boolean(item.username));

  const now = new Date();

  for (const plan of targets) {
    const user = userMap.get(plan.username);
    if (!user) {
      continue;
    }

    const existing = await prisma.transaction.count({ where: { userId: user.id } });
    const expectedMinimum = Math.floor(plan.days * ((plan.minPerDay + plan.maxPerDay) / 2));
    if (existing >= expectedMinimum) {
      continue;
    }

    const rows: Array<{
      amountCent: number;
      type: string;
      categoryName: string;
      note: string | null;
      ts: Date;
      source: string;
      isAnomaly: boolean;
      userId: string;
      ledgerId?: string;
    }> = [];

    for (let day = 0; day < plan.days; day += 1) {
      const txCount = randomInt(plan.minPerDay, plan.maxPerDay);
      const seasonFactor = 1 + Math.sin(day / 8) * 0.25 + Math.cos(day / 17) * 0.15;

      for (let i = 0; i < txCount; i += 1) {
        const ts = new Date(now.getTime() - day * 86400000 - randomInt(0, 22) * 3600000 - randomInt(0, 59) * 60000);
        const isIncome = Math.random() < plan.incomeChance;
        const base = randomInt(plan.baseAmountMin, plan.baseAmountMax);
        const amountCent = Math.max(500, Math.floor(base * seasonFactor));
        const amount = isIncome ? -amountCent : amountCent;

        rows.push({
          amountCent: amount,
          type: isIncome ? "INCOME" : "EXPENSE",
          categoryName: isIncome ? pick(incomeCategories) : pick(categories),
          note: `${pick(expenseNotes)} #${randomInt(100, 999)}`,
          ts,
          source: "seed",
          isAnomaly: Math.abs(amount) > plan.anomalyThreshold,
          userId: user.id,
          ledgerId: plan.ledgerId
        });
      }
    }

    if (rows.length > 0) {
      await prisma.transaction.createMany({ data: rows });
    }
  }
};

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async () => {
    await prisma.$disconnect();
    process.exit(1);
  });