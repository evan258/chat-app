import WebSocket from "ws";
import { ReactionType } from "../../generated/prisma/index.js";
import { send, sendToUser } from "../lib/utils.js";
import { prisma } from "../lib/prisma.js";

export async function handleReactionUpdate(
  ws: WebSocket,
  userId: string,
  data: {
    conversationId: number, 
    messageId: number,
    reaction: ReactionType,
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
      throw new Error("Not a member of this conversation");
    }

    const message = await prisma.message.findUnique({
      where: {
        id: data.messageId,
      },
      select: {
        conversationId: true,
      },
    });

    if (!message || message.conversationId !== data.conversationId) {
      throw new Error("Message not found");
    }

    let action : "added" | "removed" | "changed";

    const existingReaction = await prisma.messageReaction.findUnique({
      where: {
        messageId_userId: {
          messageId: data.messageId,
          userId,
        },
      },
    });

    if (existingReaction && existingReaction.reaction === data.reaction) {
      action = "removed";
      await prisma.messageReaction.delete({
        where: {
          messageId_userId: {
            messageId: data.messageId,
            userId,
          },
        },
      });
    } else {
      await prisma.messageReaction.upsert({
        where: {
          messageId_userId: {
            messageId: data.messageId,
            userId,
          },
        },
        create: {
          userId,
          messageId: data.messageId,
          reaction: data.reaction,
        },
        update: {
          reaction: data.reaction,
        },
      });

      if (existingReaction) action = "changed";
      else action = "added";
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

    send(ws, {
      type: "message_reaction_update_successfully",
      conversationId: data.conversationId,
      messageId: data.messageId,
      userId,
      reaction: data.reaction,
      action,
    });

    for (const member of members) {
      sendToUser(member.userId, {
        type: "incoming_message_reaction_update",
        messageId: data.messageId,
        conversationId: data.conversationId,
        userId,
        reaction: data.reaction,
        action,
      });
    }
  } catch (err) {
    send(ws, {
      type: "message_reaction_update_failed",
      conversationId: data.conversationId,
      messageId: data.messageId,
      userId,
      reaction: data.reaction,
    });
  }
}
