import { Router } from "express";
import { prisma } from "../../../db.js";
import { resolveRequestUser } from "../../../services/user-context.js";

const router = Router();

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

const centsToYuan = (cents: number): number => Number((Math.abs(cents) / 100).toFixed(2));

const buildFallbackReply = (question: string, txCount: number, expenseYuan: number, topCategory: string): string => {
  const text = question.toLowerCase();

  if (text.includes("预算") || text.includes("超支")) {
    return `先做一个本周可执行预算：\n1. 近30天总支出约 ¥${expenseYuan}，按周可先定在 ¥${Math.max(200, Math.round(expenseYuan / 4))}。\n2. 高频分类是“${topCategory}”，先把它降 10%-15%。\n3. 每晚固定 1 次复盘，当天超预算就次日降级消费。`;
  }

  if (text.includes("理财") || text.includes("产品") || text.includes("投资")) {
    return `基于最近 ${txCount} 笔交易，建议先做稳健配置：\n1. 预留 3-6 个月应急金。\n2. 低风险产品为主（60%-80%），其余做中风险分散。\n3. 不用短钱做长投，先把月度现金流稳定下来。`;
  }

  return `我先给你一个可执行版本：\n1. 最近 ${txCount} 笔记录里，总支出约 ¥${expenseYuan}。\n2. 当前主要消费分类是“${topCategory}”，优先从这里控支。\n3. 如果你告诉我目标（省钱/还款/理财），我可以给你一份 7 天行动清单。`;
};

router.post("/chat", async (req, res, next) => {
  try {
    const user = await resolveRequestUser(req);
    const body = req.body ?? {};
    const messages = (Array.isArray(body.messages) ? body.messages : []).filter(
      (item: unknown): item is ChatMessage =>
        typeof (item as { role?: unknown })?.role === "string" &&
        typeof (item as { content?: unknown })?.content === "string"
    );

    const lastUserText =
      typeof body.message === "string" && body.message.trim().length > 0
        ? body.message.trim()
        : messages[messages.length - 1]?.content;

    if (!lastUserText) {
      res.status(400).json({ ok: false, code: 400, message: "message required" });
      return;
    }

    let sessionId = typeof body.sessionId === "string" ? body.sessionId : undefined;
    if (!sessionId) {
      const session = await prisma.chatSession.create({
        data: { userId: user.id, title: lastUserText.slice(0, 20) }
      });
      sessionId = session.id;
    }

    await prisma.chatMessage.create({ data: { sessionId, role: "user", content: lastUserText } });

    const recentTx = await prisma.transaction.findMany({
      where: { userId: user.id },
      orderBy: { ts: "desc" },
      take: 30
    });
    const expenseRows = recentTx.filter((row) => row.type === "EXPENSE");
    const expenseTotalCent = expenseRows.reduce((sum, row) => sum + Math.abs(row.amountCent), 0);
    const categoryCounter = new Map<string, number>();
    expenseRows.forEach((row) => {
      const key = row.categoryName ?? "未分类";
      categoryCounter.set(key, (categoryCounter.get(key) ?? 0) + Math.abs(row.amountCent));
    });
    const sortedCategories = [...categoryCounter.entries()].sort((a, b) => b[1] - a[1]);
    const topCategory = sortedCategories[0]?.[0] ?? "未分类";
    const topCategoryCost = centsToYuan(sortedCategories[0]?.[1] ?? 0);

    const systemPrompt =
      "你是算小智财务助手。请根据用户交易做强相关回答，先给结论，再给3条可执行建议，避免空话。" +
      ` 用户最近交易${recentTx.length}笔，支出合计约¥${centsToYuan(expenseTotalCent)}，最高支出分类:${topCategory}(约¥${topCategoryCost})。`;

    let content = "";
    const apiKey = process.env.DEEPSEEK_API_KEY;
    const baseUrl = process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com";
    const model = process.env.DEEPSEEK_MODEL ?? "deepseek-chat";

    if (apiKey && apiKey !== "mock-key" && process.env.NODE_ENV !== "test") {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 10000);
        const response = await fetch(`${baseUrl}/v1/chat/completions`, {
          method: "POST",
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: systemPrompt },
              ...(messages.length
                ? messages.filter((item: ChatMessage) => item.role !== "system").slice(-8)
                : [{ role: "user", content: lastUserText }])
            ],
            temperature: 0.3,
            max_tokens: 700,
            stream: false
          })
        });
        clearTimeout(timer);

        if (response.ok) {
          const json = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
          content = json.choices?.[0]?.message?.content ?? "";
        }
      } catch {
        content = "";
      }
    }

    if (!content) {
      content = buildFallbackReply(lastUserText, recentTx.length, centsToYuan(expenseTotalCent), topCategory);
    }

    await prisma.chatMessage.create({ data: { sessionId, role: "assistant", content } });

    res.json({ ok: true, code: 0, message: "ok", data: { content, sessionId } });
  } catch (error) {
    next(error);
  }
});

export default router;