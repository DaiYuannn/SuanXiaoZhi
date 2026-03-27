import { HttpClient } from "../../../shared/utils/http-client.js";

export interface ProductItem {
  productId: string;
  name: string;
  riskLevel: string;
  expectedYield: number;
  termDays: number;
}

export const loadFinancialProductsData = async (client: HttpClient): Promise<ProductItem[]> => {
  const response = await client.get<{ data: ProductItem[] }>("/api/v1/mobile/products");
  return response.data;
};

export const loadRecommendedProducts = async (
  client: HttpClient,
  riskPreference: string
): Promise<Array<{ product: ProductItem; score: number; reason: string }>> => {
  const response = await client.get<{ data: Array<{ product: ProductItem; score: number; reason: string }> }>(
    `/api/v1/mobile/products/recommend?riskPreference=${encodeURIComponent(riskPreference)}`
  );
  return response.data;
};