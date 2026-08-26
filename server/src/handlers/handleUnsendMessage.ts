import WebSocket from "ws";
import { prisma } from "../lib/prisma.js";
import { send, sendToUser } from "../lib/utils.js";
import { s3Client } from "../lib/s3Client.js";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";

export async function handleUnsendMessage (
  ws: WebSocket,
  userId: string,
  data: {
    messageId: number,
    conversationId: number,
  }
) {
  try {
    const message = await prisma.message.findUnique({
      where: {id: data.messageId},
      include: {
        files: true,
      },
    });
    if (!message || message.conversationId !== data.conversationId) {
      throw new Error("Message not found");
    }
    if (message.senderId !== userId) {
      throw new Error("Unauthorized to unsend this message");
    }
    if (message.unsent) {
      throw new Error("Message already unsent");
    }

    await prisma.$transaction(async (tx) => {
      await tx.messageReaction.deleteMany({
        where: {messageId: data.messageId},
      });

      await tx.file.deleteMany({
        where: {messageId: data.messageId},
      });

      await tx.message.update({
        where: {id: data.messageId},
        data: {
          text: null,
          unsent: true,
        },
      });
    });

    await Promise.all(
      message.files.map((file) => {
        s3Client.send(
          new DeleteObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET!,
            Key: file.storageKey,
          })
        )
      })
    )

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
      type: "message_unsent_successfully",
      conversationId: data.conversationId,
      messageId: data.messageId,
    });

    for (const member of members) {
      sendToUser(member.userId, {
        type:"incoming_message_unsent",
        conversationId: data.conversationId,
        messageId: data.messageId,
      });
    }
  } catch (err) {
    send(ws, {
      type: "message_unsent_failed",
      conversationId: data.conversationId,
      messageId: data.messageId,
    });
  }
}
