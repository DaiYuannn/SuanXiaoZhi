import { HttpClient } from "../../shared/utils/http-client.js";

export interface DashboardSummary {
  userCount: number;
  txCount: number;
  auditCount: number;
}

export const loadAdminDashboard = async (client: HttpClient): Promise<DashboardSummary> => {
  const response = await client.get<{ system: DashboardSummary }>("/api/v1/admin/system");
  return response.system;
};