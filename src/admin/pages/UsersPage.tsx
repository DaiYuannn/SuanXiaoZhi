import React, { useEffect, useMemo, useState } from "react";
import SurfaceCard from "../../shared/components/ui/SurfaceCard";
import { getAdminUserDetail, listAdminUsersWithMeta, type AdminUserDetail, type AdminUserDto } from "../api/admin-api";

const UsersPage: React.FC = () => {
  const [keyword, setKeyword] = useState("");
  const [role, setRole] = useState("all");
  const [rows, setRows] = useState<AdminUserDto[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const roleLabel: Record<string, string> = {
    owner: "户主",
    family: "家庭成员",
    super_admin: "超级管理员",
    operator: "运营",
    viewer: "只读"
  };

  const loadUsers = async (currentKeyword: string, currentRole: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await listAdminUsersWithMeta({ keyword: currentKeyword, role: currentRole, page: 1, size: 100 });
      setRows(res.users);
      setTotal(res.total);
      if (!selectedId && res.users.length > 0) {
        setSelectedId(res.users[0].id);
      }
      if (selectedId && !res.users.find((item) => item.id === selectedId)) {
        setSelectedId(res.users[0]?.id ?? null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载用户失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadUsers("", "all");
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }

    setDetailLoading(true);
    getAdminUserDetail(selectedId)
      .then((res) => {
        setDetail(res);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "加载用户详情失败");
      })
      .finally(() => {
        setDetailLoading(false);
      });
  }, [selectedId]);

  const activeUser = useMemo(() => rows.find((item) => item.id === selectedId), [rows, selectedId]);

  const currency = (cent: number): string => `¥${(Math.abs(cent) / 100).toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="space-y-5">
      <SurfaceCard className="p-5" tone="admin">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">用户管理</h1>
            <p className="mt-1 text-sm text-slate-500">B端仅桌面操作，支持按角色检索并查看用户账户详细信息。</p>
          </div>
          <div className="rounded-xl bg-slate-100 px-4 py-2 text-sm text-slate-600">当前共 {total} 个用户</div>
        </div>
      </SurfaceCard>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <SurfaceCard className="p-5 xl:col-span-2" tone="admin">
          <div className="mb-4 grid grid-cols-1 gap-3 lg:grid-cols-4">
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="搜索用户名"
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-400 lg:col-span-2"
            />
            <select value={role} onChange={(e) => setRole(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-400">
              <option value="all">全部角色</option>
              <option value="owner">户主</option>
              <option value="family">家庭成员</option>
              <option value="operator">运营</option>
              <option value="super_admin">超级管理员</option>
              <option value="viewer">只读</option>
            </select>
            <button
              onClick={() => void loadUsers(keyword.trim(), role)}
              className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700"
            >
              筛选
            </button>
          </div>

          {loading && <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">用户加载中...</div>}
          {error && <div className="rounded-xl bg-rose-50 p-4 text-sm text-rose-600">{error}</div>}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px]">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs text-slate-500 uppercase tracking-wide">
                  <th className="px-3 py-3">用户</th>
                  <th className="px-3 py-3">角色</th>
                  <th className="px-3 py-3">状态</th>
                  <th className="px-3 py-3">创建时间</th>
                  <th className="px-3 py-3">详情</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className={`border-b border-slate-100 text-sm text-slate-700 transition hover:bg-slate-50 ${selectedId === row.id ? "bg-emerald-50/50" : ""}`}
                  >
                    <td className="px-3 py-3 font-medium">{row.username}</td>
                    <td className="px-3 py-3">{roleLabel[row.role] ?? row.role}</td>
                    <td className="px-3 py-3">
                      <span className={`rounded-full px-2 py-1 text-xs font-medium ${row.isActive ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                        {row.isActive ? "正常" : "停用"}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-500">{row.createdAt ? new Date(row.createdAt).toLocaleString("zh-CN") : "-"}</td>
                    <td className="px-3 py-3">
                      <button onClick={() => setSelectedId(row.id)} className="rounded-lg border border-slate-200 px-2 py-1 text-xs hover:bg-slate-100">
                        查看
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SurfaceCard>

        <SurfaceCard className="p-5" tone="admin">
          <h2 className="text-lg font-semibold text-slate-800">账户详情</h2>
          {!activeUser && <p className="mt-3 text-sm text-slate-500">请选择左侧用户查看详情。</p>}
          {detailLoading && <p className="mt-3 text-sm text-slate-500">详情加载中...</p>}
          {detail && (
            <div className="mt-4 space-y-4 text-sm text-slate-700">
              <div className="rounded-xl border border-slate-200 p-3">
                <p className="font-semibold">{detail.profile.username}</p>
                <p className="text-xs text-slate-500">角色：{roleLabel[detail.profile.role] ?? detail.profile.role}</p>
                <p className="text-xs text-slate-500">家庭：{detail.profile.familyName ?? "未加入"}</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-slate-50 p-3">
                  <div className="text-xs text-slate-500">账户数</div>
                  <div className="text-lg font-semibold">{detail.stats.ledgerCount}</div>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <div className="text-xs text-slate-500">交易数</div>
                  <div className="text-lg font-semibold">{detail.stats.totalTransactions}</div>
                </div>
                <div className="rounded-xl bg-rose-50 p-3">
                  <div className="text-xs text-rose-500">总支出</div>
                  <div className="font-semibold text-rose-600">{currency(detail.stats.expenseTotal)}</div>
                </div>
                <div className="rounded-xl bg-emerald-50 p-3">
                  <div className="text-xs text-emerald-500">总收入</div>
                  <div className="font-semibold text-emerald-600">{currency(detail.stats.incomeTotal)}</div>
                </div>
              </div>

              <div>
                <h3 className="mb-2 text-sm font-semibold">账本</h3>
                <div className="space-y-2">
                  {detail.ledgers.length === 0 && <p className="text-xs text-slate-500">无账本数据</p>}
                  {detail.ledgers.map((ledger) => (
                    <div key={ledger.id} className="rounded-lg border border-slate-200 p-2 text-xs">
                      <p className="font-medium text-slate-700">{ledger.name}</p>
                      <p className="text-slate-500">{ledger.type} · {currency(ledger.balanceCent)}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="mb-2 text-sm font-semibold">最近交易</h3>
                <div className="space-y-2">
                  {detail.recentTransactions.slice(0, 6).map((tx) => (
                    <div key={tx.id} className="rounded-lg border border-slate-200 p-2 text-xs">
                      <p className="font-medium">{tx.categoryName ?? "未分类"}</p>
                      <p className="text-slate-500">{new Date(tx.ts).toLocaleDateString("zh-CN")} · {tx.type}</p>
                      <p className="font-semibold">{currency(tx.amountCent)}</p>
                    </div>
                  ))}
                  {detail.recentTransactions.length === 0 && <p className="text-xs text-slate-500">暂无交易</p>}
                </div>
              </div>
            </div>
          )}
        </SurfaceCard>
      </div>
    </div>
  );
};

export default UsersPage;
