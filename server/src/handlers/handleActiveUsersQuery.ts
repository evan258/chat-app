import { WebSocket } from "ws";
import { prisma } from "../lib/prisma.js";
import { clients } from "../websocket.js";

export async function handleActiveUsersQuery(ws: WebSocket) {
  const userId = ws.userId;

  const friendships = await prisma.friendship.findMany({
    where: {
      status: "Accepted",
      OR: [
        { userId },
        { friendId: userId },
      ],
    },
    select: {
      userId: true,
      friendId: true,
    },
  });

  const friendIds = friendships.map((friendship) =>
    friendship.userId === userId
      ? friendship.friendId
      : friendship.userId
  );

  const groups = await prisma.conversationMember.findMany({
    where: {
      userId,
      conversation: {
        type: "Group",
      },
    },
    select: {
      conversationId: true,
    },
  });

  const groupIds = groups.map((group) => group.conversationId);

  const groupMembers = groupIds.length
    ? await prisma.conversationMember.findMany({
        where: {
          conversationId: {
            in: groupIds,
          },
          userId: {
            not: userId,
          },
        },
        select: {
          userId: true,
        },
      })
    : [];

  const relevantUserIds = new Set([
    ...friendIds,
    ...groupMembers.map((member) => member.userId),
  ]);

  for (const relevantUserId of relevantUserIds) {
    if (!clients.has(relevantUserId)) continue;

    ws.send(
      JSON.stringify({
        type: "user_active",
        userId: relevantUserId,
      })
    );
  }
}
