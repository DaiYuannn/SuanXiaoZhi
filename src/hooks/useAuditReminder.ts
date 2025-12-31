import { useEffect, useState, useCallback } from 'react';
import { fetchReminders, createReminder, updateReminderStatus } from '../api/endpoints';
import type { ReminderItem } from '../api/types';

export type AuditReminderFrequency = 'daily' | 'weekly' | 'monthly';

export interface AuditReminderSettings {
  enabled: boolean;
  frequency: AuditReminderFrequency;
  hour: number; // 0-23
  snoozeMinutes?: number; // default 120
  lastCompletedAt?: string; // ISO timestamp
  lastShownAt?: string; // ISO timestamp
}

const STORAGE_KEY = 'auditReminderSettings';

function startOfPeriod(date: Date, freq: AuditReminderFrequency, hour: number): Date {
  const d = new Date(date);
  d.setMinutes(0, 0, 0);
  d.setHours(hour);
  if (freq === 'daily') {
    // today at hour
    return d;
  }
  if (freq === 'weekly') {
    // set to Monday of this week at hour
    const day = d.getDay(); // 0 Sunday
    const diff = (day === 0 ? -6 : 1 - day); // move to Monday
    d.setDate(d.getDate() + diff);
    return d;
  }
  // monthly
  d.setDate(1);
  return d;
}

function parseISO(ts?: string): Date | undefined {
  if (!ts) return undefined;
  const d = new Date(ts);
  return isNaN(d.getTime()) ? undefined : d;
}

export function loadAuditReminderSettings(): AuditReminderSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { enabled: false, frequency: 'monthly', hour: 20, snoozeMinutes: 120 };
}

export function saveAuditReminderSettings(s: AuditReminderSettings) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch {}
}

export function useAuditReminder() {
  const [settings, setSettings] = useState<AuditReminderSettings>(() => loadAuditReminderSettings());
  const [visible, setVisible] = useState(false);
  const [serverReminder, setServerReminder] = useState<ReminderItem | null>(null);

  const checkDue = useCallback(() => {
    // 若存在服务端提醒，则以服务端为准
    if (serverReminder) {
      if (serverReminder.status !== 'PENDING') return false;
      const dueAt = new Date(serverReminder.dueAt);
      if (isNaN(dueAt.getTime())) return false;
      return new Date() >= dueAt;
    }
    // 否则走本地设置
    if (!settings.enabled) return false;
    const now = new Date();
    const periodStart = startOfPeriod(now, settings.frequency, settings.hour ?? 20);
    const completedAt = parseISO(settings.lastCompletedAt);
    if (completedAt && completedAt >= periodStart) return false;
    // snooze check
    const lastShown = parseISO(settings.lastShownAt);
    const snoozeMs = (settings.snoozeMinutes ?? 120) * 60 * 1000;
    if (lastShown && now.getTime() - lastShown.getTime() < snoozeMs) return false;
    // ensure current time passed the reminder hour of today (for daily) or period start otherwise
    if (now < periodStart) return false;
    return true;
  }, [settings, serverReminder]);

  useEffect(() => {
    setVisible(checkDue());
  }, [checkDue]);

  // 首次尝试拉取服务端提醒（类型为 AUDIT），失败则保持本地逻辑
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetchReminders();
        const list = res?.data || [];
        const audit = (list as ReminderItem[]).find(r => r.type === 'AUDIT');
        if (!mounted) return;
        if (audit) {
          setServerReminder(audit);
          // 同步频率与时间用于UI展示
          if (audit.config?.frequency || audit.config?.timeOfDay) {
            const hour = audit.config?.timeOfDay ? parseInt(audit.config.timeOfDay.split(':')[0]) : (settings.hour ?? 20);
            const freq: AuditReminderFrequency = audit.config?.frequency === 'DAY' ? 'daily' : audit.config?.frequency === 'WEEK' ? 'weekly' : 'monthly';
            const merged = { ...settings, enabled: true, frequency: freq, hour };
            setSettings(merged);
            saveAuditReminderSettings(merged);
          }
        } else {
          // 若无服务端提醒且本地开启，则尝试创建一个默认的 AUDIT 提醒（可选）
          if (settings.enabled) {
            try {
              const nextHour = settings.hour ?? 20;
              const today = new Date();
              today.setHours(nextHour, 0, 0, 0);
              const payload: Partial<ReminderItem> = { title: '记账校对', type: 'AUDIT', dueAt: today.toISOString(), status: 'PENDING', config: { frequency: settings.frequency === 'daily' ? 'DAY' : settings.frequency === 'weekly' ? 'WEEK' : 'MONTH', timeOfDay: `${String(nextHour).padStart(2,'0')}:00` } };
              const created = await createReminder(payload);
              if (mounted) setServerReminder(created.data);
            } catch {}
          }
        }
      } catch {}
    })();
    return () => { mounted = false; };
  }, []);

  const snooze = useCallback(() => {
    if (serverReminder) {
      updateReminderStatus(serverReminder.id, 'SNOOZE').finally(() => {
        setVisible(false);
      });
    } else {
      const next = { ...settings, lastShownAt: new Date().toISOString() };
      setSettings(next);
      saveAuditReminderSettings(next);
      setVisible(false);
    }
  }, [settings, serverReminder]);

  const markDone = useCallback(() => {
    if (serverReminder) {
      updateReminderStatus(serverReminder.id, 'DONE').finally(() => {
        setVisible(false);
      });
    } else {
      const next = { ...settings, lastCompletedAt: new Date().toISOString() };
      setSettings(next);
      saveAuditReminderSettings(next);
      setVisible(false);
    }
  }, [settings, serverReminder]);

  const dismissToday = useCallback(() => {
    // treat as snooze until next period boundary by using a long snooze (but simple: set lastShownAt to now)
    if (serverReminder) {
      updateReminderStatus(serverReminder.id, 'SNOOZE').finally(() => setVisible(false));
    } else {
      const next = { ...settings, lastShownAt: new Date().toISOString() };
      setSettings(next);
      saveAuditReminderSettings(next);
      setVisible(false);
    }
  }, [settings, serverReminder]);

  const reload = useCallback(() => setSettings(loadAuditReminderSettings()), []);

  return { settings, visible, snooze, markDone, dismissToday, reload };
}
