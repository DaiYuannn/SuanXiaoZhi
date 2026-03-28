import React, { useEffect, useMemo, useState } from "react";
import SurfaceCard from "../../shared/components/ui/SurfaceCard";
import { del, get, patch, post } from "../../shared/utils/http-client";

type ProductRow = {
  id: string;
  productCode: string;
  name: string;
  riskLevel: string;
  expectedYield: number;
  termDays: number;
  description?: string | null;
  isActive: boolean;
};

const AdminProductsPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [keyword, setKeyword] = useState("");
  const [riskFilter, setRiskFilter] = useState("all");
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [editingProduct, setEditingProduct] = useState<ProductRow | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    riskLevel: "MID",
    expectedYield: 3.5,
    termDays: 180,
    description: ""
  });
  const [form, setForm] = useState({
    productCode: "",
    name: "",
    riskLevel: "MID",
    expectedYield: 3.5,
    termDays: 180,
    description: ""
  });

  const loadProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await get<{ ok: boolean; data: ProductRow[] }>("/api/v1/admin/products");
      setProducts(res.data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载产品失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadProducts();
  }, []);

  const visibleRows = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    return products.filter((item) => {
      const hitKeyword = !q || item.name.toLowerCase().includes(q) || item.productCode.toLowerCase().includes(q);
      const hitRisk = riskFilter === "all" || item.riskLevel === riskFilter;
      return hitKeyword && hitRisk;
    });
  }, [products, keyword, riskFilter]);

  const handleCreate = async () => {
    if (!form.productCode.trim() || !form.name.trim()) {
      setError("产品编码和产品名称不能为空");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await post("/api/v1/admin/products", {
        productCode: form.productCode.trim(),
        name: form.name.trim(),
        riskLevel: form.riskLevel,
        expectedYield: Number(form.expectedYield),
        termDays: Number(form.termDays),
        description: form.description.trim() || null,
        isActive: true
      });
      setForm({ productCode: "", name: "", riskLevel: "MID", expectedYield: 3.5, termDays: 180, description: "" });
      await loadProducts();
    } catch (e) {
      setError(e instanceof Error ? e.message : "创建产品失败");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (row: ProductRow) => {
    setSaving(true);
    setError(null);
    try {
      if (row.isActive) {
        await del(`/api/v1/admin/products/${row.id}`);
      } else {
        await patch(`/api/v1/admin/products/${row.id}`, { isActive: true });
      }
      await loadProducts();
    } catch (e) {
      setError(e instanceof Error ? e.message : "更新产品状态失败");
    } finally {
      setSaving(false);
    }
  };

  const updateRisk = async (row: ProductRow, nextRisk: string) => {
    setSaving(true);
    setError(null);
    try {
      await patch(`/api/v1/admin/products/${row.id}`, { riskLevel: nextRisk });
      await loadProducts();
    } catch (e) {
      setError(e instanceof Error ? e.message : "更新风险等级失败");
    } finally {
      setSaving(false);
    }
  };

  const openEditModal = (row: ProductRow) => {
    setEditingProduct(row);
    setEditForm({
      name: row.name,
      riskLevel: row.riskLevel,
      expectedYield: row.expectedYield,
      termDays: row.termDays,
      description: row.description ?? ""
    });
  };

  const closeEditModal = () => {
    setEditingProduct(null);
  };

  const saveEdit = async () => {
    if (!editingProduct) {
      return;
    }
    if (!editForm.name.trim()) {
      setError("产品名称不能为空");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await patch(`/api/v1/admin/products/${editingProduct.id}`, {
        name: editForm.name.trim(),
        riskLevel: editForm.riskLevel,
        expectedYield: Number(editForm.expectedYield),
        termDays: Number(editForm.termDays),
        description: editForm.description.trim() || null
      });
      closeEditModal();
      await loadProducts();
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存产品失败");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <SurfaceCard className="p-5" tone="admin">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">产品管理</h1>
            <p className="mt-1 text-sm text-slate-500">支持产品上架、风险等级调整、状态管理与快速检索。</p>
          </div>
          <div className="rounded-xl bg-slate-100 px-4 py-2 text-sm text-slate-600">{products.length} 个产品</div>
        </div>
      </SurfaceCard>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <SurfaceCard className="p-5 xl:col-span-2" tone="admin">
          <div className="mb-4 grid grid-cols-1 gap-3 lg:grid-cols-4">
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="搜索产品编码 / 名称"
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-400 lg:col-span-2"
            />
            <select value={riskFilter} onChange={(e) => setRiskFilter(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-400">
              <option value="all">全部风险</option>
              <option value="LOW">LOW</option>
              <option value="MID">MID</option>
              <option value="HIGH">HIGH</option>
            </select>
            <button onClick={() => void loadProducts()} className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700">
              刷新
            </button>
          </div>

          {loading && <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">产品加载中...</div>}
          {error && <div className="mb-3 rounded-xl bg-rose-50 p-4 text-sm text-rose-600">{error}</div>}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-3">编码</th>
                  <th className="px-3 py-3">名称</th>
                  <th className="px-3 py-3">风险</th>
                  <th className="px-3 py-3">年化</th>
                  <th className="px-3 py-3">期限</th>
                  <th className="px-3 py-3">状态</th>
                  <th className="px-3 py-3">操作</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((row) => (
                  <tr key={row.id} className="border-b border-slate-100 text-sm text-slate-700 hover:bg-slate-50">
                    <td className="px-3 py-3 font-medium">{row.productCode}</td>
                    <td className="px-3 py-3">{row.name}</td>
                    <td className="px-3 py-3">
                      <select
                        value={row.riskLevel}
                        onChange={(e) => void updateRisk(row, e.target.value)}
                        className="rounded border border-slate-200 px-2 py-1 text-xs"
                        disabled={saving}
                      >
                        <option value="LOW">LOW</option>
                        <option value="MID">MID</option>
                        <option value="HIGH">HIGH</option>
                      </select>
                    </td>
                    <td className="px-3 py-3">{row.expectedYield}%</td>
                    <td className="px-3 py-3">{row.termDays}天</td>
                    <td className="px-3 py-3">
                      <span className={`rounded-full px-2 py-1 text-xs font-medium ${row.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                        {row.isActive ? '已上架' : '已下架'}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEditModal(row)}
                          className="rounded-lg border border-slate-200 px-2 py-1 text-xs hover:bg-slate-100"
                          disabled={saving}
                        >
                          编辑
                        </button>
                        <button
                          onClick={() => void toggleActive(row)}
                          className="rounded-lg border border-slate-200 px-2 py-1 text-xs hover:bg-slate-100"
                          disabled={saving}
                        >
                          {row.isActive ? '下架' : '上架'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SurfaceCard>

        <SurfaceCard className="p-5" tone="admin">
          <h2 className="text-lg font-semibold text-slate-800">新建产品</h2>
          <div className="mt-4 space-y-3">
            <input value={form.productCode} onChange={(e) => setForm((prev) => ({ ...prev, productCode: e.target.value }))} placeholder="产品编码，例如 P100" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            <input value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="产品名称" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            <div className="grid grid-cols-2 gap-2">
              <select value={form.riskLevel} onChange={(e) => setForm((prev) => ({ ...prev, riskLevel: e.target.value }))} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
                <option value="LOW">LOW</option>
                <option value="MID">MID</option>
                <option value="HIGH">HIGH</option>
              </select>
              <input type="number" min={0} step={0.1} value={form.expectedYield} onChange={(e) => setForm((prev) => ({ ...prev, expectedYield: Number(e.target.value) }))} placeholder="年化%" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            </div>
            <input type="number" min={1} value={form.termDays} onChange={(e) => setForm((prev) => ({ ...prev, termDays: Number(e.target.value) }))} placeholder="期限(天)" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            <textarea value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} placeholder="产品描述" rows={4} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            <button onClick={() => void handleCreate()} disabled={saving} className="w-full rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
              {saving ? '提交中...' : '创建产品'}
            </button>
          </div>
        </SurfaceCard>
      </div>

      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-800">编辑产品</h3>
                <p className="text-xs text-slate-500">编码：{editingProduct.productCode}</p>
              </div>
              <button onClick={closeEditModal} className="rounded-md px-2 py-1 text-slate-500 hover:bg-slate-100">关闭</button>
            </div>

            <div className="space-y-3">
              <input value={editForm.name} onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="产品名称" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              <div className="grid grid-cols-3 gap-2">
                <select value={editForm.riskLevel} onChange={(e) => setEditForm((prev) => ({ ...prev, riskLevel: e.target.value }))} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
                  <option value="LOW">LOW</option>
                  <option value="MID">MID</option>
                  <option value="HIGH">HIGH</option>
                </select>
                <input type="number" min={0} step={0.1} value={editForm.expectedYield} onChange={(e) => setEditForm((prev) => ({ ...prev, expectedYield: Number(e.target.value) }))} placeholder="年化%" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                <input type="number" min={1} value={editForm.termDays} onChange={(e) => setEditForm((prev) => ({ ...prev, termDays: Number(e.target.value) }))} placeholder="期限天数" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              </div>
              <textarea value={editForm.description} onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))} placeholder="产品描述" rows={4} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button onClick={closeEditModal} className="rounded-xl border border-slate-200 px-4 py-2 text-sm hover:bg-slate-50" disabled={saving}>取消</button>
              <button onClick={() => void saveEdit()} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60" disabled={saving}>
                {saving ? '保存中...' : '保存修改'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminProductsPage;
