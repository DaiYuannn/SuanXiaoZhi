export interface AdminUserDto {
  id: string;
  username: string;
  role: string;
  isActive: boolean;
}

export const listAdminUsers = async (): Promise<AdminUserDto[]> => {
  return [
    { id: "a1", username: "root", role: "super_admin", isActive: true },
    { id: "a2", username: "ops", role: "operator", isActive: true }
  ];
};