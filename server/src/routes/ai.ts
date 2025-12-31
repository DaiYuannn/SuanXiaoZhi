import { Router } from 'express';
import { prisma } from '../db.js';
import { Transaction } from '@prisma/client';

export const aiRouter = Router();

type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

// Helper to build financial context
async function buildFinancialContext(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { persona: true }
  });
  
  let dbUser = user;
  if (!dbUser) {
     // Fallback: try to find by username if id lookup failed (e.g. if username was passed)
     dbUser = await prisma.user.findUnique({ where: { username: userId } }).catch(() => null);
  }
  
  if (!dbUser) return "用户未找到，无法获取财务数据。";

  // Recent transactions
  const recentTx = await prisma.transaction.findMany({
    where: { userId: dbUser.id },
    orderBy: { ts: 'desc' },
    take: 10
  });

  // Monthly stats (simple approximation)
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthlyTx = await prisma.transaction.findMany({
    where: { 
      userId: dbUser.id,
      ts: { gte: startOfMonth }
    }
  });
  
  const income = monthlyTx.filter((t: Transaction) => t.amountCent > 0).reduce((s: number, t: Transaction) => s + t.amountCent, 0) / 100;
  const expense = monthlyTx.filter((t: Transaction) => t.amountCent < 0).reduce((s: number, t: Transaction) => s + t.amountCent, 0) / 100;

  const txSummary = recentTx.map((t: Transaction) => 
    `${t.ts.toISOString().split('T')[0]} ${t.category} ${t.amountCent/100}元 ${t.note || ''}`
  ).join('\n');

  return `
【用户画像】
风险偏好: ${dbUser.persona?.riskProfile || '未知'}
年龄段: ${dbUser.persona?.ageBand || '未知'}
主要消费: ${dbUser.persona?.spendTopCategories || '未知'}

【本月概况】
收入: ${income.toFixed(2)}
支出: ${Math.abs(expense).toFixed(2)}

【最近10笔交易】
${txSummary}
`;
}

aiRouter.post('/ai/chat', async (req, res) => {
  try {
    const { messages, model, temperature, max_tokens, userId: reqUserId, sessionId: reqSessionId } = req.body || {};
    
    // Default to test_user_01 if not provided (for demo)
    const targetUserId = reqUserId || 'test_user_01'; 
    
    // Find actual DB user
    let dbUser = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!dbUser) {
        dbUser = await prisma.user.findUnique({ where: { username: targetUserId } });
    }
    
    if (!dbUser) {
        // Fallback to first user if specific user not found
        dbUser = await prisma.user.findFirst();
    }

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ code: 400, message: 'messages required' });
    }

    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ code: 500, message: 'missing DEEPSEEK_API_KEY' });
    }

    // 1. Get or Create Session
    let sessionId = reqSessionId;
    if (!sessionId && dbUser) {
        const session = await prisma.chatSession.create({
            data: { userId: dbUser.id, title: messages[messages.length-1].content.slice(0, 20) }
        });
        sessionId = session.id;
    }

    // 2. Build Context
    let systemPrompt = '你是金智通，一位专业的AI财务合伙人。你不仅回答问题，还能主动分析账本，提供预测性规划。请用自然、亲切的语气对话。';
    if (dbUser) {
        const context = await buildFinancialContext(dbUser.id);
        systemPrompt += `\n\n以下是用户的实时财务数据，请基于此回答：\n${context}`;
    }

    // 3. Save User Message
    const lastUserMsg = messages[messages.length - 1];
    if (sessionId && dbUser && lastUserMsg.role === 'user') {
        await prisma.chatMessage.create({
            data: { sessionId, role: 'user', content: lastUserMsg.content }
        });
    }

    // 4. Prepare LLM Payload
    // Filter out previous system messages to avoid duplication if client sends them
    const clientMessages = messages.filter((m: any) => m.role !== 'system');
    const finalMessages = [
        { role: 'system', content: systemPrompt },
        ...clientMessages
    ];

    console.log('--- Generated System Prompt ---');
    console.log(systemPrompt);
    console.log('-----------------------------');

    const body = {
      model: model || 'deepseek-chat',
      messages: finalMessages,
      temperature: temperature ?? 0.3,
      max_tokens: max_tokens ?? 1024,
      stream: false,
    };

    let content = '';
    let rawJson = {};

    try {
        const r = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
        });

        rawJson = await r.json().catch(() => ({}));
        
        if (!r.ok) {
            console.warn('DeepSeek API failed:', r.status, rawJson);
            // Fallback for development/testing if API key is invalid
            if (r.status === 401) {
                content = `[模拟回复] 我已收到您的消息。由于API Key无效，这是模拟回复。\n\n我看到的上下文数据摘要：\n${systemPrompt.split('\n').slice(0, 15).join('\n')}...`;
            } else {
                return res.status(r.status).json({ code: r.status, message: (rawJson as any)?.error?.message || 'deepseek error', data: rawJson });
            }
        } else {
            content = (rawJson as any)?.choices?.[0]?.message?.content ?? '';
        }
    } catch (err) {
        console.error('Fetch error:', err);
        // Fallback for network errors
        content = `[模拟回复] 网络请求失败。这是模拟回复。`;
    }

    // 5. Save Assistant Message
    if (sessionId && dbUser) {
        await prisma.chatMessage.create({
            data: { sessionId, role: 'assistant', content }
        });
    }

    return res.json({ code: 0, message: 'ok', data: { content, sessionId, raw: rawJson } });
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ code: 500, message: e?.message || 'internal error' });
  }
});
