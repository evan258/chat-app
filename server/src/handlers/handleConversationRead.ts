import { prisma } from "../lib/prisma.js";
import { sendToUser } from "../lib/utils.js";

export async function handleConversationRead(
  userId: string,
  data: {
    conversationId: number,
  }
) {
  try {
    const member = await prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: {
          conversationId: data.conversationId,
          userId,
        },
      },
    });

    if (!member) {
      throw new Error("Not a conversation member");
    }

    const lastMessage = await prisma.message.findFirst({
      where: {
        conversationId: data.conversationId,
      },
      orderBy: {
        id: "desc",
      },
      select: {
        id: true,
      },
    });

    if (!lastMessage) {
      return;
    }

    await prisma.conversationMember.update({
      where: {
        conversationId_userId: {
          conversationId: data.conversationId,
          userId,
        },
      },
      data: {
        lastReadMessageId: lastMessage.id,
        unreadCount: 0,
      },
    });

    const members = await prisma.conversationMember.findMany({
      where: {
        conversationId: data.conversationId,
        userId: {
          not: userId,
        },
      },
      select: {
        userId: true,
      },
    });

    for (const member of members) {
      sendToUser(member.userId, {
        type: "incoming_conversation_read",
        conversationId: data.conversationId,
        userId,
        messageId: lastMessage.id,
      });
    }
  } catch (err) {
    console.log(err);
  }
}
