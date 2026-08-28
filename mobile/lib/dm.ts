import { api } from "@/lib/api";

export async function startDirectChat(input: {
  toUserId: string;
  contextType?: "SERVICE" | "JOB" | "MEET" | "IN";
  contextId?: string;
  body?: string;
}) {
  const data = await api<{ thread?: { id: string }; threadId?: string }>(
    "/api/dm",
    {
      method: "POST",
      body: JSON.stringify(input),
    }
  );
  return data.thread?.id ?? data.threadId ?? null;
}
