import { Request, Response } from "express";
import { prisma } from "../lib/prisma.js";
import { getPreviewUrls, sendToUser } from "../lib/utils.js";
import { ConversationType, File } from "../../generated/prisma/index.js";
import { s3Client } from "../lib/s3Client.js";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";

interface CreateConversation {
  type: ConversationType,
  members: string[],
  name?: string,
  fileId?: number,
}

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

export async function createConversation(req: Request, res: Response) {
  try {
    const userId = req.userId!;
    const { conversation }: { conversation: CreateConversation } = req.body;

    const members = conversation.members;

    if (conversation.type === "Direct") {
      if (members.length !== 1) {
        return res.status(400).json({
          message: "Direct conversation must have exactly two members",
        });
      }

      await prisma.friendship.update({
        where: {
          userId_friendId: {
            userId: members[0] as string,
            friendId: userId,
          },
        },
        data: {
          status: "Accepted",
        },
      });
    }

    const allMemberIds = [userId, ...members];

    let avatarUrl: string | undefined;

    if (conversation.fileId) {
      const file = await prisma.file.findUnique({
        where: {
          id: conversation.fileId,
          ownerId: userId,
          uploaded: true,
        },
      });

      if (!file) {
        return res.status(400).json({
          message: "Invalid conversation avatar",
        });
      }

      const urls = await getPreviewUrls([file]);
      avatarUrl = urls[0];
    }

    const friendShips = await prisma.friendship.findMany({
      where: {
        OR: [
          {
            userId: {
              in: members,
            },
            friendId: userId,
          },
          {
            userId,
            friendId: {
              in: members,
            },
          },
        ],
        status: "Accepted",
      },
    });

    if (!friendShips.length || friendShips.length !== members.length) {
      return res.status(400).json({message: "Invalid members"});
    }

    const createdConversation = await prisma.conversation.create({
      data: {
        type: conversation.type,
        name: conversation.name?.trim() || null,
        fileId: conversation.fileId ?? null,

        members: {
          create: allMemberIds.map((memberId) => ({
            userId: memberId,
          })),
        },
      },
      select: {
        id: true,
        type: true,
        name: true,
        members: {
          select: {
            userId: true,
          },
        },
      },
    });

    let name: string | undefined;
    if (createdConversation.name) name = createdConversation.name;

    const conversationForClient = {
      id: createdConversation.id,
      type: createdConversation.type,
      members: createdConversation.members.map(({ userId }) => userId),
      avatarUrl,
      name,
      unreadCount: 0,
    };

    res.status(201).json(conversationForClient);

    for (const memberId of members) {
      sendToUser(memberId, {
        type: "incoming_conversation_added",
        conversation: conversationForClient,
      });
    }
  } catch (err) {
    res.status(500).json({
      message: "Failed to create conversation",
    });
  }
}

export async function updateConversation(req: Request, res: Response) {
  try {
    const userId = req.userId!;
    const conversationId = Number(req.params.conversationId);
    const {name, fileId}: {name?: string, fileId?: number} = req.body;

    if (!name && !fileId) {
      return res.status(400).json({message: "Failed to update conversation"});
    }

    const member = await prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
    });

    if (!member) {
      return res.status(403).json({
        message: "Not a member of this conversation",
      });
    }

    const existingConversation = await prisma.conversation.findUnique({
      where: {
        id: conversationId,
      },
      select: {
        id: true,
        type: true,
        fileId: true,
      },
    });

    if (!existingConversation) {
      return res.status(404).json({
        message: "Conversation not found",
      });
    }

    if (existingConversation.type === "Direct") {
      return res.status(400).json({
        message: "Direct conversation cannot be updated",
      });
    }

    if (name && !name.trim()) {
      return res.status(400).json({
        message: "Conversation name cannot be empty",
      });
    }

    let avatarUrl: string | undefined;
    let fileToDelete: File | undefined | null;

    if (fileId) {
      const file = await prisma.file.findUnique({
        where: {
          id: fileId,
          ownerId: userId,
          uploaded: true,
        },
      });

      if (!file) {
        return res.status(400).json({
          message: "Invalid conversation avatar",
        });
      }
      avatarUrl = (await getPreviewUrls([file]))[0];

      if (existingConversation.fileId && existingConversation.fileId !== file.id) {
        fileToDelete = await prisma.file.findUnique({
          where: {
            id: existingConversation.fileId,
          },
        });
      }
    }

    const updated = await prisma.conversation.update({
      where: {
        id: conversationId,
      },
      data: {
        ...(name && {name: name.trim()}),
        ...(fileId && {fileId: fileId}),
      },
      select: {
        id: true,
        name: true,
        fileId: true,
        members: {
          select: {
            userId: true,
          },
        },
      },
    });

    const updatedConversation = {
      id: updated.id,
      ...(name && {name: updated.name}),
      ...(fileId && {avatarUrl}),
    };

    res.json(updatedConversation);

    for (const member of updated.members) {
      if (member.userId === userId) continue;

      sendToUser(member.userId, {
        type: "incoming_conversation_update",
        conversation: updatedConversation,
      });
    }
    
    if (fileToDelete) {
      await prisma.file.delete({
        where: {
          id: fileToDelete.id,
        },
      });
      await s3Client.send(
        new DeleteObjectCommand({
          Bucket: process.env.S3_BUCKET_NAME!,
          Key: fileToDelete?.storageKey,
        })
      );
    }
  } catch (err) {
    res.status(500).json({
      message: "Failed to update conversation",
    });
  }
}

export async function removeMember(req: Request, res: Response) {
  try {
    const userId = req.userId!;
    const conversationId = Number(req.params.conversationId);
    const memberId = req.params.memberId as string;

    const conversation = await prisma.conversation.findUnique({
      where: {
        id: conversationId,
      },
      select: {
        type: true,
        members: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (!conversation) {
      return res.status(404).json({
        message: "Conversation not found",
      });
    }

    if (conversation.type !== "Group") {
      return res.status(400).json({
        message: "Members cannot be removed from a direct conversation",
      });
    }

    const isMember = conversation.members.some(
      (member) => member.userId === userId
    );

    if (!isMember) {
      return res.status(403).json({
        message: "Not a conversation member",
      });
    }

    const targetMember = conversation.members.some(
      (member) => member.userId === memberId
    );

    if (!targetMember) {
      return res.status(404).json({
        message: "User is not a conversation member",
      });
    }

    await prisma.conversationMember.delete({
      where: {
        conversationId_userId: {
          conversationId,
          userId: memberId,
        },
      },
    });

    res.json({
      conversationId,
      memberId,
    });

    sendToUser(memberId, {
      type: "removed_from_conversation",
      conversationId,
      userId,
    });

    for (const member of conversation.members) {
      if (member.userId === memberId) return;
      sendToUser(member.userId, {
        type: "incoming_member_removal",
        conversationId,
        memberId,
        userId,
      });
    }
  } catch (err) {
    console.log(err);

    res.status(500).json({
      message: "Failed to remove member",
    });
  }
}
