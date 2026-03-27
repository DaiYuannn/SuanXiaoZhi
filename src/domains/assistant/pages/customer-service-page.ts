import { HttpClient } from "../../../shared/utils/http-client.js";

export const sendCustomerServiceMessage = async (
  client: HttpClient,
  message: string,
  sessionId?: string
): Promise<{ content: string; sessionId: string }> => {
  const response = await client.post<{ data: { content: string; sessionId: string } }>(
    "/api/v1/mobile/ai/chat",
    { message, sessionId }
  );
  return response.data;
};