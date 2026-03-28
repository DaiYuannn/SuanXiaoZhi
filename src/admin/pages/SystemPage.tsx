import React, { useEffect, useMemo, useState } from "react";
import SurfaceCard from "../../shared/components/ui/SurfaceCard";
import { get } from "../../shared/utils/http-client";

type SystemSummary = {
  uptimeSec: number;
  mode: string;
  userCount: number;
  txCount: number;
  auditCount: number;
};

type AuditEvent = {
  id: string;
  action?: string;
  detail?: string;
  ts: string | number;
  actorId?: string;
};

const SystemPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<SystemSummary | null>(null);
  const [auditRows, setAuditRows] = useState<AuditEvent[]>([]);
  const [keyword, setKeyword] = useState("");

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [systemRes, auditRes] = await Promise.all([
        get<{ ok: boolean; system: SystemSummary }>("/api/v1/admin/system"),
        get<{ ok: boolean; data: AuditEvent[] }>("/api/v1/admin/system/audit")
      ]);
      setSummary(systemRes.system);
      setAuditRows(auditRes.data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "系统数据加载失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const visibleAudit = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    if (!q) {
      return auditRows;
    }
    return auditRows.filter((item) => {
      const action = String(item.action ?? "").toLowerCase();
      const actorId = String(item.actorId ?? "").toLowerCase();
      const detail = String(item.detail ?? "").toLowerCase();
      return action.includes(q) || actorId.includes(q) || detail.includes(q);
    });
  }, [auditRows, keyword]);

  const formatUptime = (value: number): string => {
    const hours = Math.floor(value / 3600);
    const mins = Math.floor((value % 3600) / 60);
    return `${hours}h ${mins}m`;
  };

  return (
    <div className="space-y-5">
      <SurfaceCard className="p-5" tone="admin">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">系统管理</h1>
            <p className="mt-1 text-sm text-slate-500">支持运行状态监控、审计日志查询与系统健康检查。</p>
          </div>
          <button onClick={() => void load()} className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700">
            刷新
          </button>
        </div>
      </SurfaceCard>

      {error && <div className="rounded-xl bg-rose-50 p-4 text-sm text-rose-600">{error}</div>}
      {loading && <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">系统数据加载中...</div>}

      <section className="grid grid-cols-1 gap-4 md:grid-cols-5">
        <SurfaceCard className="p-4" tone="admin" interactive>
          <p className="text-sm text-slate-500">运行模式</p>
          <p className="mt-1 text-xl font-bold text-slate-800">{summary?.mode ?? '-'}</p>
        </SurfaceCard>
        <SurfaceCard className="p-4" tone="admin" interactive>
          <p className="text-sm text-slate-500">系统运行时长</p>
          <p className="mt-1 text-xl font-bold text-slate-800">{summary ? formatUptime(summary.uptimeSec) : '-'}</p>
        </SurfaceCard>
        <SurfaceCard className="p-4" tone="admin" interactive>
          <p className="text-sm text-slate-500">用户总数</p>
          <p className="mt-1 text-xl font-bold text-slate-800">{summary?.userCount ?? 0}</p>
        </SurfaceCard>
        <SurfaceCard className="p-4" tone="admin" interactive>
          <p className="text-sm text-slate-500">交易总数</p>
          <p className="mt-1 text-xl font-bold text-slate-800">{summary?.txCount ?? 0}</p>
        </SurfaceCard>
        <SurfaceCard className="p-4" tone="admin" interactive>
          <p className="text-sm text-slate-500">审计事件</p>
          <p className="mt-1 text-xl font-bold text-slate-800">{summary?.auditCount ?? 0}</p>
        </SurfaceCard>
      </section>

      <SurfaceCard className="p-5" tone="admin">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-800">审计日志</h2>
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索 action / actor / detail"
            className="w-full max-w-sm rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-3 py-3">时间</th>
                <th className="px-3 py-3">动作</th>
                <th className="px-3 py-3">操作者</th>
                <th className="px-3 py-3">详情</th>
              </tr>
            </thead>
            <tbody>
              {visibleAudit.map((item) => (
                <tr key={item.id} className="border-b border-slate-100 text-sm text-slate-700 hover:bg-slate-50">
                  <td className="px-3 py-3">{new Date(item.ts).toLocaleString('zh-CN')}</td>
                  <td className="px-3 py-3">{item.action ?? '-'}</td>
                  <td className="px-3 py-3">{item.actorId ?? '-'}</td>
                  <td className="px-3 py-3 max-w-[380px] truncate" title={item.detail ?? ''}>{item.detail ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SurfaceCard>
    </div>
  );
};

export default SystemPage;
