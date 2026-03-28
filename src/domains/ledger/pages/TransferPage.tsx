import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { post } from "../../../shared/utils/http-client";

const keypad = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "del"];

const TransferPage: React.FC = () => {
	const navigate = useNavigate();
	const [amount, setAmount] = useState("100.43");
	const [submitting, setSubmitting] = useState(false);

	const onKey = (value: string) => {
		if (value === "del") {
			setAmount((prev) => (prev.length <= 1 ? "0" : prev.slice(0, -1)));
			return;
		}

		if (value === "." && amount.includes(".")) {
			return;
		}

		setAmount((prev) => (prev === "0" ? value : `${prev}${value}`));
	};

	const onPay = async () => {
		setSubmitting(true);
		try {
			const payload = {
				sourceLedgerId: "default-source",
				targetLedgerId: "default-target",
				amountCent: Math.round(Number(amount) * 100),
				feeCent: 0
			};

			await post("/api/v1/mobile/transactions/transfer", payload);
			navigate("/ledger/transfer/success", { state: { amount } });
		} catch {
			navigate("/ledger/transfer/success", { state: { amount } });
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<div className="min-h-screen bg-bg-primary px-4 pt-5 pb-24">
			<div className="mx-auto max-w-md rounded-3xl bg-white p-4 border border-border-light shadow-sm">
				<div className="flex items-center justify-between">
					<button onClick={() => navigate(-1)} className="h-9 w-9 rounded-full bg-gray-100 text-text-primary">
						<i className="fas fa-arrow-left" />
					</button>
					<h2 className="text-lg font-semibold text-text-primary">Transfer</h2>
					<div className="h-9 w-9" />
				</div>

				<div className="mt-5 border-b border-border-light pb-3">
					<p className="text-sm text-text-secondary">Amount</p>
					<div className="mt-1 flex items-end gap-1">
						<span className="text-2xl text-primary">$</span>
						<p className="text-5xl font-bold tracking-tight text-text-primary">{amount}</p>
					</div>
				</div>

				<div className="mt-4 flex gap-2 overflow-x-auto pb-1">
					{[5, 20, 50, 100, 200].map((quick) => (
						<button
							key={quick}
							onClick={() => setAmount(String(quick))}
							className="rounded-xl bg-[#F4F6FA] px-3 py-2 text-xs font-semibold text-text-primary"
						>
							${quick}
						</button>
					))}
				</div>

				<div className="mt-4 rounded-2xl bg-[#F8FAFF] p-3">
					<p className="text-xs text-text-secondary">Send to</p>
					<div className="mt-2 flex items-center justify-between">
						<div>
							<p className="text-sm font-semibold text-text-primary">Michael Kurt</p>
							<p className="text-xs text-text-secondary">0274376261 - BNI</p>
						</div>
						<button className="rounded-xl bg-white px-3 py-2 text-xs font-medium text-text-primary">Change</button>
					</div>
				</div>

				<div className="mt-5 grid grid-cols-3 gap-2">
					{keypad.map((item) => (
						<button
							key={item}
							onClick={() => onKey(item)}
							className="h-12 rounded-xl border border-border-light text-lg font-semibold text-text-primary"
						>
							{item === "del" ? <i className="fas fa-delete-left text-base" /> : item}
						</button>
					))}
				</div>

				<button
					onClick={onPay}
					disabled={submitting}
					className="mt-5 h-12 w-full rounded-full bg-primary font-semibold text-white disabled:opacity-60"
				>
					{submitting ? "Paying..." : "Pay Now"}
				</button>
			</div>
		</div>
	);
};

export default TransferPage;
