import { Router } from 'express';

export const nlpRouter = Router();

// POST /api/v1/intent/recognize { text }
nlpRouter.post('/intent/recognize', (req, res) => {
  const text: string = req.body?.text || '';
  const items: Array<{ type: 'navigate' | 'incentive'; score: number; payload?: any }> = [];
  const t = text.toLowerCase();
  if (/优惠|红包|券|积分/.test(t)) items.push({ type: 'incentive', score: 0.9, payload: { target: 'incentive-center' } });
  if (/记账|流水|交易|账单/.test(t)) items.push({ type: 'navigate', score: 0.85, payload: { route: '/p-accounting' } });
  if (items.length === 0) items.push({ type: 'navigate', score: 0.5, payload: { route: '/p-home' } });
  res.json({ code: 0, message: 'ok', data: items });
});
