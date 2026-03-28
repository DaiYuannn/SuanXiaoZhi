import React from "react";
import SurfaceCard from "../../shared/components/ui/SurfaceCard";

const UsersPage: React.FC = () => {
  const rows = [
    { name: "王晨", role: "OWNER", status: "正常", lastActive: "2分钟前" },
    { name: "李悦", role: "FAMILY_MEMBER", status: "待审核", lastActive: "18分钟前" },
    { name: "张然", role: "OPERATOR", status: "正常", lastActive: "35分钟前" },
    { name: "陈璐", role: "VIEWER", status: "冻结", lastActive: "1天前" }
  ];

  return (
    <div className="space-y-5">
      <SurfaceCard className="p-5" tone="admin">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">用户管理</h1>
            <p className="mt-1 text-sm text-slate-500">支持用户检索、角色调整与状态禁用。</p>
          </div>
          <button className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
            <i className="fas fa-user-plus mr-2"></i>
            新建账号
          </button>
        </div>
      </SurfaceCard>

      <SurfaceCard className="p-5" tone="admin">
        <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-4">
          <input placeholder="搜索用户名 / 手机号" className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-400 md:col-span-2" />
          <select className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-400">
            <option>全部角色</option>
            <option>OWNER</option>
            <option>FAMILY_MEMBER</option>
            <option>OPERATOR</option>
          </select>
          <button className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700">筛选</button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px]">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs text-slate-500 uppercase tracking-wide">
                <th className="px-3 py-3">用户</th>
                <th className="px-3 py-3">角色</th>
                <th className="px-3 py-3">状态</th>
                <th className="px-3 py-3">最后活跃</th>
                <th className="px-3 py-3">操作</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={`${row.name}-${row.role}`} className="border-b border-slate-100 text-sm text-slate-700 hover:bg-slate-50">
                  <td className="px-3 py-3 font-medium">{row.name}</td>
                  <td className="px-3 py-3">{row.role}</td>
                  <td className="px-3 py-3">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${
                        row.status === "正常"
                          ? "bg-emerald-100 text-emerald-700"
                          : row.status === "待审核"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-rose-100 text-rose-700"
                      }`}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td className="px-3 py-3">{row.lastActive}</td>
                  <td className="px-3 py-3">
                    <button className="rounded-lg border border-slate-200 px-2 py-1 text-xs hover:bg-slate-100">编辑</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SurfaceCard>
    </div>
  );
};

export default UsersPage;
