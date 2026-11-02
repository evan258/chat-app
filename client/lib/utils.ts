import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { authClient } from "./auth-client";
import type { Conversation } from "@/state/conversationsSlice";
import type { User } from "@/state/usersSlice";
import type { ReactionType } from "@/generated/prisma";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export async function markConversationAsRead(conversationId: number) {
  try {
    const { data, error } = await authClient.token();
    if (error || !data?.token) return;
    
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/conversations/${conversationId}/read`, {
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

// direct conversations are named after the other person, groups have their own name (or the names of the members)
export function getConversationInfo(conversation: Conversation, myId: string | undefined, usersById: Record<string, User>) {
  if (conversation.type === "Direct") {
    const otherUserId = conversation.members.find((id) => id !== myId);
    const otherUser = otherUserId ? usersById[otherUserId] : undefined;

    return {
      name: otherUser?.name ?? "Unknown user",
      avatarUrl: otherUser?.avatarUrl,
      otherUserId,
    };
  }

  const memberNames = conversation.members
    .filter((id) => id !== myId)
    .map((id) => usersById[id]?.name.split(" ")[0] ?? "Member")
    .join(", ");

  return {
    name: conversation.name || memberNames || "Group",
    avatarUrl: conversation.avatarUrl,
    otherUserId: undefined,
  };
}

export const reactionEmojis: Record<ReactionType, string> = {
  Love: "❤️",
  Haha: "😂",
  Sad: "😢",
  Wow: "😮",
  Angry: "😡",
};
