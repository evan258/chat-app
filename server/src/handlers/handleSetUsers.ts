import { WebSocket } from "ws";
import { prisma } from "../lib/prisma.js";
import { getUsersForClient, send } from "../lib/utils.js";

// sent when the connection is built, so the client has every user it can see: friends (also pending) and group members
export async function handleSetUsers(ws: WebSocket) {
  try {
    const userId = ws.userId;

    const friendships = await prisma.friendship.findMany({
      where: {
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

    const users = await getUsersForClient([...relevantUserIds]);

    send(ws, {
      type: "set_users",
      users,
    });
  } catch (err) {
    console.log(err);
  }
}
