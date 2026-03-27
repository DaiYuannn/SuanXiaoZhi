import { Router } from "express";
import { prisma } from "../../../db.js";
import { requirePermission } from "../../../middlewares/requirePermission.js";
import { resolveRequestUser } from "../../../services/user-context.js";
import { Permission } from "../../../types/permission.js";

const router = Router();

router.post("/assessment/start", requirePermission(Permission.REPORT_READ), async (req, res, next) => {
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

    res.json({
      ok: true,
      code: 0,
      message: "ok",
      data: {
        assessmentId: assessment.id,
        status: assessment.status,
        questions: [
          {
            id: "q1",
            text: "如果投资产品短期波动，你会如何？",
            options: [
              { id: "o1", text: "持有观望", score: 2 },
              { id: "o2", text: "立即赎回", score: 0 }
            ]
          },
          {
            id: "q2",
            text: "你对风险承担能力如何？",
            options: [
              { id: "o1", text: "较强", score: 3 },
              { id: "o2", text: "一般", score: 1 }
            ]
          }
        ]
      }
    });
  } catch (error) {
    next(error);
  }
});

router.post("/assessment/submit", requirePermission(Permission.REPORT_READ), async (req, res, next) => {
  try {
    const assessmentId = String(req.body?.assessmentId ?? "");
    const answers = Array.isArray(req.body?.answers) ? req.body.answers : [];
    const score = answers.length * 2;
    const level = score >= 4 ? "HIGH" : score >= 2 ? "MID" : "LOW";

    const row = await prisma.riskAssessment.update({
      where: { id: assessmentId },
      data: {
        score,
        level,
        status: "COMPLETED",
        answers: JSON.stringify(answers)
      }
    });

    res.json({ ok: true, code: 0, message: "ok", data: { assessmentId: row.id, status: row.status, score: row.score, level: row.level } });
  } catch (error) {
    next(error);
  }
});

router.get("/assessment/result", requirePermission(Permission.REPORT_READ), async (req, res, next) => {
  try {
    const assessmentId = String(req.query.assessmentId ?? "");
    const row = await prisma.riskAssessment.findUnique({ where: { id: assessmentId } });
    if (!row) {
      res.status(404).json({ ok: false, code: 404, message: "assessment not found" });
      return;
    }

    res.json({ ok: true, code: 0, message: "ok", data: { assessmentId: row.id, status: row.status, score: row.score, level: row.level } });
  } catch (error) {
    next(error);
  }
});

export default router;