import { AUDIT_BATCH_SIZE, AUDIT_ENDPOINT, AUDIT_FLUSH_INTERVAL_MS, AUDIT_MAX_BACKLOG } from '../config';

export interface AuditLogRecord {
  ts: number;               // 时间戳
  type: 'api' | 'ui' | 'nav' | 'error';
  action: string;           // 动作描述/事件名
  detail?: any;             // 结构化详情
  uid?: string;             // 用户ID（若有）
  traceId?: string;         // 关联链路ID（API调用、对话会话等）
  level?: 'info' | 'warn' | 'error';
}

let queue: AuditLogRecord[] = [];
let flushing = false;
let started = false;

function startTimer() {
  if (started) return;
  started = true;
  setInterval(() => flush().catch(() => {}), AUDIT_FLUSH_INTERVAL_MS);
  window.addEventListener('beforeunload', () => {
    try { navigator.sendBeacon?.(AUDIT_ENDPOINT, JSON.stringify(queue.slice(0, AUDIT_BATCH_SIZE))); } catch {};
  });
}

export function audit(record: Omit<AuditLogRecord, 'ts'>) {
  startTimer();
  if (queue.length >= AUDIT_MAX_BACKLOG) {
    // 丢弃最旧，保持队列长度
    queue.shift();
  }
  // 统一补全 ts 与 level 默认值
  queue.push({ ts: Date.now(), level: record.level || 'info', ...record });
  if (queue.length >= AUDIT_BATCH_SIZE) {
    flush();
  }
}

export async function flush() {
  if (flushing || queue.length === 0) return;
  flushing = true;
  const batch = queue.splice(0, AUDIT_BATCH_SIZE);
  try {
    await fetch(AUDIT_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(batch),
      keepalive: true,
    });
  } catch (e) {
    // 失败重新放回（前置）
    queue = batch.concat(queue).slice(0, AUDIT_MAX_BACKLOG);
  } finally {
    flushing = false;
  }
}

// 便捷包装
export const auditApi = (action: string, detail?: any, traceId?: string) => audit({ type: 'api', action, detail, traceId });
export const auditUI = (action: string, detail?: any) => audit({ type: 'ui', action, detail });
export const auditNav = (path: string) => audit({ type: 'nav', action: 'navigate', detail: { path } });
export const auditError = (action: string, error: any) => audit({ type: 'error', level: 'error', action, detail: { message: error?.message, stack: error?.stack } });
