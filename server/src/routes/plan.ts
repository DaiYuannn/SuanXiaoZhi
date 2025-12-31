import { Router } from 'express';

export const planRouter = Router();

// GET /api/v1/plan/progress?goalId=
planRouter.get('/progress', (req, res) => {
  const goalId = (req.query.goalId as string) || undefined;
  const now = new Date().toISOString();
  const data = [
    { goalId: goalId || 'save-10k', progress: 0.42, updatedAt: now },
    { goalId: 'emergency-fund', progress: 0.68, updatedAt: now }
  ];
  res.json({ code: 0, message: 'ok', data });
});

// POST /api/v1/plan/generate
planRouter.post('/generate', async (req, res) => {
  try {
    const { target, budget, deadline, constraints } = req.body || {};
    const apiKey = process.env.DEEPSEEK_API_KEY;

    let plans: Array<{ name: string; rationale?: string; steps: string[]; checkpoints: string[] }> | null = null;
    if (apiKey) {
      const sys = '你是财务规划助手。根据用户目标与约束，生成 2-3 套方案，每套含 steps(3-5) 与 checkpoints(2-3)。输出JSON：{ "plans": [{"name","rationale?","steps":[],"checkpoints":[]}]}。内容需可执行、可量化。';
      const user = { target, budget, deadline, constraints };
      const body = {
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: sys },
          { role: 'user', content: JSON.stringify(user) },
        ],
        temperature: 0.3,
        max_tokens: 900,
      } as any;
      const r = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      });
      if (r.ok) {
        const jj: any = await r.json().catch(() => ({}));
        const content = jj?.choices?.[0]?.message?.content;
        if (typeof content === 'string') {
          const m = content.match(/\{[\s\S]*\}/);
          const raw = m ? m[0] : content;
          try { plans = JSON.parse(raw)?.plans || null; } catch { /* ignore */ }
        }
      }
    }

    if (!plans) {
      // fallback template
      plans = [
        {
          name: '基础方案',
          rationale: '以稳健压支出为主，建立执行基线',
          steps: [
            '按三大类设置月度上限（餐饮/购物/出行）',
            '设置每周复盘 15 分钟，记录偏差原因',
            '对高频小额支出设置提醒与二次确认',
          ],
          checkpoints: [
            '第2周：总支出较基线下降≥5%',
            '第4周：较基线下降≥8%'
          ],
        },
        {
          name: '进阶方案',
          rationale: '组合“压支出+增储蓄”，给出量化目标',
          steps: [
            '设月储蓄率目标=历史均值 + 5%',
            '对TOP1类目细分2级标签并设单项上限',
            '设置 AI 提醒，在异常日推送建议',
          ],
          checkpoints: [
            '第4周：储蓄率达到目标；TOP1类目下降≥10%'
          ],
        },
      ];
    }

    return res.json({ code: 0, message: 'ok', data: { plans } });
  } catch (e: any) {
    return res.status(500).json({ code: 500, message: e?.message || 'generate failed' });
  }
});
