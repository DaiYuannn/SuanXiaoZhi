import React from "react";

const AdminTransactionsPage: React.FC = () => {
  const queue = [
    { id: "TX-98431", reason: "大额异动", amount: "¥12,980.00", risk: "高", time: "10:12" },
    { id: "TX-98429", reason: "跨类消费", amount: "¥3,520.00", risk: "中", time: "09:48" },
    { id: "TX-98420", reason: "设备异常", amount: "¥1,880.00", risk: "低", time: "09:07" }
  ];

  return (
    <div className="space-y-5">
      <section className="rounded-2xl bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.06)] border border-slate-200">
        <h1 className="text-2xl font-bold text-slate-800">交易审计</h1>
        <p className="mt-1 text-sm text-slate-500">支持异常交易标记、审核和运营备注。</p>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
          <p className="text-sm text-slate-500">待审核交易</p>
          <p className="mt-1 text-3xl font-bold text-slate-800">32</p>
          <p className="mt-1 text-xs text-rose-600">+6 较昨日</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
          <p className="text-sm text-slate-500">自动通过率</p>
          <p className="mt-1 text-3xl font-bold text-slate-800">81%</p>
          <p className="mt-1 text-xs text-emerald-600">+2.3% 较昨日</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
          <p className="text-sm text-slate-500">平均处置时长</p>
          <p className="mt-1 text-3xl font-bold text-slate-800">4.8m</p>
          <p className="mt-1 text-xs text-amber-600">仍可优化</p>
        </article>
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.06)] border border-slate-200">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">异常队列</h2>
          <button className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50">批量处理</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px]">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-3 py-3">交易号</th>
                <th className="px-3 py-3">触发原因</th>
                <th className="px-3 py-3">金额</th>
                <th className="px-3 py-3">风险级别</th>
                <th className="px-3 py-3">触发时间</th>
                <th className="px-3 py-3">操作</th>
              </tr>
            </thead>
            <tbody>
              {queue.map((item) => (
                <tr key={item.id} className="border-b border-slate-100 text-sm text-slate-700 hover:bg-slate-50">
                  <td className="px-3 py-3 font-medium">{item.id}</td>
                  <td className="px-3 py-3">{item.reason}</td>
                  <td className="px-3 py-3">{item.amount}</td>
                  <td className="px-3 py-3">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${
                        item.risk === "高"
                          ? "bg-rose-100 text-rose-700"
                          : item.risk === "中"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {item.risk}
                    </span>
                  </td>
                  <td className="px-3 py-3">{item.time}</td>
                  <td className="px-3 py-3">
                    <button className="rounded-lg border border-slate-200 px-2 py-1 text-xs hover:bg-slate-100">审核</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default AdminTransactionsPage;
