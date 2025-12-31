import { Router } from 'express';

export const personaRouter = Router();

// GET /api/v1/user/profile
personaRouter.get('/profile', (_req, res) => {
  res.json({
    code: 0,
    message: 'ok',
    data: {
      userId: 'user-001',
      riskLevel: 'MID',
      preferences: { food: 0.4, travel: 0.2, digital: 0.15 },
      tags: ['都市白领', '理性消费', '偏好餐饮']
    }
  });
});

// GET /api/v1/user/profile/tags
personaRouter.get('/profile/tags', (_req, res) => {
  res.json({
    code: 0,
    message: 'ok',
    data: {
      groups: [
        { group: '基本画像', tags: ['25-34', '一线城市'] },
        { group: '消费能力', tags: ['月均5k-10k'] },
        { group: '风险偏好', tags: ['稳健'] }
      ],
      total: 3
    }
  });
});
