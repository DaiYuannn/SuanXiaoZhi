import { Router } from "express";
import { requirePermission } from "../../../middlewares/requirePermission.js";
import { Permission } from "../../../types/permission.js";

const router = Router();

type Intent = {
  type: "navigate" | "incentive";
  score: number;
  payload?: { route?: string; to?: string; name?: string };
};

router.post("/recognize", requirePermission(Permission.TRANSACTION_READ), async (req, res) => {
  const text = String(req.body?.text ?? "").trim().toLowerCase();
  const intents: Intent[] = [];

  if (!text) {
    res.json({ ok: true, code: 0, message: "ok", data: intents });
    return;
  }

  if (text.includes("积分") || text.includes("奖励") || text.includes("任务")) {
    intents.push({ type: "incentive", score: 0.9, payload: { to: "/incentives", name: "激励中心" } });
  }

  if (text.includes("预算") || text.includes("规划") || text.includes("计划")) {
    intents.push({ type: "navigate", score: 0.86, payload: { route: "/financial-planning" } });
  }

  if (text.includes("账单") || text.includes("记账") || text.includes("消费")) {
    intents.push({ type: "navigate", score: 0.82, payload: { route: "/accounting" } });
  }

  if (text.includes("理财") || text.includes("产品")) {
    intents.push({ type: "navigate", score: 0.8, payload: { route: "/financial-products" } });
  }

  if (intents.length === 0) {
    intents.push({ type: "navigate", score: 0.6, payload: { route: "/customer-service" } });
  }

  intents.sort((a, b) => b.score - a.score);
  res.json({ ok: true, code: 0, message: "ok", data: intents });
});

export default router;
