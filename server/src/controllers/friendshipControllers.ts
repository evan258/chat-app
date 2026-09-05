import { Request, Response } from "express";
import { prisma } from "../lib/prisma.js";
import { getPreviewUrls, sendToUser } from "../lib/utils.js";
import { s3Client } from "../lib/s3Client.js";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";

export async function unfriendUser(req: Request, res: Response) {
  try {
    const userId = req.userId!;
    const friendId = req.params.userId as string;

    if (!friendId || friendId === userId) {
      return res.status(400).json({message: "Invalid users"});
    }

    const friendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          {
            userId,
            friendId,
          },
          {
            userId: friendId,
            friendId: userId,
          },
        ],
      },
    });

    if (!friendship) {
      return res.status(404).json({message: "Friendship not found"});
    }

    const conversation = await prisma.conversation.findFirst({
      where: {
        type: "Direct",
        members: {
          every: {
            userId: {
              in: [userId, friendId],
            },
          },
        },
      },
      select: {
        id: true,
        fileId: true,
        lastMessageId: true,
        members: {
          select: {
            userId: true,
          },
        },
        messages: {
          select: {
            id: true,
            files: {
              select: {
                id: true,
                storageKey: true,
              },
            },
          },
        },
      },
    });

    if (!conversation) {
      return res.status(400).json({message: "Conversation not found"});
    }

    const s3Keys: string[] = [];

    if (conversation.fileId) {
      const avatar = await prisma.file.findUnique({
        where: {
          id: conversation.fileId,
        },
        select: {
          storageKey: true,
        },
      });

      if (avatar) {
        s3Keys.push(avatar.storageKey);
      }
    }

    for (const message of conversation.messages) {
      for (const file of message.files) {
        s3Keys.push(file.storageKey);
      }
    }

    const notification = await prisma.notification.create({
      data: {
        initiatorId: userId,
        recipientId: friendId,
        type: "Unfriended",
      },
      include: {
        initiator: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    });

    await prisma.$transaction(async (tx) => {
      await tx.conversation.update({
        where: {
          id: conversation.id,
        },
        data: {
          lastMessageId: null,
        },
      });

      await tx.conversationMember.deleteMany({
        where: {
          conversationId: conversation.id,
        },
      });

      await tx.messageReaction.deleteMany({
        where: {
          messageId: {
            in: conversation.messages.map((message) => message.id),
          },
        },
      });

      await tx.file.deleteMany({
        where: {
          messageId: {
            in: conversation.messages.map((message) => message.id),
          },
        },
      });

      await tx.message.deleteMany({
        where: {
          conversationId: conversation.id,
        },
      });

      if (conversation.fileId) {
        await tx.file.delete({
          where: {
            id: conversation.fileId,
          },
        });
      }

      await tx.notification.deleteMany({
        where: {
          conversationId: conversation.id,
        },
      });

      await tx.conversation.delete({
        where: {
          id: conversation.id,
        },
      });

      await tx.friendship.delete({
        where: {
          id: friendship.id,
        },
      });
    });

    let initiatorAvatarUrl: string | undefined;

    if (notification.initiator.avatar) {
      initiatorAvatarUrl = (await getPreviewUrls([notification.initiator.avatar]))[0];
    }

    const notificationForClient = {
      id: notification.id,
      type: notification.type,
      initiator: {
        id: notification.initiator.id,
        name: notification.initiator.name,
        avatarUrl: initiatorAvatarUrl,
      },
      createdAt: notification.createdAt.toISOString(),
    };

    res.json({
      friendId,
      userId,
      conversationId: conversation.id,
    });

    sendToUser(friendId, {
      type: "incoming_user_unfriend",
      friendId,
      userId,
      conversationId: conversation.id,
    });

    sendToUser(friendId, {
      type: "incoming_notification",
      notification: notificationForClient,
    });

    for (const storageKey of s3Keys) {
      await s3Client.send(
        new DeleteObjectCommand({
          Bucket: process.env.S3_BUCKET_NAME!,
          Key: storageKey,
        })
      );
    }
  } catch (err) {
    res.status(500).json({message: "Failed to unfriend user"});
  }
}

export async function rejectFriendRequest(req: Request, res: Response) {
  try {
    const userId = req.userId!;
    const friendId = req.params.userId as string;

    const friendship = await prisma.friendship.findUnique({
      where: {
        userId_friendId: {
          userId: friendId,
          friendId: userId,
        },
      },
    });

    if (!friendship) {
      return res.status(404).json({message: "Friend request not found"});
    }

    if (friendship.status !== "Pending") {
      return res.status(400).json({message: "Friend request is not pending"});
    }

    const notification = await prisma.notification.create({
      data: {
        initiatorId: userId,
        recipientId: friendId,
        type: "FriendRequestRejected",
      },
      include: {
        initiator: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    });

    await prisma.friendship.delete({
      where: {
        id: friendship.id,
      },
    });

    let initiatorAvatarUrl: string | undefined;

    if (notification.initiator.avatar) {
      initiatorAvatarUrl = (await getPreviewUrls([notification.initiator.avatar]))[0];
    }

    const notificationForClient = {
      id: notification.id,
      type: notification.type,
      initiator: {
        id: notification.initiator.id,
        name: notification.initiator.name,
        avatarUrl: initiatorAvatarUrl,
      },
      createdAt: notification.createdAt.toISOString(),
    };

    res.json({
      friendId,
      userId,
    });

    sendToUser(friendId, {
      type: "friend_request_rejected",
      friendId,
      userId,
    });

    sendToUser(friendId, {
      type: "incoming_notification",
      notification: notificationForClient,
    });
  } catch (err) {
    res.status(500).json({message: "Failed to reject friend request"});
  }
}

export async function acceptFriendRequest(req: Request, res: Response) {
  try {
    const userId = req.userId!;
    const friendId = req.params.userId as string;

    const friendship = await prisma.friendship.findUnique({
      where: {
        userId_friendId: {
          userId: friendId,
          friendId: userId,
        },
      },
    });

    if (!friendship) {
      return res.status(404).json({message: "Friend request not found"});
    }

    if (friendship.status !== "Pending") {
      return res.status(400).json({message: "Friend request is not pending"});
    }

    const { conversation, notification } = await prisma.$transaction(async (tx) => {
      await tx.friendship.update({
        where: {
          id: friendship.id,
        },
        data: {
          status: "Accepted",
        },
      });

      const conversation = await tx.conversation.create({
        data: {
          type: "Direct",
          members: {
            create: [
              { userId },
              { userId: friendId },
            ],
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

      const notification = await tx.notification.create({
        data: {
          initiatorId: userId,
          recipientId: friendId,
          type: "FriendRequestAccepted",
          conversationId: conversation.id,
        },
        include: {
          initiator: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
          conversation: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
        },
      });

      return {conversation, notification};
    });

    const conversationForClient = {
      id: conversation.id,
      type: conversation.type,
      members: conversation.members.map(({ userId }) => userId),
      unreadCount: 0,
    };

    let initiatorAvatarUrl: string | undefined;
    let conversationAvatarUrl: string | undefined;

    if (notification.initiator.avatar) {
      initiatorAvatarUrl = (
        await getPreviewUrls([notification.initiator.avatar])
      )[0];
    }

    if (notification.conversation?.avatar) {
      conversationAvatarUrl = (
        await getPreviewUrls([notification.conversation.avatar])
      )[0];
    }

    const notificationForClient = {
      id: notification.id,
      type: notification.type,

      initiator: {
        id: notification.initiator.id,
        name: notification.initiator.name,
        avatarUrl: initiatorAvatarUrl,
      },

      ...(notification.conversation && {
        conversationId: {
          id: notification.conversation.id,
          name: notification.conversation.name,
          avatarUrl: conversationAvatarUrl,
        },
      }),

      createdAt: notification.createdAt.toISOString(),
    };

    res.status(201).json({
      conversation: conversationForClient,
      friendId,
      userId,
    });

    sendToUser(friendId, {
      type: "friend_request_accepted",
      conversation: conversationForClient,
      friendId,
      userId,
    });

    sendToUser(friendId, {
      type: "incoming_notification",
      notification: notificationForClient,
    });
  } catch (err) {
    res.status(500).json({message: "Failed to accept friend request"});
  }
}

export async function addFriendRequest(req: Request, res: Response) {
  try {
    const userId = req.userId!;
    const friendId = req.params.friendId as string;

    if (userId === friendId) {
      return res.status(400).json({message: "Cannot send friend request to yourself"});
    }

    const friend = await prisma.user.findUnique({
      where: {
        id: friendId,
      },
      select: {
        id: true,
      },
    });

    if (!friend) {
      return res.status(404).json({message: "User not found",});
    }

    const existingFriendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          {
            userId,
            friendId,
          },
          {
            userId: friendId,
            friendId: userId,
          },
        ],
      },
    });

    if (existingFriendship) {
      return res.status(409).json({message: "Already existing friendship or friend request"});
    }

    const friendship = await prisma.friendship.create({
      data: {
        userId,
        friendId,
      },
    });

    const notification = await prisma.notification.create({
      data: {
        initiatorId: userId,
        recipientId: friendId,
        type: "FriendRequestSent",
      },
      include: {
        initiator: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    });

    let initiatorAvatarUrl: string | undefined;

    if (notification.initiator.avatar) {
      initiatorAvatarUrl = (await getPreviewUrls([notification.initiator.avatar]))[0];
    }

    const notificationForClient = {
      id: notification.id,
      type: notification.type,

      initiator: {
        id: notification.initiator.id,
        name: notification.initiator.name,
        avatarUrl: initiatorAvatarUrl,
      },

      createdAt: notification.createdAt.toISOString(),
    };

    res.status(201).json({
      friendship,
    });

    sendToUser(friendId, {
      type: "incoming_friend_request",
      friendship,
    });

    sendToUser(friendId, {
      type: "incoming_notification",
      notification: notificationForClient,
    });
  } catch (err) {
    return res.status(500).json({message: "Failed to send friend request"});
  }
}

export async function getFriendships(req: Request, res: Response) {
  try {
    const userId = req.userId!;

    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [
          {
            userId,
          },
          {
            friendId: userId,
          },
        ],
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json(friendships);
  } catch (err) {
    res.status(500).json({message: "Failed to retrieve friendships"});
  }
}
