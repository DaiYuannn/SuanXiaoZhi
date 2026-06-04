/**
 * Full data seed script — generates comprehensive transaction history for testing.
 * Run: pnpm seed
 */
import { prisma, initDB } from "./db.js";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
const EXPENSE_CATEGORIES = ["餐饮", "购物", "交通", "娱乐", "医疗", "教育", "住房", "水电煤", "转账支出", "其他"];
const INCOME_CATEGORIES = ["工资", "奖金", "理财收益", "转账收入"];

interface UserSeedConfig {
  username: string;
  daysBack: number;
  minTxPerDay: number;
  maxTxPerDay: number;
  incomeChance: number;
  anomalyThreshold: number; // amountCent, 0 = no anomalies
}

const SEED_CONFIGS: UserSeedConfig[] = [
  { username: "demo_owner", daysBack: 120, minTxPerDay: 2, maxTxPerDay: 6, incomeChance: 0.16, anomalyThreshold: 250000 },
  { username: "demo_family", daysBack: 90, minTxPerDay: 1, maxTxPerDay: 4, incomeChance: 0.10, anomalyThreshold: 200000 },
  { username: "test_owner2", daysBack: 60, minTxPerDay: 1, maxTxPerDay: 3, incomeChance: 0.12, anomalyThreshold: 300000 },
  { username: "demo_admin", daysBack: 30, minTxPerDay: 1, maxTxPerDay: 3, incomeChance: 0.08, anomalyThreshold: 0 },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const rand = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const weightedRand = (weights: number[]): number => {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r <= 0) return i;
  }
  return weights.length - 1;
};

const generateAmount = (_threshold: number, _isIncome: boolean): number => {
  const tier = weightedRand([40, 35, 15, 10]); // small, medium, large, very-large
  switch (tier) {
    case 0: return rand(100, 5000);
    case 1: return rand(5000, 50000);
    case 2: return rand(50000, 200000);
    case 3: return rand(200000, 1000000);
    default: return rand(100, 5000);
  }
};

const seasonalFactor = (dayOfYear: number): number => {
  const rad = (dayOfYear / 365) * Math.PI * 2;
  return 0.85 + 0.15 * Math.sin(rad * 2 - 1.0);
};

const NOTES_MAP: Record<string, string[]> = {
  "餐饮": ["午餐外卖", "超市买菜", "早餐", "咖啡奶茶", "朋友聚餐", "便当", "水果"],
  "购物": ["淘宝", "京东", "拼多多", "超市日用品", "衣服", "电器", "化妆品"],
  "交通": ["地铁通勤", "打车", "公交", "加油", "停车费", "共享单车"],
  "娱乐": ["电影票", "游戏充值", "KTV", "公园门票", "视频会员", "音乐会"],
  "医疗": ["门诊挂号", "药品", "体检", "牙科", "眼科检查", "理疗"],
  "教育": ["网课", "培训班", "书籍", "文具", "考试报名", "学习资料"],
  "住房": ["房租", "物业费", "维修", "装修材料", "家具"],
  "水电煤": ["电费", "水费", "燃气费", "宽带费", "手机话费"],
  "工资": ["月薪", "绩效工资"],
  "奖金": ["年终奖", "项目奖金", "季度奖金", "节日福利"],
  "理财收益": ["基金分红", "定期到期", "股票收益", "理财赎回"],
  "转账收入": ["家人转账", "退款", "报销到账"],
  "转账支出": ["转给家人", "还信用卡", "代付"],
  "其他": ["快递费", "打印", "捐款", "杂项"],
};

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log("🌱 Starting full data seed...\n");

  console.log("  → Initializing database...");
  await initDB();
  console.log("  ✓ Database initialized\n");

  const users = await prisma.user.findMany({ include: { family: true, ledgers: true } });
  const userMap = new Map(users.map((u) => [u.username, u]));
  const categories = await prisma.category.findMany({});
  const catMap = new Map(categories.map((c) => [c.name, c.id]));

  let totalCreated = 0;

  for (const config of SEED_CONFIGS) {
    const user = userMap.get(config.username);
    if (!user) { console.log(`  ⚠ User "${config.username}" not found, skipping.`); continue; }

    const existingCount = await prisma.transaction.count({ where: { userId: user.id } });
    const expectedMin = config.daysBack * config.minTxPerDay;
    if (existingCount >= expectedMin) {
      console.log(`  → ${config.username}: ${existingCount} existing tx (≥ ${expectedMin}), skipping.`);
      totalCreated += existingCount;
      continue;
    }

    const ownLedger = user.ledgers.find((l) => l.type === "PERSONAL" && l.ownerId === user.id);
    const ledgerId = ownLedger?.id ?? user.ledgers[0]?.id;

    const familyLedger = user.family
      ? await prisma.ledger.findFirst({ where: { familyId: user.family.id, type: "FAMILY" } })
      : null;

    const now = new Date();
    const transactions: Array<{
      amountCent: number; type: string; categoryId?: string; categoryName: string;
      note?: string; ts: Date; isAnomaly: boolean; source: string;
      userId: string; ledgerId?: string; targetLedgerId?: string;
    }> = [];

    for (let dayOffset = 0; dayOffset < config.daysBack; dayOffset++) {
      const day = new Date(now.getTime() - dayOffset * 86400000);
      const dayOfYear = Math.floor((day.getTime() - new Date(day.getFullYear(), 0, 0).getTime()) / 86400000);
      const seasonal = seasonalFactor(dayOfYear);

      const txCount = rand(config.minTxPerDay, config.maxTxPerDay);
      const hours = Array.from({ length: txCount }, () => rand(6, 22)).sort((a, b) => b - a);

      for (let i = 0; i < txCount; i++) {
        const hour = hours[i];
        const ts = new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour, rand(0, 59));

        const isIncome = Math.random() < config.incomeChance;
        const type = isIncome ? "INCOME" : "EXPENSE";
        const categoryName = isIncome ? pick(INCOME_CATEGORIES) : pick(EXPENSE_CATEGORIES);

        let amountCent = generateAmount(config.anomalyThreshold, isIncome);
        amountCent = Math.round(amountCent * (0.85 + 0.3 * seasonal * Math.random()));
        const isAnomaly = config.anomalyThreshold > 0 && amountCent > config.anomalyThreshold;

        const note = pick(NOTES_MAP[categoryName] ?? ["交易"]);

        transactions.push({
          amountCent, type, categoryId: catMap.get(categoryName) ?? undefined, categoryName,
          note, ts, isAnomaly,
          source: pick(["manual", "auto", "scan", "import"]),
          userId: user.id, ledgerId,
          targetLedgerId: (type === "INCOME" && categoryName === "转账收入" && familyLedger) ? familyLedger.id : undefined,
        });
      }
    }

    const BATCH = 50;
    for (let i = 0; i < transactions.length; i += BATCH) {
      for (const tx of transactions.slice(i, i + BATCH)) {
        await prisma.transaction.create({ data: tx });
      }
    }
    console.log(`  ✓ ${config.username}: created ${transactions.length} transactions`);
    totalCreated += transactions.length;
  }

  // --- UserTasks for demo_owner ---
  const owner = userMap.get("demo_owner");
  if (owner) {
    const tasks = await prisma.task.findMany({});
    for (const task of tasks) {
      await prisma.userTask.upsert({
        where: { userId_taskId: { userId: owner.id, taskId: task.id } },
        update: {},
        create: {
          userId: owner.id, taskId: task.id,
          status: task.code === "DAILY_LOGIN" || task.code === "ADD_TRANSACTION" ? "COMPLETED" : "IN_PROGRESS",
          progress: task.code === "DAILY_LOGIN" || task.code === "ADD_TRANSACTION" ? 1 : 0,
          lastCompletedAt: task.code === "DAILY_LOGIN" || task.code === "ADD_TRANSACTION" ? new Date() : null,
        },
      });
    }
    console.log("  ✓ Created UserTasks for demo_owner");
  }

  // --- Achievements ---
  if (owner) {
    const firstStep = await prisma.achievement.findUnique({ where: { code: "FIRST_STEP" } });
    const streak7 = await prisma.achievement.findUnique({ where: { code: "STREAK_7" } });
    if (firstStep) {
      await prisma.userAchievement.upsert({
        where: { userId_achievementId: { userId: owner.id, achievementId: firstStep.id } },
        update: {}, create: { userId: owner.id, achievementId: firstStep.id },
      });
    }
    if (streak7) {
      await prisma.userAchievement.upsert({
        where: { userId_achievementId: { userId: owner.id, achievementId: streak7.id } },
        update: {}, create: { userId: owner.id, achievementId: streak7.id },
      });
    }
    console.log("  ✓ Created UserAchievements for demo_owner");
  }

  // --- Audit events ---
  const actor = owner ?? users[0];
  const auditActions = [
    "user.login", "transaction.create", "transaction.update", "transaction.delete",
    "anomaly.scan", "plan.create", "plan.update", "product.view",
    "product.recommend", "admin.user_list", "admin.system_stats", "category.view",
  ];
  for (const action of auditActions) {
    await prisma.auditEvent.create({
      data: { actorId: actor.id, action, detail: `${action} event`, ts: new Date(Date.now() - rand(0, 86400000 * 7)) },
    });
  }
  console.log(`  ✓ Created ${auditActions.length} audit events`);

  // --- Reminders for demo_owner ---
  if (owner) {
    const existing = await prisma.reminder.count({ where: { userId: owner.id } });
    if (existing === 0) {
      await prisma.reminder.createMany({
        data: [
          { userId: owner.id, type: "AUDIT", status: "ACTIVE", config: JSON.stringify({ title: "每周账单对账", frequency: "WEEK" }) },
          { userId: owner.id, type: "BILL", status: "ACTIVE", config: JSON.stringify({ title: "信用卡还款", amount: 5280, dueDay: 15 }) },
          { userId: owner.id, type: "SAVING", status: "ACTIVE", config: JSON.stringify({ title: "每月定投", amount: 2000, day: 1 }) },
        ],
      });
      console.log("  ✓ Created reminders for demo_owner");
    }
  }

  // --- Summary ---
  console.log(`\n✅ Seed complete!`);
  console.log(`   Users: ${await prisma.user.count()}`);
  console.log(`   Transactions: ${totalCreated} created (${await prisma.transaction.count()} total in DB)`);
  console.log(`   Products: ${await prisma.product.count()}`);
  console.log(`   Tasks: ${await prisma.task.count()}`);
  console.log(`   Achievements: ${await prisma.achievement.count()}`);
  console.log(`   Categories: ${await prisma.category.count()}`);
  console.log(`   AuditEvents: ${await prisma.auditEvent.count()}`);
  console.log(`   RiskAssessments: ${await prisma.riskAssessment.count()}`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("Seed failed:", e);
  process.exit(1);
});
