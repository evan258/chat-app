import { authClient } from "./auth-client";
import type { Conversation } from "@/state/conversationsSlice";
import type { FriendshipExtended } from "@/state/friendshipsSlice";
import type { Message } from "@/state/messagesSlice";
import type { Notification } from "@/state/notificationsSlice";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

let cachedToken: { token: string, expiresAt: number } | null = null;

function getTokenExpiry(token: string) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return typeof payload.exp === "number" ? payload.exp * 1000 : 0;
  } catch {
    return 0;
  }
}

// reuse the jwt until shortly before it expires so parallel requests don't each fetch a new one
export async function getToken() {
  if (cachedToken && cachedToken.expiresAt - 30 * 1000 > Date.now()) {
    return cachedToken.token;
  }

  const { data, error } = await authClient.token();
  if (error || !data?.token) {
    cachedToken = null;
    throw new Error("Failed to get authentication token");
  }

  cachedToken = { token: data.token, expiresAt: getTokenExpiry(data.token) };
  return data.token;
}

export function clearToken() {
  cachedToken = null;
}

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getToken();

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      ...init.headers,
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.message ?? `Request failed: ${response.status}`);
  }

  return response.json();
}

export function getConversations() {
  return apiFetch<Conversation[]>("/conversations");
}

export function getFriendships() {
  return apiFetch<FriendshipExtended[]>("/friendships");
}

export function getNotifications() {
  return apiFetch<{notifications: Notification[], lastReadNotificationId: number | null}>("/notifications");
}

export function getMessages(conversationId: number) {
  return apiFetch<Message[]>(`/messages/conversations/${conversationId}`);
}

export function getOlderMessages(conversationId: number, messageId: number) {
  return apiFetch<Message[]>(`/messages/conversations/${conversationId}/messages/${messageId}`);
}
