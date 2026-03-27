import { HttpClient } from "../../../shared/utils/http-client.js";

export interface FamilyMember {
  id: string;
  username: string;
  role: string;
}

export const loadFamilyMembersPage = async (client: HttpClient): Promise<FamilyMember[]> => {
  const response = await client.get<{ data: FamilyMember[] }>("/api/v1/mobile/family/members");
  return response.data;
};