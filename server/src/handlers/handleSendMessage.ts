import WebSocket from "ws";
import { File} from "../../generated/prisma/index.js";
import { prisma } from "../lib/prisma.js";
import { getPreviewUrls, send, sendToUser } from "../lib/utils.js";

interface Message {
  id: string,
  conversationId: number,
  fileIds: number[],      
  text?: string,
}

export async function handleSendMessage (ws: WebSocket, userId: string, data: Message) {
  try {
    if (!data.text?.trim() && data.fileIds.length === 0) {
      throw new Error("Message cannot be empty");
    }
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

    let files: File[] = [];
    if (data.fileIds.length) {
      files = await prisma.file.findMany({
        where: {
          id: {
            in: data.fileIds,
          },
          ownerId: userId,
          uploaded: true,
        },
      });
    }
    
    if (files.length !== data.fileIds.length) {
      throw new Error("Invalid file IDs");
    }

    const fileById = new Map();
    files.forEach((file) => fileById.set(file.id, file));

    const orderedFiles = data.fileIds.map((id) => {
      const file = fileById.get(id);
      return file;
    });

    const previewUrls = await getPreviewUrls(orderedFiles);
    
    const message = await prisma.message.create({
      data: {
        conversationId: data.conversationId,
        senderId: userId,
        text: data.text?.trim() || null,
        files: {
          connect: files.map(({id}) => ({id})),
        },
      },
      include: {
        reactions: {
          select: {
            userId: true,
            reaction: true,
          },
        },
      },
    });

    const messageForClient = {
      id: message.id,
      conversationId: message.conversationId,
      text: message.text,
      unsent: false,
      status: "sent",
      previewUrls,
      createdAt: message.createdAt.toISOString(),
      reactions: message.reactions,
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

    await prisma.conversationMember.updateMany({
      where: {
        conversationId: data.conversationId,
        userId: {
          not: userId,
        },
      },
      data: {
        unreadCount: {
          increment: 1,
        },
      },
    });

    send(ws, {
      type: "message_sent_successfully",
      tempId: data.id,
      message: messageForClient,
    });

    for (const member of members) {
      sendToUser(member.userId, {
        type: "message_received",
        message: messageForClient,
      });
    }
  } catch (err) {
    console.log(err);
    send(ws, {
      type: "message_sent_failed",
      tempId: data.id,
      conversationId: data.conversationId,
    });
  }
}
