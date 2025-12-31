import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TEST_USERS = [
  { id: 'test_user_01', gender: '男' },
  { id: 'test_user_02', gender: '女' },
  { id: 'test_user_03', gender: '男' },
  { id: 'test_user_04', gender: '女' },
  { id: 'test_user_05', gender: '男' },
];

const CATEGORIES = ['餐饮', '出行', '购物', '住房', '娱乐', '理财', '医疗', '教育'];

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDateWithinDays(days: number): Date {
  const now = Date.now();
  const past = now - days * 24 * 60 * 60 * 1000;
  const ts = randomInt(past, now);
  return new Date(ts);
}

async function main() {
  console.log('Seeding test personas and transactions...');

  for (const user of TEST_USERS) {
    const savingRate = Math.round((Math.random() * 0.3 + 0.1) * 100) / 100; // 0.1 - 0.4
    const incomeBands = ['5k-10k', '10k-20k', '20k-30k'];
    const ageBands = ['25-30', '30-35', '35-40'];
    const riskProfiles = ['保守', '稳健', '积极'];

    const topCategories = Array.from(new Set(
      Array.from({ length: 3 }).map(() => randomItem(CATEGORIES))
    ));

    // 1. Create or update User
    const dbUser = await prisma.user.upsert({
      where: { username: user.id },
      update: {},
      create: {
        username: user.id,
        passwordHash: 'mock_hash',
      },
    });

    // 2. Create or update Persona
    await prisma.persona.upsert({
      where: { userId: dbUser.id },
      update: {
        ageBand: randomItem(ageBands),
        incomeBand: randomItem(incomeBands),
        savingRate,
        riskProfile: randomItem(riskProfiles),
        spendTopCategories: topCategories.join(','),
      },
      create: {
        userId: dbUser.id,
        ageBand: randomItem(ageBands),
        incomeBand: randomItem(incomeBands),
        savingRate,
        riskProfile: randomItem(riskProfiles),
        spendTopCategories: topCategories.join(','),
      },
    });

    console.log(`Seeded persona for ${user.id} (${user.gender})`);

    // 为每个测试用户生成 40 条左右交易
    const count = randomInt(30, 50);
    const transactionsData = Array.from({ length: count }).map(() => {
      const category = randomItem(CATEGORIES);
      const isIncome = Math.random() < 0.25; // 25% 概率收入
      const amount = isIncome
        ? randomInt(1000, 20000)
        : -randomInt(20, 3000);

      const noteBase = isIncome ? '【测试收入】' : '【测试支出】';

      return {
        amountCent: amount * 100,
        category,
        note: `${noteBase}${user.id}·${category}`,
        ts: randomDateWithinDays(90),
        isAnomaly: false,
        source: `seed:${user.id}`,
        userId: dbUser.id,
      };
    });

    await prisma.transaction.createMany({ data: transactionsData });
    console.log(`Created ${transactionsData.length} transactions for ${user.id}`);
  }

  console.log('Seed completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
