import { prisma } from "./db.js";

const categories = ["餐饮", "购物", "交通", "娱乐", "医疗", "教育", "住房", "水电煤"];

const randomInt = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

const main = async (): Promise<void> => {
  const count = await prisma.transaction.count();
  if (count > 0) {
    return;
  }

  const demo = await prisma.user.findFirst({ where: { username: "demo" } });
  if (!demo) {
    return;
  }

  const now = new Date();
  const rows: Array<{
    amountCent: number;
    category: string;
    note: string | null;
    ts: Date;
    source: string;
    isAnomaly: boolean;
    userId: string;
  }> = [];

  for (let day = 0; day < 7; day += 1) {
    for (let i = 0; i < randomInt(2, 5); i += 1) {
      const ts = new Date(now.getTime() - day * 86400000 - randomInt(0, 12) * 3600000);
      const category = categories[randomInt(0, categories.length - 1)];
      const amountCent = randomInt(500, 9800);
      rows.push({
        amountCent,
        category,
        note: null,
        ts,
        source: "seed",
        isAnomaly: amountCent > 200000,
        userId: demo.id
      });
    }
  }

  await prisma.transaction.createMany({ data: rows });
};

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async () => {
    await prisma.$disconnect();
    process.exit(1);
  });