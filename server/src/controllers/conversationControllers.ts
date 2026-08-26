import { Request, Response } from "express";
import { prisma } from "../lib/prisma.js";
import { getPreviewUrls } from "../lib/utils.js";

export async function getConversations(req: Request, res: Response) {
  try {
    const userId = req.userId;

    const conversations = await prisma.conversation.findMany({
      where: {
        members: {
          some: {
            userId: userId!,
          },
        },
      },
      include: {
        lastMessage: {
          include: {
            reactions: {
              orderBy: {
                createdAt: "desc",
              },
              take: 1,
              select: {
                createdAt: true,
                userId: true,
                reaction: true,
              },
            },
            files: {
              select: {
                id: true,
              },
            },
          },
        },

        avatar: true,

        members: {
          select: {
            userId: true,
            unreadCount: true,
          },
        },
      },
    });

    const result = await Promise.all(
      conversations.map(async (conversation) => {
        let avatarUrl: string | undefined;

        if (conversation.avatar) {
          const urls = await getPreviewUrls([conversation.avatar]);
          avatarUrl = urls[0];
        }

        const currentMember = conversation.members.find(
          (member) => member.userId === userId
        );

        const lastMessage = conversation.lastMessage;
        const lastReaction = lastMessage?.reactions[0];

        let lastActivity;

        if (lastMessage) {
          if (
            lastReaction &&
            lastReaction.createdAt > lastMessage.createdAt
          ) {
            lastActivity = {
              type: "reaction" as const,
              messageId: lastMessage.id,
              senderId: lastMessage.senderId,
              userId: lastReaction.userId,
              reaction: lastReaction.reaction,
            };
          } else {
            lastActivity = {
              type: "message" as const,
              id: lastMessage.id,
              senderId: lastMessage.senderId,
              text: lastMessage.text,
              filesLen: lastMessage.files.length,
              unsent: lastMessage.unsent,
            };
          }
        }

        return {
          id: conversation.id,
          type: conversation.type,
          members: conversation.members.map(
            ({ userId }) => userId
          ),
          avatarUrl,
          name: conversation.name,
          unreadCount: currentMember?.unreadCount ?? 0,
          lastActivity,
        };
      })
    );

    res.json(result);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: "Failed to retrieve conversations",
    });
  }
}

export async function markConversationAsRead(req: Request, res: Response) {
  try {
    const {conversationId} = req.params;
    const userId = req.userId;

    const member = await prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: {
          conversationId: Number(conversationId),
          userId: userId!,
        },
      },
    });

    if (!member) {
      return res.status(403).json({message: "Not a member of this conversation"});
    }

    await prisma.conversationMember.update({
      where: {
        conversationId_userId: {
          conversationId: Number(conversationId),
          userId: userId!,
        },
      },
      data: {
        unreadCount: 0,
      },
    });
  } catch (err) {
    res.status(500).json({message: "Failed to mark conversation as read"});
  }
}
