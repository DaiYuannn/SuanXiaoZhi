import { Router } from "express";
import { prisma } from "../../../db.js";
import { requirePermission } from "../../../middlewares/requirePermission.js";
import { resolveRequestUser } from "../../../services/user-context.js";
import { Permission } from "../../../types/permission.js";

const router = Router();

// GET /api/v1/mobile/risk/assessments - 用户风险测评历史
router.get("/assessments", requirePermission(Permission.TRANSACTION_READ), async (req, res, next) => {
  try {
    const user = await resolveRequestUser(req);
    const rows = await prisma.riskAssessment.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, score: true, level: true, status: true, createdAt: true }
    });

    res.json({
      ok: true,
      code: 0,
      message: "ok",
      data: rows.map((row) => ({
        assessmentId: row.id,
        score: row.score,
        level: row.level,
        status: row.status,
        createdAt: row.createdAt.toISOString()
      }))
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/mobile/risk/assessment/start - 开始新的风险测评
router.post("/assessment/start", requirePermission(Permission.TRANSACTION_WRITE), async (req, res, next) => {
  try {
    const user = await resolveRequestUser(req);

    const assessment = await prisma.riskAssessment.create({
      data: {
        userId: user.id,
        score: 0,
        level: "MID",
        status: "NEW"
      }
    });

    res.status(201).json({
      ok: true,
      code: 0,
      message: "ok",
      data: {
        assessmentId: assessment.id,
        status: assessment.status,
        questions: [
          { qid: "q1", text: "您的投资经验？", options: [{ id: "a1", text: "无" }, { id: "a2", text: "1-3年" }, { id: "a3", text: "3年以上" }] },
          { qid: "q2", text: "您能承受的最大亏损？", options: [{ id: "b1", text: "本金不亏" }, { id: "b2", text: "10%以内" }, { id: "b3", text: "20%以上" }] },
          { qid: "q3", text: "您的投资目标是？", options: [{ id: "c1", text: "保值" }, { id: "c2", text: "稳健增值" }, { id: "c3", text: "高收益" }] },
          { qid: "q4", text: "您的投资期限偏好？", options: [{ id: "d1", text: "短期（1年内）" }, { id: "d2", text: "中期（1-3年）" }, { id: "d3", text: "长期（3年以上）" }] },
          { qid: "q5", text: "遇到市场大跌您会？", options: [{ id: "e1", text: "立即赎回" }, { id: "e2", text: "观望" }, { id: "e3", text: "逢低加仓" }] }
        ]
      }
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/mobile/risk/assessment/submit - 提交测评答案
router.post("/assessment/submit", requirePermission(Permission.TRANSACTION_WRITE), async (req, res, next) => {
  try {
    const user = await resolveRequestUser(req);
    const body = req.body ?? {};
    const assessmentId = String(body.assessmentId ?? "");
    const answers = body.answers as Array<{ qid: string; optionId: string }> | undefined;

    if (!assessmentId || !answers?.length) {
      res.status(400).json({ ok: false, code: 400, message: "assessmentId and answers required" });
      return;
    }

    const assessment = await prisma.riskAssessment.findUnique({ where: { id: assessmentId } });
    if (!assessment || assessment.userId !== user.id) {
      res.status(404).json({ ok: false, code: 404, message: "assessment not found" });
      return;
    }

    if (assessment.status === "COMPLETED") {
      res.status(400).json({ ok: false, code: 400, message: "assessment already completed" });
      return;
    }

    // Simple scoring: each answer's option index determines score
    let totalScore = 0;
    for (const answer of answers) {
      const optIdx = answer.optionId?.length ? answer.optionId.charCodeAt(answer.optionId.length - 1) - "1".charCodeAt(0) : 0;
      totalScore += Math.min(Math.max(optIdx + 1, 1), 3) * 20;
    }

    const level = totalScore >= 80 ? "HIGH" : totalScore >= 50 ? "MID" : "LOW";

    const updated = await prisma.riskAssessment.update({
      where: { id: assessmentId },
      data: {
        score: totalScore,
        level,
        status: "COMPLETED",
        answers: JSON.stringify(answers)
      }
    });

    res.json({
      ok: true,
      code: 0,
      message: "ok",
      data: {
        assessmentId: updated.id,
        score: updated.score,
        level: updated.level,
        status: updated.status
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/mobile/risk/assessment/result - 获取测评结果
router.get("/assessment/result", requirePermission(Permission.TRANSACTION_READ), async (req, res, next) => {
  try {
    const user = await resolveRequestUser(req);
    const assessmentId = String(req.query.assessmentId ?? "");

    if (!assessmentId) {
      res.status(400).json({ ok: false, code: 400, message: "assessmentId required" });
      return;
    }

    const assessment = await prisma.riskAssessment.findUnique({ where: { id: assessmentId } });
    if (!assessment || assessment.userId !== user.id) {
      res.status(404).json({ ok: false, code: 404, message: "assessment not found" });
      return;
    }

    res.json({
      ok: true,
      code: 0,
      message: "ok",
      data: {
        assessmentId: assessment.id,
        score: assessment.score,
        level: assessment.level,
        status: assessment.status,
        answers: assessment.answers ? JSON.parse(assessment.answers) : null,
        createdAt: assessment.createdAt.toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
