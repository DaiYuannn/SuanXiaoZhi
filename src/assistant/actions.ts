import { aiChat, fetchAnalysisInsights, fetchRecommendedProducts, generatePlans } from '../api/endpoints';

function hasAny(text: string, kws: string[]) {
  return kws.some(k => text.includes(k));
}

function buildAddTransactionLink(p: { date?: string; amount?: number; category?: string; description?: string }) {
  const params = new URLSearchParams();
  if (p.date) params.set('date', p.date.slice(0,10));
  params.set('type', 'expense');
  if (typeof p.amount === 'number') params.set('amount', p.amount.toFixed(2));
  if (p.category) params.set('category', p.category);
  if (p.description) params.set('description', p.description);
  return `/add-transaction?${params.toString()}`;
}

export async function routeAssistantInput(input: string): Promise<string | null> {
  const text = input.trim();
  if (!text) return null;

  // 1) 洞察/分析
  if (hasAny(text, ['洞察','分析','消费分析','消费情况'])) {
    const to = new Date(); const from = new Date(); from.setDate(to.getDate() - 6);
    const r = await fetchAnalysisInsights({ from: from.toISOString(), to: to.toISOString() });
    const s = r.data.summary?.map((x: string) => `• ${x}`).join('\n') || '—';
    const rec = r.data.recommendation || '—';
    return `这是一段基于最近数据的智能解读：\n${s}\n\n建议：${rec}`;
  }

  // 2) 规划/建议
  if (hasAny(text, ['规划','建议','节省','预算','存钱','计划'])) {
    const r = await generatePlans({ target: '控制本月餐饮支出', budget: 3000, deadline: undefined, constraints: [] });
    const plans = r.data.plans || [];
    const body = plans.map((p: any, i: number) => `${i+1}. ${p.name}\n   - ${p.rationale || ''}\n   - 步骤: ${(p.steps||[]).slice(0,3).join('；')}`).join('\n\n');
    return `根据你的需求，给出几套可执行方案：\n${body}\n\n可在规划页“采纳”进入跟踪。`;
  }

  // 3) 产品/推荐
  if (hasAny(text, ['产品','推荐','理财','收益'])) {
    const r = await fetchRecommendedProducts({ riskPreference: 'LOW' });
    const arr = r.data || [];
    if (!arr.length) return '目前没有合适的推荐，请稍后再试。';
    const top = arr.slice(0,3).map((x: any, i: number) => `${i+1}. ${x.product.name}（${x.product.expectedYield}%）`).join('\n');
    return `基于画像偏好，推荐以下产品：\n${top}\n\n可前往“理财产品”查看详情和收益测算。`;
  }

  // 4) 风险/测评
  if (hasAny(text, ['风险','测评','评估','问卷'])) {
    try { window.location.href = '/risk-assessment'; } catch {}
    return '已为你打开风险测评页面，你可以完成问卷获取风险等级。';
  }

  // 5) 记账/识别（文本抽取）
  if (hasAny(text, ['记账','识别','录入','发票','小票'])) {
    const sys = '你是财务记账助手。从用户的自然语言中提取消费信息，输出严格JSON：{ "amount": number, "merchant"?: string, "ts"?: string, "categoryCode"?: string }。categoryCode 从 [food,shopping,transport,entertainment,medical,education,housing,utilities,other] 选择。若缺失字段可省略。只输出JSON。';
    const resp = await aiChat([
      { role: 'system', content: sys },
      { role: 'user', content: text }
    ]);
    let json: any = null;
    try { const m = resp.data.content.match(/\{[\s\S]*\}/); json = JSON.parse(m ? m[0] : resp.data.content); } catch {}
    if (!json) return '我没有从文字中可靠提取到金额与分类，请尝试上传图片或提供更完整描述。';
    const url = buildAddTransactionLink({ date: json.ts, amount: json.amount, category: json.categoryCode, description: json.merchant });
    return `我已为你解析出：金额¥${json.amount || '-'}，商户${json.merchant || '-'}。点击进入记账：${url}`;
  }

  // 默认：走普通聊天
  return null;
}