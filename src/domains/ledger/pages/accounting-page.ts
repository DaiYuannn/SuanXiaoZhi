import { HttpClient } from "../../../shared/utils/http-client.js";

export interface AccountingPageData {
  total: number;
  list: Array<{
    transactionId: string;
    amount: number;
    category: string;
    time: string;
    isAnomaly?: boolean;
  }>;
}

export const loadAccountingPageData = async (client: HttpClient): Promise<AccountingPageData> => {
  const response = await client.get<{ data: AccountingPageData }>(
    "/api/v1/mobile/transactions?page=1&size=30"
  );
  return response.data;
};