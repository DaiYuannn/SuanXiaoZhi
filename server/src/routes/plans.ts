import { Router } from 'express';

export const plansRouter = Router();

type PlanItem = {
  planId: string;
  name: string;
  goal?: string;
  content?: any;
  status: 'ongoing' | 'done' | 'adjusted';
  createdAt: string;
  updatedAt?: string;
};

const mem: { items: PlanItem[] } = {
  items: [
    { planId: 'p-001', name: '应急金3万元', goal: '建立3-6个月生活费', status: 'ongoing', createdAt: new Date().toISOString() },
    { planId: 'p-002', name: '旅游基金', goal: '一年后出行', status: 'adjusted', createdAt: new Date().toISOString() },
  ],
};

// GET /api/v1/plans
plansRouter.get('/', (_req, res) => {
  res.json({ code: 0, message: 'ok', data: mem.items });
});

// POST /api/v1/plans
plansRouter.post('/', (req, res) => {
  const b = req.body || {};
  const now = new Date().toISOString();
  const item: PlanItem = {
    planId: 'p-' + Math.random().toString(36).slice(2, 8),
    name: String(b.name || '未命名计划'),
    goal: b.goal ? String(b.goal) : undefined,
    content: b.content ?? undefined,
    status: (b.status as any) || 'ongoing',
    createdAt: now,
    updatedAt: now,
  };
  mem.items.unshift(item);
  res.json({ code: 0, message: 'ok', data: item });
});

// POST /api/v1/plans/:id
plansRouter.post('/:id', (req, res) => {
  const id = req.params.id;
  const idx = mem.items.findIndex(x => x.planId === id);
  if (idx < 0) return res.status(404).json({ code: 404, message: 'plan not found' });
  const b = req.body || {};
  const old = mem.items[idx];
  const updated: PlanItem = {
    ...old,
    name: b.name !== undefined ? String(b.name) : old.name,
    goal: b.goal !== undefined ? String(b.goal) : old.goal,
    content: b.content !== undefined ? b.content : old.content,
    status: (b.status as any) || old.status,
    updatedAt: new Date().toISOString(),
  };
  mem.items[idx] = updated;
  res.json({ code: 0, message: 'ok', data: updated });
});

// POST /api/v1/plans/:id/delete
plansRouter.post('/:id/delete', (req, res) => {
  const id = req.params.id;
  const before = mem.items.length;
  mem.items = mem.items.filter(x => x.planId !== id);
  const deleted = mem.items.length !== before;
  res.json({ code: 0, message: 'ok', data: { planId: id, deleted } });
});
