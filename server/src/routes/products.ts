import { Router } from 'express';

export const productsRouter = Router();

// GET /api/v1/products
productsRouter.get('/products', (req, res) => {
  const risk = (req.query.riskLevel as string) || undefined;
  const list = [
    { productId: 'P001', name: '稳健理财A', riskLevel: 'LOW', expectedYield: 2.8, termDays: 90 },
    { productId: 'P002', name: '平衡理财B', riskLevel: 'MID', expectedYield: 3.6, termDays: 180 },
    { productId: 'P003', name: '进取理财C', riskLevel: 'HIGH', expectedYield: 5.2, termDays: 365 }
  ].filter(x => !risk || x.riskLevel === risk);
  res.json({ code: 0, message: 'ok', data: list });
});

// GET /api/v1/products/recommend
productsRouter.get('/products/recommend', (req, res) => {
  const budget = Number(req.query.budget || 10000);
  const termDays = Number(req.query.termDays || 180);
  const riskPreference = (req.query.riskPreference as string) || 'MID';
  const items = [
    { product: { productId: 'P002', name: '平衡理财B', riskLevel: 'MID', expectedYield: 3.6, termDays }, score: 0.82, reason: '收益与风险均衡' }
  ];
  res.json({ code: 0, message: 'ok', data: items });
});

// GET /api/v1/products/estimate?productId=&amount=&termDays=
productsRouter.get('/products/estimate', (req, res) => {
  const productId = String(req.query.productId || 'P002');
  const amount = Number(req.query.amount || 10000);
  const termDays = Number(req.query.termDays || 180);
  const rate = 0.036; // 3.6%
  const estimate = amount * rate * (termDays / 365);
  res.json({ code: 0, message: 'ok', data: { productId, estimate, termDays } });
});

// GET /api/v1/products/:id 需在具体路由之后
productsRouter.get('/products/:id', (req, res) => {
  const id = req.params.id;
  const data = { productId: id, name: `产品 ${id}`, riskLevel: 'MID', expectedYield: 3.5, termDays: 180, historyYieldPoints: [] };
  res.json({ code: 0, message: 'ok', data });
});
