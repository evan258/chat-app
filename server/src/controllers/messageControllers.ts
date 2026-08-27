import { Request, Response } from "express";
import { prisma } from "../lib/prisma.js";
import { getPreviewUrls } from "../lib/utils.js";

export async function getMessages (req: Request, res: Response) {
  try {
    const {conversationId} = req.params;

    const member = await prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: {
          conversationId: Number(conversationId),
          userId: req.userId!,
        },
      },
    });

    if (!member) {
      return res.status(403).json({message: "Not a member of this conversation"});
    }

    const messages = await prisma.message.findMany({
      where: {
        conversationId: Number(conversationId),
        NOT: {
          deletedBy: {
            some: {
              userId: req.userId!,
            },
          },
        }
      },
      orderBy: {
        id: "asc",
      },
      include: {
        files: true,
        reactions: {
          select: {
            userId: true,
            reaction: true,
          },
        },
      },
    });

    const result = await Promise.all(
      messages.map(async (message) => {
        const previewUrls = await getPreviewUrls(message.files);
        return {
          id: message.id,
          conversationId: message.conversationId,
          senderId: message.senderId,
          createdAt: message.createdAt.toISOString(),
          previewUrls,
          text: message.text,
          unsent: message.unsent,
          status: "sent",
          reactions: message.reactions,
        };
      })
    );
    
    res.json(result);
  } catch (err) {
    res.status(500).json({message: "Failed to retreive messages"});
  }
}

export async function getOlderMessages (req: Request, res: Response) {
  try {
    const {conversationId, messageId} = req.params;

    const member = await prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: {
          conversationId: Number(conversationId),
          userId: req.userId!,
        },
      },
    });

    if (!member) {
      return res.status(403).json({message: "Not a member of this conversation"});
    }

    const messages = await prisma.message.findMany({
      where: {
        conversationId: Number(conversationId),
      },
      skip: 1,
      cursor: {
        id: Number(messageId),
      },
      take: -40,
      orderBy: {
        id: "asc",
      },
      include: {
        reactions: {
          select: {
            userId: true,
            reaction: true,
          },
        },
        files: true,
      },
    });

    const result = await Promise.all(
      messages.map(async (message) => {
        const previewUrls = await getPreviewUrls(message.files);
        return {
          id: message.id,
          conversationId: message.conversationId,
          senderId: message.senderId,
          createdAt: message.createdAt.toISOString(),
          previewUrls,
          text: message.text,
          unsent: message.unsent,
          status: "sent",
          reactions: message.reactions,
        };
      })
    );
    
    res.json(result);
  } catch (err) {
    res.status(500).json({message: "Failed to retreive messages"});
  }
}
