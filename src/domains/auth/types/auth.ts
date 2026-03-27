export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  ok: true;
  token: string;
  role: string;
}