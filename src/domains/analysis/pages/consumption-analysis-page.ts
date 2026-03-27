import { HttpClient } from "../../../shared/utils/http-client.js";

export interface ConsumptionAnalysisData {
  byCategory: Array<{ category: string; amount: number; count: number }>;
  trend: Array<{ date: string; amount: number }>;
  frequency: Array<{ category: string; count: number }>;
}

export const loadConsumptionAnalysisData = async (
  client: HttpClient
): Promise<ConsumptionAnalysisData> => {
  const response = await client.get<{ data: ConsumptionAnalysisData }>(
    "/api/v1/mobile/analysis/summary"
  );
  return response.data;
};