import { Router } from 'express';

export const flowsRouter = Router();

// GET /api/v1/flows?date=YYYY-MM-DD
flowsRouter.get('/flows', (req, res) => {
  const date = (req.query.date as string) || new Date().toISOString().slice(0,10);
  const data = [
    { id: 'f1', amount: -2599, time: `${date}T09:12:00.000Z`, channel: 'alipay', category: '餐饮' },
    { id: 'f2', amount: -3599, time: `${date}T12:30:00.000Z`, channel: 'wechat', category: '购物' }
  ];
  res.json({ code: 0, message: 'ok', data });
});
