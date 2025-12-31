import { Router } from 'express';

export const auditRouter = Router();

// POST /api/v1/audit/batch { items: [{ts, action, detail?}] }
auditRouter.post('/audit/batch', (req, res) => {
  const items = Array.isArray(req.body?.items) ? req.body.items : [];
  res.json({ code: 0, message: 'ok', data: { accepted: items.length } });
});
