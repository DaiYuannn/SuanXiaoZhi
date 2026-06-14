import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const [
    users,
    families,
    ledgers,
    categories,
    transactions,
    anomalyTransactions,
    products,
    tasks,
    achievements,
    userTasks,
    auditEvents,
    riskAssessments,
    reminders,
    plans,
    chatSessions,
    loginHistories
  ] = await Promise.all([
    prisma.user.count(),
    prisma.family.count(),
    prisma.ledger.count(),
    prisma.category.count(),
    prisma.transaction.count(),
    prisma.transaction.count({ where: { isAnomaly: true } }),
    prisma.product.count(),
    prisma.task.count(),
    prisma.achievement.count(),
    prisma.userTask.count(),
    prisma.auditEvent.count(),
    prisma.riskAssessment.count(),
    prisma.reminder.count(),
    prisma.plan.count(),
    prisma.chatSession.count(),
    prisma.loginHistory.count()
  ]);

  const byType = await prisma.transaction.groupBy({
    by: ['type'],
    _count: { _all: true },
    _sum: { amountCent: true }
  });

  const bySource = await prisma.transaction.groupBy({
    by: ['source'],
    _count: { _all: true }
  });

  const byCategory = await prisma.transaction.groupBy({
    by: ['categoryName'],
    _count: { _all: true },
    orderBy: { _count: { categoryName: 'desc' } },
    take: 10
  });

  const result = {
    generatedAt: new Date().toISOString(),
    summary: {
      users,
      families,
      ledgers,
      categories,
      transactions,
      anomalyTransactions,
      products,
      tasks,
      achievements,
      userTasks,
      auditEvents,
      riskAssessments,
      reminders,
      plans,
      chatSessions,
      loginHistories
    },
    transactionByType: byType,
    transactionBySource: bySource,
    topCategories: byCategory
  };

  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
