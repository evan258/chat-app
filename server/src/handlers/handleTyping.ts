import { prisma } from "../lib/prisma.js";
import { sendToUser } from "../lib/utils.js";

export async function handleTyping(
  userId: string,
  data: {
    conversationId: number,
    isTyping: boolean,
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
        type: "user_typing",
        conversationId: data.conversationId,
        userId,
        isTyping: data.isTyping,
      });
    }
  } catch (err) {
    console.log(err);
  }
}
