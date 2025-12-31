import { Router } from 'express';

export const reportsRouter = Router();

// GET /api/v1/reports/:type
reportsRouter.get('/reports/:type', (req, res) => {
  const type = req.params.type as 'income-expense' | 'balance-sheet' | 'cashflow';
  let payload: any = {};
  if (type === 'income-expense') {
    payload = {
      byMonth: [
        { month: '2025-10', income: 120000, expense: 85000 },
        { month: '2025-11', income: 98000, expense: 76000 }
      ]
    };
  } else if (type === 'balance-sheet') {
    payload = { assets: 2500000, liabilities: 300000, netWorth: 2200000 };
  } else if (type === 'cashflow') {
    payload = { inflow: 120000, outflow: 95000, net: 25000 };
  }
  res.json({ code: 0, message: 'ok', data: { type, payload } });
});
