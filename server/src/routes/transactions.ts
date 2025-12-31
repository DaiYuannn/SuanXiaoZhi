import { Router } from 'express';
import { prisma } from '../db.js';

export const transactionsRouter = Router();

const getUserId = async (req: any) => {
  let user = await prisma.user.findFirst({ where: { username: 'demo' } });
  if (!user) {
    user = await prisma.user.create({
      data: { username: 'demo', passwordHash: 'mock', role: 'user' }
    });
  }
  return user.id;
};

// GET /api/v1/transactions
transactionsRouter.get('/', async (req, res, next) => {
  try {
    const page = Number(req.query.page || 1);
    const size = Number(req.query.size || 20);
    const from = req.query.from ? new Date(String(req.query.from)) : undefined;
    const to = req.query.to ? new Date(String(req.query.to)) : undefined;
    const category = req.query.category ? String(req.query.category) : undefined;
    const ledgerId = req.query.ledgerId ? String(req.query.ledgerId) : undefined;

    const where: any = {};
    if (from || to) where.ts = { gte: from, lte: to };
    if (category) where.category = category;
    if (ledgerId) where.ledgerId = ledgerId;

    const total = await prisma.transaction.count({ where });
    const rows = await prisma.transaction.findMany({
      where,
      orderBy: { ts: 'desc' },
      skip: (page - 1) * size,
      take: size
    });

    const list = rows.map((r: any) => ({
      transactionId: r.id,
      accountId: 'default',
      time: new Date(r.ts).toISOString(),
      type: r.amountCent >= 0 ? 'EXPENSE' : 'INCOME',
      amount: Math.abs(r.amountCent),
      category: r.category,
      description: r.note ?? undefined,
      merchant: undefined,
      remark: r.note ?? undefined,
      isAnomaly: !!r.isAnomaly,
      voucherUrl: undefined,
    }));

    res.json({ code: 0, message: 'ok', data: { total, page, size, list } });
  } catch (e) { next(e); }
});

// POST /api/v1/transactions
transactionsRouter.post('/', async (req, res, next) => {
  try {
    const userId = await getUserId(req);
    // 兼容两种入参形状：
    // A) 服务端内部格式：{ amountCent, category, note, ts, source, isAnomaly }
    // B) 前端 createTransaction：{ accountId, time, type, amount, category, description, remark }
    const b = req.body || {};
    const amountCent = b.amountCent ?? b.amount; // B.amount 为分
    const ts = b.ts ?? b.time; // B.time 为 ISO 字符串
    const note = b.note ?? b.remark ?? (b.description ? String(b.description) : undefined);
    const category = b.category;
    const source = b.source ?? 'manual';
    const isAnomaly = b.isAnomaly ?? false;
    const ledgerId = b.ledgerId;

    const row = await prisma.transaction.create({ data: {
      amountCent: Number(amountCent || 0),
      category: String(category || '未分类'),
      note: note ? String(note) : null,
      ts: ts ? new Date(ts) : new Date(),
      source: String(source || 'manual'),
      isAnomaly: Boolean(isAnomaly || false),
      userId,
      ledgerId: ledgerId ? String(ledgerId) : undefined
    }});

    // Gamification Trigger
    try {
      // 1. Daily Task: ADD_TRANSACTION
      const task = await prisma.task.findUnique({ where: { code: 'ADD_TRANSACTION' } });
      if (task) {
        const today = new Date();
        today.setHours(0,0,0,0);
        
        const userTask = await prisma.userTask.findUnique({
           where: { userId_taskId: { userId, taskId: task.id } }
        });

        if (!userTask || !userTask.lastCompletedAt || userTask.lastCompletedAt < today) {
           await prisma.userTask.upsert({
             where: { userId_taskId: { userId, taskId: task.id } },
             create: { userId, taskId: task.id, status: 'COMPLETED', progress: 1, lastCompletedAt: new Date() },
             update: { status: 'COMPLETED', progress: 1, lastCompletedAt: new Date() }
           });
        }
      }

      // 2. Achievement: FIRST_STEP
      const count = await prisma.transaction.count({ where: { userId } });
      if (count === 1) {
        const ach = await prisma.achievement.findUnique({ where: { code: 'FIRST_STEP' } });
        if (ach) {
           await prisma.userAchievement.create({
             data: { userId, achievementId: ach.id }
           }).catch(() => {}); 
        }
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Gamification trigger failed', err);
    }

    const data = {
      transactionId: row.id,
      accountId: 'default',
      time: new Date(row.ts).toISOString(),
      type: row.amountCent >= 0 ? 'EXPENSE' : 'INCOME',
      amount: Math.abs(row.amountCent),
      category: row.category,
      description: row.note ?? undefined,
      merchant: undefined,
      remark: row.note ?? undefined,
      isAnomaly: !!row.isAnomaly,
      voucherUrl: undefined,
    };
    res.json({ code: 0, message: 'ok', data });
  } catch (e) { next(e); }
});

// PATCH /api/v1/transactions/:id
transactionsRouter.patch('/:id', async (req, res, next) => {
  try {
    const id = req.params.id;
    const data: any = {};
    // 兼容把 B 形状映射成 A
    const b = req.body || {};
    if (b.amount !== undefined && b.amountCent === undefined) b.amountCent = b.amount;
    if (b.time !== undefined && b.ts === undefined) b.ts = b.time;
    if (b.remark !== undefined && b.note === undefined) b.note = b.remark;
    if (b.description && b.note === undefined) b.note = String(b.description);

    ['amountCent','category','note','ts','source','isAnomaly'].forEach(k => {
      if (req.body[k] !== undefined) data[k] = req.body[k];
    });
    if (data.ts) data.ts = new Date(data.ts);
    const row = await prisma.transaction.update({ where: { id }, data });
    const payload = {
      transactionId: row.id,
      accountId: 'default',
      time: new Date(row.ts).toISOString(),
      type: row.amountCent >= 0 ? 'EXPENSE' : 'INCOME',
      amount: Math.abs(row.amountCent),
      category: row.category,
      description: row.note ?? undefined,
      merchant: undefined,
      remark: row.note ?? undefined,
      isAnomaly: !!row.isAnomaly,
      voucherUrl: undefined,
    };
    res.json({ code: 0, message: 'ok', data: payload });
  } catch (e) { next(e); }
});

// GET /api/v1/transactions/anomaly-scan
transactionsRouter.get('/anomaly-scan', async (req, res, next) => {
  try {
    // 简易策略：过去30天中金额>200000(>=2000元)标记为异常
    const since = req.query.since ? new Date(String(req.query.since)) : new Date(Date.now() - 30*86400000);
    const suspects = await prisma.transaction.findMany({
      where: { ts: { gte: since }, amountCent: { gt: 200000 } },
      select: { id: true }
    });
    res.json({ code: 0, message: 'ok', data: { anomalies: suspects.map((x: any) => x.id) } });
  } catch (e) { next(e); }
});
