import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { authClient } from "./auth-client";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export async function markConversationAsRead(conversationId: number) {
  try {
    const { data, error } = await authClient.token();
    if (error || !data?.token) return;
    
    const response = await fetch(`${process.env.API_BASE_URL}/conversations/${conversationId}/read`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${data.token}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to mark conversation as read");
    }
  } catch (err) {
    console.log(err);
  }
}
