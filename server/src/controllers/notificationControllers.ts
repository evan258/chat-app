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
        let initiatorAvatarUrl: string | undefined;
        let conversationAvatarUrl: string | undefined;

        if (notification.initiator.avatar) {
          initiatorAvatarUrl = (await getPreviewUrls([notification.initiator.avatar]))[0];
        }

        if (notification.conversation?.avatar) {
          conversationAvatarUrl = (await getPreviewUrls([notification.conversation.avatar]))[0];
        }

        return {
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
      notificationId,
    });
  } catch (err) {
    res.status(500).json({
      message: "Failed to remove notification",
    });
  }
}
