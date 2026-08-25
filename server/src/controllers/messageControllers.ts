import { Request, Response } from "express";
import { prisma } from "../lib/prisma.js";

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
      where: {conversationId: Number(conversationId)},
      orderBy: {
        createdAt: "asc",
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

    res.json(messages);
  } catch (err) {
    res.status(500).json({message: "Failed to retreive messages"});
  }
}
