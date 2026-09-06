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
        let avatarExpiresAt: string | undefined;

        if (conversation.avatar) {
          const { urls, expiresAt } = await getPreviewUrls([conversation.avatar]);
          avatarUrl = urls[0];
          avatarExpiresAt = expiresAt;
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
          expiresAt: avatarExpiresAt,
          name: conversation.name,
          unreadCount: currentMember?.unreadCount ?? 0,
          lastActivity,
        };
      })
    );

    res.json(result);
  } catch (err) {
    res.status(500).json({
      message: "Failed to retrieve conversations",
    });
  }
}

export async function createConversation(req: Request, res: Response) {
  try {
    const userId = req.userId!;
    const { conversation }: { conversation: CreateConversation } = req.body;

    const members = conversation.members.filter((id) => id !== userId);

    if (conversation.type === "Direct") {
      return res.status(400).json({
        message: "Direct conversations are created on accepting friend request",
      });
    }

    if (members.length < 2) {
      return res.status(400).json({
        message: "Groups need at least two other members",
      });
    }

    const allMemberIds = [userId, ...members];

    let avatarUrl: string | undefined;
    let avatarExpiresAt: string | undefined;

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

      const { urls, expiresAt } = await getPreviewUrls([file]);
      avatarUrl = urls[0];
      avatarExpiresAt = expiresAt;
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
      return res.status(400).json({ message: "Invalid members" });
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
      expiresAt: avatarExpiresAt,
      name,
      unreadCount: 0,
    };

    res.status(201).json(conversationForClient);

    for (const memberId of members) {
      sendToUser(memberId, {
        type: "incoming_conversation_added",
        conversation: conversationForClient,
      });

      const notification = await prisma.notification.create({
        data: {
          initiatorId: userId,
          recipientId: memberId,
          type: "AddedToGroup",
          conversationId: createdConversation.id,
        },
      });

      sendToUser(memberId, {
        type: "incoming_notification",
        notification: {
          id: notification.id,
          type: notification.type,
          initiatorId: notification.initiatorId,
          recipientId: notification.recipientId,

          conversationId: {
            id: createdConversation.id,
            name: createdConversation.name,
            avatarUrl,
            expiresAt: avatarExpiresAt,
          },

          createdAt: notification.createdAt.toISOString(),
        },
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
        name: true,
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
    let avatarExpiresAt: string | undefined;
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
      const { urls, expiresAt } = await getPreviewUrls([file]);
      avatarUrl = urls[0];
      avatarExpiresAt = expiresAt;

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
      ...(fileId && {
        avatarUrl,
        expiresAt: avatarExpiresAt,
      }),
    };

    res.json(updatedConversation);

    const nameChanged = updated.name?.trim() !== existingConversation.name;

    const fileChanged = updated.fileId !== existingConversation.fileId;

    for (const member of updated.members) {
      if (member.userId === userId) continue;

      sendToUser(member.userId, {
        type: "incoming_conversation_update",
        conversation: updatedConversation,
      });

      if (nameChanged) {
        const notification = await prisma.notification.create({
          data: {
            initiatorId: userId,
            recipientId: member.userId,
            type: "GroupNameChanged",
            conversationId,
          },
          include: {
            conversation: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
          },
        });

        let conversationAvatarUrl: string | undefined;
        let conversationAvatarExpiresAt: string | undefined;

        if (notification.conversation?.avatar) {
          const { urls, expiresAt } = await getPreviewUrls([notification.conversation.avatar]);
          conversationAvatarUrl = urls[0];
          conversationAvatarExpiresAt = expiresAt;
        }

        sendToUser(member.userId, {
          type: "incoming_notification",
          notification: {
            id: notification.id,
            type: notification.type,
            initiatorId: notification.initiatorId,
            recipientId: notification.recipientId,
            ...(notification.conversation && {
              conversationId: {
                id: notification.conversation.id,
                name: notification.conversation.name,
                avatarUrl: conversationAvatarUrl,
                expiresAt: conversationAvatarExpiresAt,
              },
            }),
            createdAt: notification.createdAt.toISOString(),
          },
        });
      }

      if (fileChanged) {
        const notification = await prisma.notification.create({
          data: {
            initiatorId: userId,
            recipientId: member.userId,
            type: "GroupPhotoChanged",
            conversationId,
          },
          include: {
            conversation: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
          },
        });

        
        let conversationAvatarUrl: string | undefined;
        let conversationAvatarExpiresAt: string | undefined;

        if (notification.conversation?.avatar) {
          const { urls, expiresAt } = await getPreviewUrls([notification.conversation.avatar]);
          conversationAvatarUrl = urls[0];
          conversationAvatarExpiresAt = expiresAt;
        }


        sendToUser(member.userId, {
          type: "incoming_notification",
          notification: {
            id: notification.id,
            type: notification.type,
            initiatorId: notification.initiatorId,
            recipientId: notification.recipientId,
            ...(notification.conversation && {
              conversationId: {
                id: notification.conversation.id,
                name: notification.conversation.name,
                avatarUrl: conversationAvatarUrl,
                expiresAt: conversationAvatarExpiresAt,
              },
            }),
            createdAt: notification.createdAt.toISOString(),
          },
        });
      }
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
        name: true,
        avatar: true,
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

    const notification = await prisma.notification.create({
      data: {
        initiatorId: userId,
        recipientId: memberId,
        type: "RemovedFromGroup",
        conversationId,
      },
      include: {
        conversation: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    });


    let conversationAvatarUrl: string | undefined;
    let conversationAvatarExpiresAt: string | undefined;

    if (notification.conversation?.avatar) {
      const { urls, expiresAt } = await getPreviewUrls([notification.conversation.avatar]);
      conversationAvatarUrl = urls[0];
      conversationAvatarExpiresAt = expiresAt;
    }


    const notificationForClient = {
      id: notification.id,
      type: notification.type,

      initiatorId: notification.initiatorId,
      recipientId: notification.recipientId,

      ...(notification.conversation && {
        conversationId: {
          id: notification.conversation.id,
          name: notification.conversation.name,
          avatarUrl: conversationAvatarUrl,
          expiresAt: conversationAvatarExpiresAt,
        },
      }),

      createdAt: notification.createdAt.toISOString(),
    };

    res.json({
      conversationId,
      memberId,
    });

    sendToUser(memberId, {
      type: "removed_from_conversation",
      conversationId,
      userId,
    });

    sendToUser(memberId, {
      type: "incoming_notification",
      notification: notificationForClient,
    });

    const remainingMemberIds = conversation.members.map((member) => member.userId).filter((id) => id !== memberId);

    const friendships = await prisma.friendship.findMany({
      where: {
        status: "Accepted",
        OR: [
          {
            userId: memberId,
            friendId: {
              in: remainingMemberIds,
            },
          },
          {
            friendId: memberId,
            userId: {
              in: remainingMemberIds,
            },
          },
        ],
      },
      select: {
        userId: true,
        friendId: true,
      },
    });

    const friendIds = friendships.map((friendship) =>
      friendship.userId === memberId
        ? friendship.friendId
        : friendship.userId
    );

    for (const otherMemberId of remainingMemberIds) {
      if (friendIds.includes(otherMemberId)) continue;

      sendToUser(memberId, {
        type: "remove_user",
        userId: otherMemberId,
      });

      sendToUser(otherMemberId, {
        type: "remove_user",
        userId: memberId,
      });
    }

    for (const member of conversation.members) {
      if (member.userId === memberId) continue;

      sendToUser(member.userId, {
        type: "incoming_member_removal",
        conversationId,
        memberId,
      });

      sendToUser(member.userId, {
        type: "incoming_notification",
        notification: notificationForClient,
      });
    }
  } catch (err) {
    res.status(500).json({
      message: "Failed to remove member",
    });
  }
}
