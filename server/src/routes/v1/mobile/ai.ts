import { Router } from "express";
import { prisma } from "../../../db.js";
import { resolveRequestUser } from "../../../services/user-context.js";

const router = Router();

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

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
      take: 8
    });
    const expenseTotal = recentTx.reduce((sum, row) => sum + Math.abs(row.amountCent), 0);

    const systemPrompt =
      "你是算小智财务助手，请根据用户最近交易给出可执行建议。" +
      ` 最近${recentTx.length}笔总支出(分):${expenseTotal}`;

    let content = "";
    const apiKey = process.env.DEEPSEEK_API_KEY;
    const baseUrl = process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com";
    const model = process.env.DEEPSEEK_MODEL ?? "deepseek-chat";

    if (apiKey && process.env.NODE_ENV !== "test") {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 1500);
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
                ? messages.filter((item: ChatMessage) => item.role !== "system")
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
      content = `已分析最近${recentTx.length}笔记录，建议优先控制高频分类并设置本周预算提醒。`;
    }

    await prisma.chatMessage.create({ data: { sessionId, role: "assistant", content } });

    res.json({ ok: true, code: 0, message: "ok", data: { content, sessionId } });
  } catch (error) {
    next(error);
  }
});

export default router;