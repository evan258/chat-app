import { Request, Response } from "express";
import { prisma } from "../lib/prisma.js";
import { getPreviewUrls } from "../lib/utils.js";

export async function getNotifications(req: Request, res: Response) {
  try {
    const userId = req.userId!;

    const notifications = await prisma.notification.findMany({
      where: {
        recipientId: userId,
      },
      orderBy: {
        id: "desc",
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
    })

    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        lastReadNotificationId: true,
      },
    });

    const notificationsForClient = await Promise.all(
      notifications.map(async (notification) => {
        let conversationAvatarUrl: string | undefined;
        let conversationAvatarExpiresAt: string | undefined;

        if (notification.conversation?.avatar) {
          const { urls, expiresAt } = await getPreviewUrls([notification.conversation.avatar]);
          conversationAvatarUrl = urls[0];
          conversationAvatarExpiresAt = expiresAt;
        }

        return {
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
      })
    );
    res.json({
      notifications: notificationsForClient,
      lastReadNotificationId: user?.lastReadNotificationId ?? null,
    });
  } catch (err) {
    res.status(500).json({message: "Failed to retrieve notifications"});
  }
}

export async function removeNotification(req: Request, res: Response) {
  try {
    const userId = req.userId!;
    const notificationId = Number(req.params.notificationId);

    if (!notificationId) {
      return res.status(400).json({
        message: "Invalid notification ID",
      });
    }

    const notification = await prisma.notification.findUnique({
      where: {
        id: notificationId,
      },
      select: {
        recipientId: true,
      },
    });

    if (!notification) {
      return res.status(404).json({
        message: "Notification not found",
      });
    }

    if (notification.recipientId !== userId) {
      return res.status(403).json({
        message: "Not authorized to remove this notification",
      });
    }

    await prisma.notification.delete({
      where: {
        id: notificationId,
      },
    });

    res.json({
      message: "Notification removed successfully"
    });
  } catch (err) {
    res.status(500).json({
      message: "Failed to remove notification",
    });
  }
}
