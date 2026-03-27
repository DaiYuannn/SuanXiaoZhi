import {
  createFamily,
  fetchFamilyLedgers,
  fetchFamilyMembers,
  fetchTransactions,
  inviteFamilyMember
} from "../../../shared/constants/endpoints.js";

export { createFamily, fetchFamilyLedgers, fetchFamilyMembers, fetchTransactions, inviteFamilyMember };

export interface FamilyMember {
  id: string;
  name: string;
  role: "owner" | "family";
}

export const listFamilyMembers = async (): Promise<FamilyMember[]> => {
  try {
    const response = await fetchFamilyMembers();
    return (response.data ?? []).map((item) => ({
      id: item.id,
      name: item.username,
      role: item.role === "owner" ? "owner" : "family"
    }));
  } catch {
    return [
      { id: "u-owner", name: "owner", role: "owner" },
      { id: "u-family", name: "family-member", role: "family" }
    ];
  }
};