import { Router } from "express";
import { requirePermission } from "../../../middlewares/requirePermission.js";
import { Permission } from "../../../types/permission.js";

const router = Router();

router.get("/progress", requirePermission(Permission.TRANSACTION_READ), async (req, res) => {
  const goalId = req.query.goalId ? String(req.query.goalId) : undefined;

  const base = [
    { goalId: "budget", progress: 0.62, updatedAt: new Date().toISOString() },
    { goalId: "saving", progress: 0.44, updatedAt: new Date().toISOString() }
  ];

  const data = goalId ? base.filter((item) => item.goalId === goalId) : base;
  res.json({ ok: true, code: 0, message: "ok", data });
});

router.post("/generate", requirePermission(Permission.TRANSACTION_READ), async (req, res) => {
  const target = req.body?.target ? String(req.body.target) : "财务健康";
  const budget = Number(req.body?.budget ?? 0);
  const deadline = req.body?.deadline ? String(req.body.deadline) : undefined;
  const constraints = Array.isArray(req.body?.constraints)
    ? req.body.constraints.map((item: unknown) => String(item))
    : [];

  const budgetText = Number.isFinite(budget) && budget > 0 ? `每月可支配预算约${budget}` : "先建立可执行预算";
  const deadlineText = deadline ? `目标截止时间为${deadline}` : "建议先设定明确时间边界";
  const constraintText = constraints.length ? `约束条件：${constraints.join("、")}` : "无额外硬约束";

  res.json({
    ok: true,
    code: 0,
    message: "ok",
    data: {
      plans: [
        {
          name: `${target}30天执行计划`,
          rationale: `结合当前输入生成，${budgetText}。`,
          steps: ["建立预算分类", "每日记账", "每周复盘并微调"],
          checkpoints: ["第1周完成支出分类", "第2周可选支出下降5%", "第4周形成稳定节奏"]
        },
        {
          name: `${target}90天稳态计划`,
          rationale: `${deadlineText}；${constraintText}。`,
          steps: ["设置自动转储", "保留应急现金", "月末检视并复盘"],
          checkpoints: ["第1个月达成计划执行率80%", "第2个月保持连续执行", "第3个月达成目标里程碑"]
        }
      ]
    }
  });
});

export default router;
