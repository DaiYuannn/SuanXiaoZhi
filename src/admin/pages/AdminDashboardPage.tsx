import React, { useEffect, useState } from "react";

interface SystemOverview {
  userCount: number;
  txCount: number;
  auditCount: number;
}

const AdminDashboardPage: React.FC = () => {
  const [data, setData] = useState<SystemOverview | null>(null);

  useEffect(() => {
    fetch("/api/v1/admin/system", { headers: { "x-role": "super_admin" } })
      .then((res) => res.json())
      .then((json) => setData(json.system ?? null))
      .catch(() => setData(null));
  }, []);

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold text-text-primary">管理台概览</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-border-light p-4 bg-white">用户总数: {data?.userCount ?? "-"}</div>
        <div className="rounded-xl border border-border-light p-4 bg-white">交易总数: {data?.txCount ?? "-"}</div>
        <div className="rounded-xl border border-border-light p-4 bg-white">审计记录: {data?.auditCount ?? "-"}</div>
      </div>
    </div>
  );
};

export default AdminDashboardPage;
