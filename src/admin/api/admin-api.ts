import { get } from "../../shared/utils/http-client.js";

export interface AdminUserDto {
  id: string;
  username: string;
  role: string;
  isActive: boolean;
  createdAt?: string;
}

interface AdminUsersResp {
  ok: boolean;
  data: {
    total: number;
    page: number;
    size: number;
    users: AdminUserDto[];
  };
}

export interface AdminUserLedger {
  id: string;
  name: string;
  type: string;
  currency: string;
  balanceCent: number;
}

export interface AdminUserTx {
  id: string;
  type: string;
  amountCent: number;
  categoryName?: string;
  source: string;
  note?: string;
  ts: string;
}

export interface AdminUserDetail {
  profile: {
    id: string;
    username: string;
    role: string;
    isActive: boolean;
    createdAt: string;
    familyName: string | null;
  };
  stats: {
    ledgerCount: number;
    totalTransactions: number;
    expenseTotal: number;
    incomeTotal: number;
  };
  ledgers: AdminUserLedger[];
  familyMembers: Array<{ id: string; username: string; role: string; isActive: boolean }>;
  recentTransactions: AdminUserTx[];
}

interface AdminUserDetailResp {
  ok: boolean;
  data: AdminUserDetail;
}

export const listAdminUsersWithMeta = async (params?: {
  page?: number;
  size?: number;
  keyword?: string;
  role?: string;
}): Promise<{ total: number; users: AdminUserDto[] }> => {
  const response = await get<AdminUsersResp>("/api/v1/admin/users", {
    page: params?.page ?? 1,
    size: params?.size ?? 50,
    keyword: params?.keyword,
    role: params?.role && params.role !== "all" ? params.role : undefined
  });

  return {
    total: response.data.total,
    users: response.data.users
  };
};

export const listAdminUsers = async (): Promise<AdminUserDto[]> => {
  return [
    { id: "a1", username: "root", role: "super_admin", isActive: true },
    { id: "a2", username: "ops", role: "operator", isActive: true }
  ];
};

export const getAdminUserDetail = async (id: string): Promise<AdminUserDetail> => {
  const response = await get<AdminUserDetailResp>(`/api/v1/admin/users/${encodeURIComponent(id)}/detail`);
  return response.data;
};