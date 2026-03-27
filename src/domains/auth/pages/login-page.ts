import { HttpClient } from "../../../shared/utils/http-client.js";

export interface LoginPagePayload {
  username: string;
  password: string;
}

export const loginPageSubmit = async (
  client: HttpClient,
  payload: LoginPagePayload
): Promise<{ token: string; role: string }> => {
  const response = await client.post<{ token: string; role: string }>(
    "/api/v1/mobile/auth/login",
    payload
  );
  return response;
};