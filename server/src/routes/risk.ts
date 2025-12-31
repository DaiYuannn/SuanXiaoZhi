import { Router } from 'express';

export const riskRouter = Router();

// POST /api/v1/risk/assessment/start
riskRouter.post('/risk/assessment/start', (_req, res) => {
  const data = {
    assessmentId: 'RA-' + Date.now(),
    status: 'NEW',
    questions: [
      { id: 'q1', text: '如果投资产品短期波动，你会如何？', options: [ { id: 'o1', text: '持有观望', score: 2 }, { id: 'o2', text: '立即赎回', score: 0 } ] },
      { id: 'q2', text: '你对风险承担能力如何？', options: [ { id: 'o1', text: '较强', score: 3 }, { id: 'o2', text: '一般', score: 1 } ] }
    ]
  } as const;
  res.json({ code: 0, message: 'ok', data });
});

// POST /api/v1/risk/assessment/submit { assessmentId, answers }
riskRouter.post('/risk/assessment/submit', (req, res) => {
  const answers: Array<{ qid: string; optionId: string }> = req.body?.answers || [];
  const score = answers.length * 2; // naive scoring
  const level = score >= 4 ? 'HIGH' : score >= 2 ? 'MID' : 'LOW';
  res.json({ code: 0, message: 'ok', data: { assessmentId: req.body?.assessmentId || 'NA', status: 'COMPLETED', score, level } });
});

// GET /api/v1/risk/assessment/result?assessmentId=
riskRouter.get('/risk/assessment/result', (req, res) => {
  const id = (req.query.assessmentId as string) || 'NA';
  res.json({ code: 0, message: 'ok', data: { assessmentId: id, status: 'COMPLETED', score: 4, level: 'MID' } });
});
