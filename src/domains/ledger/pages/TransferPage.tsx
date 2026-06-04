import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { get, post } from "../../../shared/utils/http-client";

interface Ledger { accountId: string; name: string; balance: number; }

const keypad = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "del"];

const TransferPage: React.FC = () => {
  const navigate = useNavigate();
  const [amount, setAmount] = useState("0");
  const [ledgers, setLedgers] = useState<Ledger[]>([]);
  const [sourceId, setSourceId] = useState("");
  const [targetId, setTargetId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    get<any>("/api/v1/mobile/accounts").then(res => {
      const list: Ledger[] = res?.data ?? [];
      setLedgers(list);
      if (list.length > 0) setSourceId(list[0].accountId);
      if (list.length > 1) setTargetId(list[1].accountId);
    }).catch(() => {});
  }, []);

  const onKey = (value: string) => {
    if (value === "del") { setAmount(prev => prev.length <= 1 ? "0" : prev.slice(0, -1)); return; }
    if (value === "." && amount.includes(".")) return;
    setAmount(prev => prev === "0" ? value : `${prev}${value}`);
  };

  const onPay = async () => {
    setError("");
    if (!sourceId || !targetId) { setError("请选择账户"); return; }
    if (sourceId === targetId) { setError("转出和转入账户不能相同"); return; }
    const amountCent = Math.round(Number(amount) * 100);
    if (amountCent <= 0) { setError("请输入有效金额"); return; }

    setSubmitting(true);
    try {
      await post("/api/v1/mobile/transactions", {
        amountCent: -amountCent,
        type: "TRANSFER",
        categoryName: "转账支出",
        ledgerId: sourceId,
        note: `转账至 ${ledgers.find(l => l.accountId === targetId)?.name ?? targetId}`
      });
      await post("/api/v1/mobile/transactions", {
        amountCent,
        type: "TRANSFER",
        categoryName: "转账收入",
        ledgerId: targetId,
        note: `来自 ${ledgers.find(l => l.accountId === sourceId)?.name ?? sourceId}`
      });
      navigate("/ledger/transfer/success", { state: { amount } });
    } catch {
      setError("转账失败，请重试");
    } finally {
      setSubmitting(false);
    }
  };

  const fmt = (cents: number) => "¥" + (cents / 100).toLocaleString("zh-CN", { minimumFractionDigits: 2 });

  return (
    <div className="min-h-screen bg-bg-primary px-4 pt-5 pb-24">
      <div className="mx-auto max-w-md rounded-3xl bg-white p-4 border border-border-light shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <button onClick={() => navigate(-1)} className="h-9 w-9 rounded-full bg-gray-100 text-text-primary flex items-center justify-center">
            <i className="fas fa-arrow-left" />
          </button>
          <h2 className="text-lg font-semibold text-text-primary">账户转账</h2>
          <div className="h-9 w-9" />
        </div>

        {/* 转出账户 */}
        <div className="mb-3">
          <label className="text-xs text-text-secondary mb-1 block">转出账户</label>
          <select value={sourceId} onChange={e => setSourceId(e.target.value)}
            className="w-full border border-border-light rounded-xl px-3 py-2 text-sm text-text-primary bg-white">
            {ledgers.map(l => <option key={l.accountId} value={l.accountId}>{l.name}（{fmt(l.balance)}）</option>)}
          </select>
        </div>

        {/* 转入账户 */}
        <div className="mb-4">
          <label className="text-xs text-text-secondary mb-1 block">转入账户</label>
          <select value={targetId} onChange={e => setTargetId(e.target.value)}
            className="w-full border border-border-light rounded-xl px-3 py-2 text-sm text-text-primary bg-white">
            {ledgers.map(l => <option key={l.accountId} value={l.accountId}>{l.name}（{fmt(l.balance)}）</option>)}
          </select>
        </div>

        {/* 金额 */}
        <div className="border-b border-border-light pb-3 mb-4">
          <p className="text-xs text-text-secondary">转账金额</p>
          <div className="mt-1 flex items-end gap-1">
            <span className="text-2xl text-primary">¥</span>
            <p className="text-5xl font-bold tracking-tight text-text-primary">{amount}</p>
          </div>
        </div>

        {/* 快捷金额 */}
        <div className="flex gap-2 overflow-x-auto pb-1 mb-4">
          {[100, 500, 1000, 2000, 5000].map(q => (
            <button key={q} onClick={() => setAmount(String(q))}
              className="rounded-xl bg-gray-100 px-3 py-2 text-xs font-semibold text-text-primary whitespace-nowrap">
              ¥{q}
            </button>
          ))}
        </div>

        {/* 数字键盘 */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {keypad.map(item => (
            <button key={item} onClick={() => onKey(item)}
              className="h-12 rounded-xl border border-border-light text-lg font-semibold text-text-primary flex items-center justify-center">
              {item === "del" ? <i className="fas fa-delete-left text-base" /> : item}
            </button>
          ))}
        </div>

        {error && <p className="text-center text-sm text-red-500 mb-3">{error}</p>}

        <button onClick={onPay} disabled={submitting || !sourceId || !targetId}
          className="h-12 w-full rounded-full bg-primary font-semibold text-white disabled:opacity-60">
          {submitting ? "转账中..." : "确认转账"}
        </button>
      </div>
    </div>
  );
};

export default TransferPage;
