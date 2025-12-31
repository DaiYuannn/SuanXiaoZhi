import { Router } from 'express';
import { prisma } from '../db.js';

export const analysisRouter = Router();

function fmtDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

async function getSummary(from?: Date, to?: Date) {
  const where: any = {};
  if (from || to) where.ts = { gte: from, lte: to };
  const rows = await prisma.transaction.findMany({ where });

  const byCategoryMap = new Map<string, { amount: number; count: number }>();
  const trendMap = new Map<string, number>();

  for (const r of rows) {
    const cat = r.category || '其他';
    const stat = byCategoryMap.get(cat) || { amount: 0, count: 0 };
    stat.amount += r.amountCent;
    stat.count += 1;
    byCategoryMap.set(cat, stat);

    const key = fmtDate(new Date(r.ts));
    trendMap.set(key, (trendMap.get(key) || 0) + r.amountCent);
  }

  const byCategory = Array.from(byCategoryMap.entries()).map(([category, v]) => ({ category, amount: v.amount, count: v.count }));
  const trend = Array.from(trendMap.entries()).map(([date, amount]) => ({ date, amount }));
  const frequency = byCategory.map(x => ({ category: x.category, count: x.count }));
  byCategory.sort((a,b) => b.amount - a.amount);
  trend.sort((a,b) => a.date.localeCompare(b.date));
  return { byCategory, trend, frequency };
}

analysisRouter.get('/analysis/insights', async (req, res) => {
  try {
    const from = req.query.from ? new Date(String(req.query.from)) : undefined;
    const to = req.query.to ? new Date(String(req.query.to)) : undefined;

    const summary = await getSummary(from, to);

    const persona = await prisma.persona.findFirst().catch(() => null);

    const apiKey = process.env.DEEPSEEK_API_KEY;
    let insight: { summary: string[]; recommendation: string } | null = null;

    if (apiKey) {
      const sys = '你是财务洞察助手。根据给定的消费聚合(byCategory/trend/frequency)与用户画像，输出 JSON：{ "summary": string[2..3], "recommendation": string }。内容简洁、可执行，避免夸大承诺。';
      const user = {
        summary,
        persona: persona || {},
      };
      const body = {
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: sys },
          { role: 'user', content: JSON.stringify(user) },
        ],
        temperature: 0.2,
        max_tokens: 600,
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
          try { insight = JSON.parse(raw); } catch { /* ignore */ }
        }
      }
    }

    if (!insight) {
      const top = summary.byCategory[0];
      const total = summary.byCategory.reduce((s,x) => s + Math.abs(x.amount), 0);
      const topPct = top ? Math.round(Math.abs(top.amount) / (total || 1) * 100) : 0;
      insight = {
        summary: [
          top ? `主要支出集中在「${top.category}」约占 ${topPct}%。` : '暂无明显支出分布。',
          `近${summary.trend.length}天有${summary.frequency.reduce((s,x)=>s+x.count,0)}笔记录。`,
        ],
        recommendation: top ? `建议本周为「${top.category}」设置上限并跟踪（如较过去周均下降 10%）。` : '建议开始记录分类预算，形成对比基线。',
      };
    }

    return res.json({ code: 0, message: 'ok', data: insight });
  } catch (e: any) {
    return res.status(500).json({ code: 500, message: e?.message || 'insights failed' });
  }
});
