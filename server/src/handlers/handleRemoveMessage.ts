import WebSocket from "ws";
import { prisma } from "../lib/prisma.js";
import { send } from "../lib/utils.js";

export async function handleRemoveMessage (
  ws: WebSocket,
  userId: string,
  data: {
    conversationId: number,
    messageId: number,
  }
) {
  try {
    const member = await prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: {
          userId,
          conversationId: data.conversationId,
        },
      },
    });
    if (!member) {
      throw new Error("Not a conversation member");
    }

    const message = await prisma.message.findUnique({
      where: {
        id: data.messageId,
      },
      select: {
        id: true,
        conversationId: true,
      },
    });
    if (!message || message?.conversationId !== data.conversationId) {
      throw new Error("Message not found");
    }

    await prisma.message.update({
      where: {id: message.id},
      data: {
        deletedBy: {
          connect: {id: member.id},
        },
      }
    });

    send(ws, {
      type: "remove_message_successfully",
      conversationId: data.conversationId,
      messageId: data.messageId,
    });
  } catch (err) {
    send(ws, {
      type: "remove_message_failed",
      conversationId: data.conversationId,
      messageId: data.messageId,
    });
  }
}
