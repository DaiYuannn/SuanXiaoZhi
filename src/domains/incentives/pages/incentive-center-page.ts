import { HttpClient } from "../../../shared/utils/http-client.js";

export interface IncentiveTaskRow {
  id: string;
  code: string;
  title: string;
  status: string;
  progress: number;
  target: number;
}

export const loadIncentiveTasks = async (client: HttpClient): Promise<IncentiveTaskRow[]> => {
  const response = await client.get<{ data: IncentiveTaskRow[] }>("/api/v1/mobile/incentives/tasks");
  return response.data;
};