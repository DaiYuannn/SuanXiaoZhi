import {
  estimateProductYield,
  fetchMobileRiskResult,
  fetchProductDetail,
  fetchProducts,
  fetchRecommendedProducts,
  fetchRiskAssessments,
  startMobileRiskAssessment,
  startRiskAssessment,
  submitMobileRiskAssessment,
  submitRiskAssessment
} from "../../../shared/constants/endpoints.js";

export {
  estimateProductYield,
  fetchMobileRiskResult,
  fetchProductDetail,
  fetchProducts,
  fetchRecommendedProducts,
  fetchRiskAssessments,
  startMobileRiskAssessment,
  startRiskAssessment,
  submitMobileRiskAssessment,
  submitRiskAssessment
};

export interface ProductCard {
  id: string;
  name: string;
  riskLevel: "low" | "mid" | "high";
}

export const listProducts = async (): Promise<ProductCard[]> => {
  try {
    const response = await fetchProducts({});
    return (response.data ?? []).map((item) => ({
      id: item.productId,
      name: item.name,
      riskLevel: item.riskLevel.toLowerCase() as "low" | "mid" | "high"
    }));
  } catch {
    return [
      { id: "p1", name: "稳健债基组合", riskLevel: "low" },
      { id: "p2", name: "平衡策略组合", riskLevel: "mid" }
    ];
  }
};