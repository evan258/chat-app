import { Request, Response } from "express";
import { prisma } from "../lib/prisma.js";
import { getNotificationForClient, moveReadMarkers } from "../lib/utils.js";

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
      select: {
        id: true,
      },
    });

    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        lastReadNotificationId: true,
      },
    });

    const notificationsForClient = await Promise.all(
      notifications.map((notification) => getNotificationForClient(notification.id))
    );

    res.json({
      notifications: notificationsForClient,
      lastReadNotificationId: user?.lastReadNotificationId ?? null,
    });
  } catch (err) {
    res.status(500).json({message: "Failed to retrieve notifications"});
  }
}

// everything up to the newest notification is read, the newer ones that arrive later are unread
export async function markNotificationsRead(req: Request, res: Response) {
  try {
    const userId = req.userId!;

    const newestNotification = await prisma.notification.findFirst({
      where: {
        recipientId: userId,
      },
      orderBy: {
        id: "desc",
      },
      select: {
        id: true,
      },
    });

    const lastReadNotificationId = newestNotification?.id ?? null;

    await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        lastReadNotificationId,
      },
    });

    res.json({
      lastReadNotificationId,
    });
  } catch (err) {
    res.status(500).json({message: "Failed to mark notifications as read"});
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

    await moveReadMarkers([notificationId]);

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
