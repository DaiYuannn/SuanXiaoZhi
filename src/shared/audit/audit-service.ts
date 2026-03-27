import { AUDIT_BATCH_SIZE, AUDIT_ENDPOINT, AUDIT_FLUSH_INTERVAL_MS, AUDIT_MAX_BACKLOG } from "../config/env.js";

export interface AuditEvent {
  event: string;
  actorId: string;
  meta?: Record<string, string | number | boolean>;
  ts: number;
}

export interface AuditConfig {
  batchSize: number;
}

export class AuditService {
  private readonly queue: AuditEvent[] = [];
  private readonly config: AuditConfig;

  public constructor(config: AuditConfig) {
    this.config = config;
  }

  public track(event: AuditEvent): AuditEvent[] {
    this.queue.push(event);
    if (this.queue.length >= this.config.batchSize) {
      return this.flush();
    }

    return [];
  }

  public flush(): AuditEvent[] {
    const snapshot = [...this.queue];
    this.queue.length = 0;
    return snapshot;
  }
}

export interface AuditLogRecord {
  ts: number;
  type: "api" | "ui" | "nav" | "error";
  action: string;
  detail?: unknown;
  uid?: string;
  traceId?: string;
  level?: "info" | "warn" | "error";
}

let queue: AuditLogRecord[] = [];
let flushing = false;
let started = false;

const startTimer = (): void => {
  if (started || typeof window === "undefined") {
    return;
  }

  started = true;
  window.setInterval(() => {
    flush().catch(() => undefined);
  }, AUDIT_FLUSH_INTERVAL_MS);

  window.addEventListener("beforeunload", () => {
    try {
      const payload = JSON.stringify(queue.slice(0, AUDIT_BATCH_SIZE));
      navigator.sendBeacon?.(AUDIT_ENDPOINT, payload);
    } catch {
      // ignore audit transport errors
    }
  });
};

export const audit = (record: Omit<AuditLogRecord, "ts">): void => {
  startTimer();
  if (queue.length >= AUDIT_MAX_BACKLOG) {
    queue.shift();
  }

  queue.push({ ts: Date.now(), level: record.level ?? "info", ...record });
  if (queue.length >= AUDIT_BATCH_SIZE) {
    void flush();
  }
};

export const flush = async (): Promise<void> => {
  if (flushing || queue.length === 0 || typeof fetch === "undefined") {
    return;
  }

  flushing = true;
  const batch = queue.splice(0, AUDIT_BATCH_SIZE);
  try {
    await fetch(AUDIT_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(batch),
      keepalive: true
    });
  } catch {
    queue = batch.concat(queue).slice(0, AUDIT_MAX_BACKLOG);
  } finally {
    flushing = false;
  }
};

export const auditApi = (action: string, detail?: unknown, traceId?: string): void => {
  audit({ type: "api", action, detail, traceId });
};

export const auditUI = (action: string, detail?: unknown): void => {
  audit({ type: "ui", action, detail });
};

export const auditNav = (path: string): void => {
  audit({ type: "nav", action: "navigate", detail: { path } });
};

export const auditError = (action: string, error: unknown): void => {
  const detail =
    error instanceof Error
      ? { message: error.message, stack: error.stack }
      : { message: String(error) };
  audit({ type: "error", level: "error", action, detail });
};