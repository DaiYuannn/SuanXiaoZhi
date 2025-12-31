import { Router } from 'express';

export const accountsRouter = Router();

const mem: any[] = [
  { accountId: 'A001', name: '招商银行卡', type: 'BANK', balance: 520000, institution: '招商银行', currency: 'CNY' },
  { accountId: 'A002', name: '现金钱包', type: 'CASH', balance: 15000, currency: 'CNY' }
];

// GET /api/v1/accounts
accountsRouter.get('/accounts', (_req, res) => {
  res.json({ code: 0, message: 'ok', data: mem });
});

// POST /api/v1/accounts
accountsRouter.post('/accounts', (req, res) => {
  const body = req.body || {};
  const row = { accountId: 'A' + String(Date.now()), ...body };
  mem.push(row);
  res.json({ code: 0, message: 'ok', data: row });
});

// POST /api/v1/accounts/:id
accountsRouter.post('/accounts/:id', (req, res) => {
  const id = req.params.id;
  const i = mem.findIndex(x => x.accountId === id);
  if (i < 0) return res.status(404).json({ code: 404, message: 'not found', data: null });
  mem[i] = { ...mem[i], ...(req.body || {}) };
  res.json({ code: 0, message: 'ok', data: mem[i] });
});

// POST /api/v1/accounts/:id/delete
accountsRouter.post('/accounts/:id/delete', (req, res) => {
  const id = req.params.id;
  const i = mem.findIndex(x => x.accountId === id);
  const ok = i >= 0;
  if (ok) mem.splice(i, 1);
  res.json({ code: 0, message: 'ok', data: { accountId: id, deleted: ok } });
});
