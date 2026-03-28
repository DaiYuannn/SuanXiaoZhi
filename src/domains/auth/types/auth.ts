export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  ok: boolean;
  token: string;
  role: string;
  message?: string;
}