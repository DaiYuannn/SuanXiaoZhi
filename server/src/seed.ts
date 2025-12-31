import { prisma } from './db.js';

const categories = ['餐饮','购物','交通','娱乐','医疗','教育','住房','水电煤'];

function rand(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }

async function main() {
  const count = await prisma.transaction.count();
  if (count > 0) {
    // eslint-disable-next-line no-console
    console.log(`[seed] skipped: found ${count} existing transactions.`);
    return;
  }
  const now = new Date();
  const rows: any[] = [];
  for (let d = 0; d < 7; d++) {
    for (let i = 0; i < rand(2, 5); i++) {
      const ts = new Date(now.getTime() - d * 86400000 - rand(0, 12) * 3600000);
      const category = categories[rand(0, categories.length - 1)];
      const amountCent = rand(500, 9800); // 5.00 ~ 98.00 元
      rows.push({ amountCent, category, note: null, ts, source: 'seed', isAnomaly: amountCent > 200000 });
    }
  }
  await prisma.transaction.createMany({ data: rows });
  // eslint-disable-next-line no-console
  console.log(`[seed] inserted ${rows.length} transactions.`);

  // Seed Tasks
  const tasks = [
    { code: 'DAILY_LOGIN', name: '每日登录', description: '每天登录应用', points: 10, type: 'DAILY', target: 1 },
    { code: 'ADD_TRANSACTION', name: '每日记账', description: '每天记录至少一笔交易', points: 20, type: 'DAILY', target: 1 },
    { code: 'WEEKLY_REVIEW', name: '每周复盘', description: '查看一次周报', points: 50, type: 'WEEKLY', target: 1 },
    { code: 'SET_BUDGET', name: '设置预算', description: '首次设置月度预算', points: 100, type: 'ONE_TIME', target: 1 },
  ];

  for (const t of tasks) {
    await prisma.task.upsert({
      where: { code: t.code },
      update: {},
      create: t,
    });
  }
  console.log(`[seed] upserted ${tasks.length} tasks.`);

  // Seed Achievements
  const achievements = [
    { code: 'FIRST_STEP', name: '记账第一步', description: '完成第1笔手动记账', icon: 'fa-flag' },
    { code: 'SAVING_MASTER', name: '省钱达人', description: '月度储蓄率超过30%', icon: 'fa-piggy-bank' },
    { code: 'STREAK_7', name: '坚持就是胜利', description: '连续记账7天', icon: 'fa-fire' },
  ];

  for (const a of achievements) {
    await prisma.achievement.upsert({
      where: { code: a.code },
      update: {},
      create: a,
    });
  }
  console.log(`[seed] upserted ${achievements.length} achievements.`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
