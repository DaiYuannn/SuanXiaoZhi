import { Router } from 'express';
import { prisma } from '../db.js';

export const remindersRouter = Router();

// Map DB row to API shape
function toApi(row: any) {
  let cfg: any = undefined;
  if (row.config) {
    try { cfg = JSON.parse(row.config); } catch { cfg = undefined; }
  }
  return {
    id: row.id,
    title: cfg?.title || '提醒',
    type: row.type as 'BILL' | 'AUDIT' | 'CUSTOM',
    dueAt: cfg?.dueAt || new Date().toISOString(),
    status: (row.status === 'ACTIVE' ? 'PENDING' : row.status) as 'PENDING' | 'DONE' | 'SNOOZE',
    config: cfg
  };
}

// Seed minimal defaults if empty
async function ensureSeed() {
  const count = await prisma.reminder.count();
  if (count === 0) {
    await prisma.reminder.createMany({ data: [
      { type: 'AUDIT', status: 'ACTIVE', config: JSON.stringify({ title: '每周账单对账', frequency: 'WEEK', timeOfDay: '09:00' }) },
      { type: 'BILL', status: 'ACTIVE', config: JSON.stringify({ title: '信用卡还款', frequency: 'MONTH', timeOfDay: '10:00', dueAt: new Date().toISOString() }) }
    ]});
  }
}

// GET /api/v1/reminders
remindersRouter.get('/', async (_req, res, next) => {
  try {
    await ensureSeed();
    const rows = await prisma.reminder.findMany({ orderBy: { updatedAt: 'desc' } });
    res.json({ code: 0, message: 'ok', data: rows.map(toApi) });
  } catch (e) { next(e); }
});

// POST /api/v1/reminders
remindersRouter.post('/', async (req, res, next) => {
  try {
    const { title, type, dueAt, status, config } = req.body || {};
    const cfg = JSON.stringify({ ...(config || {}), title, dueAt });
    const row = await prisma.reminder.create({ data: { type: String(type || 'CUSTOM'), status: String(status || 'ACTIVE'), config: cfg } });
    res.json({ code: 0, message: 'ok', data: toApi(row) });
  } catch (e) { next(e); }
});

// POST /api/v1/reminders/:id/status
remindersRouter.post('/:id/status', async (req, res, next) => {
  try {
    const id = req.params.id;
    const { status } = req.body || {};
    const row = await prisma.reminder.update({ where: { id }, data: { status: String(status || 'ACTIVE') } });
    res.json({ code: 0, message: 'ok', data: toApi(row) });
  } catch (e) { next(e); }
});

// POST /api/v1/reminders/:id
remindersRouter.post('/:id', async (req, res, next) => {
  try {
    const id = req.params.id;
    const { title, dueAt, config } = req.body || {};
    const current = await prisma.reminder.findUnique({ where: { id } });
    if (!current) return res.status(404).json({ code: 404, message: 'not found', data: null });
    let cfgObj: any = {};
    try { cfgObj = current.config ? JSON.parse(current.config) : {}; } catch { cfgObj = {}; }
    const nextCfg = JSON.stringify({ ...cfgObj, ...(config || {}), ...(title ? { title } : {}), ...(dueAt ? { dueAt } : {}) });
    const row = await prisma.reminder.update({ where: { id }, data: { config: nextCfg } });
    res.json({ code: 0, message: 'ok', data: toApi(row) });
  } catch (e) { next(e); }
});
