import { Router } from "express";
import { prisma } from "../../../db.js";
import { requirePermission } from "../../../middlewares/requirePermission.js";
import { resolveRequestUser } from "../../../services/user-context.js";
import { Permission } from "../../../types/permission.js";

const router = Router();

router.get("/tasks", requirePermission(Permission.TRANSACTION_READ), async (req, res, next) => {
  try {
    const user = await resolveRequestUser(req);
    const tasks = await prisma.task.findMany({ include: { userTasks: { where: { userId: user.id } } } });

    res.json({
      ok: true,
      code: 0,
      message: "ok",
      data: tasks.map((task) => {
        const userTask = task.userTasks[0];
        return {
          id: task.id,
          code: task.code,
          title: task.name,
          description: task.description,
          points: task.points,
          status: userTask?.status ?? "PENDING",
          progress: userTask?.progress ?? 0,
          target: task.target
        };
      })
    });
  } catch (error) {
    next(error);
  }
});

router.post("/claim", requirePermission(Permission.TRANSACTION_WRITE), async (req, res, next) => {
  try {
    const user = await resolveRequestUser(req);
    const taskId = String(req.body?.taskId ?? "");
    if (!taskId) {
      res.status(400).json({ ok: false, code: 400, message: "taskId required" });
      return;
    }

    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) {
      res.status(404).json({ ok: false, code: 404, message: "task not found" });
      return;
    }

    const userTask = await prisma.userTask.findUnique({ where: { userId_taskId: { userId: user.id, taskId } } });
    if (!userTask || userTask.status !== "COMPLETED") {
      res.status(400).json({ ok: false, code: 400, message: "task not completed" });
      return;
    }

    await prisma.$transaction([
      prisma.userTask.update({ where: { id: userTask.id }, data: { status: "CLAIMED" } }),
      prisma.user.update({ where: { id: user.id }, data: { points: { increment: task.points } } }),
      prisma.pointLog.create({ data: { userId: user.id, amount: task.points, reason: `Task reward: ${task.name}` } })
    ]);

    res.json({ ok: true, code: 0, message: "ok", data: { claimed: true } });
  } catch (error) {
    next(error);
  }
});

router.get("/points", requirePermission(Permission.TRANSACTION_READ), async (req, res, next) => {
  try {
    const user = await resolveRequestUser(req);
    const detail = await prisma.user.findUnique({ where: { id: user.id }, select: { points: true } });
    res.json({ ok: true, code: 0, message: "ok", data: { points: detail?.points ?? 0 } });
  } catch (error) {
    next(error);
  }
});

export default router;