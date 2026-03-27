import crypto from "node:crypto";
import { Router } from "express";
import { requirePermission } from "../../../middlewares/requirePermission.js";
import { Permission } from "../../../types/permission.js";

const router = Router();

type PlanStatus = "ongoing" | "done" | "adjusted";

type PlanRecord = {
  planId: string;
  name: string;
  goal?: string;
  content?: unknown;
  status: PlanStatus;
  createdAt: string;
  updatedAt: string;
};

const store = new Map<string, PlanRecord>();

const nowIso = (): string => new Date().toISOString();

router.get("/", requirePermission(Permission.TRANSACTION_READ), async (_req, res) => {
  const data = Array.from(store.values()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  res.json({ ok: true, code: 0, message: "ok", data });
});

router.post("/", requirePermission(Permission.TRANSACTION_WRITE), async (req, res) => {
  const body = req.body ?? {};
  const createdAt = nowIso();
  const record: PlanRecord = {
    planId: crypto.randomUUID(),
    name: String(body.name ?? "新规划"),
    goal: body.goal ? String(body.goal) : undefined,
    content: body.content,
    status:
      body.status === "done" || body.status === "adjusted" || body.status === "ongoing"
        ? body.status
        : "ongoing",
    createdAt,
    updatedAt: createdAt
  };

  store.set(record.planId, record);
  res.status(201).json({ ok: true, code: 0, message: "ok", data: record });
});

router.patch("/:id", requirePermission(Permission.TRANSACTION_WRITE), async (req, res) => {
  const old = store.get(req.params.id);
  if (!old) {
    res.status(404).json({ ok: false, code: 404, message: "plan not found" });
    return;
  }

  const body = req.body ?? {};
  const next: PlanRecord = {
    ...old,
    ...(body.name !== undefined ? { name: String(body.name) } : {}),
    ...(body.goal !== undefined ? { goal: String(body.goal) } : {}),
    ...(body.content !== undefined ? { content: body.content } : {}),
    ...(body.status === "done" || body.status === "adjusted" || body.status === "ongoing"
      ? { status: body.status as PlanStatus }
      : {}),
    updatedAt: nowIso()
  };

  store.set(next.planId, next);
  res.json({ ok: true, code: 0, message: "ok", data: next });
});

router.delete("/:id", requirePermission(Permission.TRANSACTION_WRITE), async (req, res) => {
  const existed = store.has(req.params.id);
  if (!existed) {
    res.status(404).json({ ok: false, code: 404, message: "plan not found" });
    return;
  }

  store.delete(req.params.id);
  res.json({ ok: true, code: 0, message: "ok", data: { planId: req.params.id, deleted: true } });
});

export default router;
