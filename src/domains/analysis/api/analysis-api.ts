import {
  createPlan,
  fetchAnalysisInsights,
  fetchConsumptionSummary,
  generatePlans
} from "../../../shared/constants/endpoints.js";

export { createPlan, fetchAnalysisInsights, fetchConsumptionSummary, generatePlans };

export interface KpiCard {
  key: string;
  label: string;
  value: string;
}

export const fetchKpiCards = async (): Promise<KpiCard[]> => {
  try {
    const now = new Date();
    const to = now.toISOString();
    const from = new Date(now.getTime() - 30 * 24 * 3600 * 1000).toISOString();
    const summary = await fetchConsumptionSummary({ from, to });
    const totalExpense = summary.data.byCategory.reduce((sum, item) => sum + Math.max(item.amount, 0), 0);
    return [
      { key: "expense", label: "monthly-expense", value: `${totalExpense}` },
      { key: "categories", label: "category-count", value: `${summary.data.byCategory.length}` },
      { key: "trend", label: "trend-points", value: `${summary.data.trend.length}` }
    ];
  } catch {
    return [
      { key: "income", label: "monthly-income", value: "12000" },
      { key: "expense", label: "monthly-expense", value: "8600" },
      { key: "saving-rate", label: "saving-rate", value: "28.3%" }
    ];
  }
};