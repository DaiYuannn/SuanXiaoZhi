import React, { useEffect, useState } from "react";
import SurfaceCard from "../../shared/components/ui/SurfaceCard";
import { AUTH_TOKEN_KEY } from "../../shared/config/env.js";

interface SystemOverview {
  userCount: number;
  txCount: number;
  auditCount: number;
}

const AdminDashboardPage: React.FC = () => {
  const [data, setData] = useState<SystemOverview | null>(null);

  useEffect(() => {
    fetch("/api/v1/admin/system", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem(AUTH_TOKEN_KEY) ?? ""}`
      }
    })
      .then((res) => res.json())
      .then((json) => setData(json.system ?? null))
      .catch(() => setData(null));
  }, []);

  const metrics = [
    {
      title: "用户总数",
      value: data?.userCount ?? "-",
      delta: "+4.8%",
      icon: "fa-users",
      accent: "text-cyan-600"
    },
    {
      title: "交易总数",
      value: data?.txCount ?? "-",
      delta: "+12.1%",
      icon: "fa-file-invoice-dollar",
      accent: "text-emerald-600"
    },
    {
      title: "审计记录",
      value: data?.auditCount ?? "-",
      delta: "+2.4%",
      icon: "fa-shield-alt",
      accent: "text-indigo-600"
    }
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-gradient-to-r from-[#0f766e] via-[#0f766e] to-[#155e75] p-6 text-white shadow-[0_18px_40px_rgba(15,118,110,0.28)]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/75">Overview</p>
            <h1 className="mt-1 text-2xl font-bold">运营总览面板</h1>
            <p className="mt-2 text-sm text-white/85">监控用户、交易与风控数据，快速定位异常波动。</p>
          </div>
          <div className="hidden md:flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15">
            <i className="fas fa-chart-line text-2xl"></i>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {metrics.map((item) => (
          <SurfaceCard key={item.title} className="p-5" tone="admin" interactive>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm text-slate-500">{item.title}</p>
              <i className={`fas ${item.icon} ${item.accent}`}></i>
            </div>
            <p className="text-3xl font-bold text-slate-800">{item.value}</p>
            <p className="mt-2 text-xs font-semibold text-emerald-600">{item.delta} 较上周</p>
          </SurfaceCard>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <SurfaceCard className="xl:col-span-2 p-6" tone="admin">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-800">风控与审核趋势</h2>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-500">最近7天</span>
          </div>
          <div className="space-y-4">
            {[
              { label: "高风险交易预警", value: 74, color: "bg-rose-500" },
              { label: "人工复核完成率", value: 88, color: "bg-cyan-500" },
              { label: "自动拦截命中率", value: 63, color: "bg-emerald-500" }
            ].map((row) => (
              <div key={row.label}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="text-slate-600">{row.label}</span>
                  <span className="font-semibold text-slate-800">{row.value}%</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100">
                  <div className={`h-2 rounded-full ${row.color}`} style={{ width: `${row.value}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard className="p-6" tone="admin">
          <h2 className="text-lg font-semibold text-slate-800">实时事件流</h2>
          <ul className="mt-4 space-y-3 text-sm">
            {[
              "10:21 交易审核队列新增 12 条",
              "09:58 风控策略 R-41 已上线",
              "09:34 用户批量导入完成",
              "09:10 系统健康检查通过"
            ].map((evt) => (
              <li key={evt} className="rounded-xl bg-slate-50 px-3 py-2 text-slate-600">{evt}</li>
            ))}
          </ul>
        </SurfaceCard>
      </section>
    </div>
  );
};

export default AdminDashboardPage;
