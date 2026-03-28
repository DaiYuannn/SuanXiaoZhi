import React from "react";
import { useLocation, useNavigate } from "react-router-dom";

const TransferSuccessPage: React.FC = () => {
	const navigate = useNavigate();
	const location = useLocation();
	const amount = (location.state as { amount?: string } | undefined)?.amount ?? "100.43";

	return (
		<div className="min-h-screen bg-bg-primary px-4 pt-5 pb-24">
			<div className="mx-auto max-w-md rounded-3xl bg-white p-5 border border-border-light shadow-sm">
				<div className="flex justify-center">
					<div className="h-20 w-20 rounded-full bg-success text-white flex items-center justify-center shadow-lg">
						<i className="fas fa-check text-3xl" />
					</div>
				</div>

				<div className="mt-4 text-center">
					<p className="text-sm text-text-secondary">Transfer success!</p>
					<p className="mt-1 text-5xl font-bold text-text-primary">${amount}</p>
					<p className="mt-1 text-xs text-text-secondary">to Bank Negara Indonesia (0274376261)</p>
				</div>

				<div className="mt-5 rounded-2xl bg-[#F8FAFF] p-4 text-sm">
					<Row label="Status" value="Success" success />
					<Row label="Date" value={new Date().toLocaleDateString()} />
					<Row label="Time" value={new Date().toLocaleTimeString()} />
					<Row label="Admin Fee" value="$0.00" />
					<div className="mt-2 border-t border-border-light pt-2">
						<Row label="Total" value={`$${Number(amount).toFixed(2)}`} bold />
					</div>
				</div>

				<p className="mt-4 text-sm font-medium text-text-primary">Add to Expense Category</p>
				<div className="mt-2 grid grid-cols-5 gap-2 text-center text-[11px]">
					{["Food", "Utilities", "Shopping", "Health", "Transport"].map((item) => (
						<button key={item} className="rounded-xl bg-[#F4F6FA] px-1 py-2 text-text-secondary">
							{item}
						</button>
					))}
				</div>

				<div className="mt-5 flex gap-2">
					<button onClick={() => navigate("/")} className="h-11 flex-1 rounded-full border border-border-light text-primary font-medium">
						Share
					</button>
					<button className="h-11 flex-1 rounded-full bg-primary text-white font-medium">Download</button>
				</div>
			</div>
		</div>
	);
};

type RowProps = {
	label: string;
	value: string;
	success?: boolean;
	bold?: boolean;
};

const Row: React.FC<RowProps> = ({ label, value, success, bold }) => (
	<div className="mt-1 flex items-center justify-between">
		<span className="text-text-secondary">{label}</span>
		<span className={`${success ? "text-success" : "text-text-primary"} ${bold ? "font-semibold" : ""}`}>{value}</span>
	</div>
);

export default TransferSuccessPage;
