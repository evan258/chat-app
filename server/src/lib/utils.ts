import { GetObjectCommand } from "@aws-sdk/client-s3";
import { File } from "../../generated/prisma/index.js";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3Client } from "./s3Client.js";
import WebSocket from "ws";
import { clients } from "../websocket.js";
import { prisma } from "./prisma.js";

export async function getPreviewUrls(files: File[]) {
  const expiresIn = 60 * 60;

  const expiresAt = new Date(
    Date.now() + expiresIn * 1000
  ).toISOString();

  const urls = await Promise.all(
    files.map(async (file) => {
      const command = new GetObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME!,
        Key: file.storageKey,
      });

      const getUrl = await getSignedUrl(s3Client, command, {
        expiresIn,
      });

      return getUrl;
    })
  );

  return {
    urls,
    expiresAt,
  };
}

export async function getUsersForClient (userIds: string[]) {
  const users = await prisma.user.findMany({
    where: {
      id: {
        in: userIds,
      },
    },
    select: {
      id: true,
      name: true,
      avatar: true,
    },
  });

  const result = await Promise.all(
    users.map(async (user) => {
      let avatarUrl: string | undefined;
      let avatarExpiresAt: string | undefined;

      if (user.avatar) {
        const { urls, expiresAt } = await getPreviewUrls([user.avatar]);
        avatarUrl = urls[0];
        avatarExpiresAt = expiresAt;
      }

      return {
        id: user.id,
        name: user.name,
        avatarUrl,
        expiresAt: avatarExpiresAt,
      };
    })
  );

  return result;
}

export async function send (ws: WebSocket, data: any) {
  if (ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify(data));
}

export async function sendToUser (userId: string, data: any) {
  const ws = clients.get(userId);
  if (!ws) return;
  send(ws, data);
}

// every notification goes to the client in this one shape: who did it and the conversation it is about (if any)
export async function getNotificationForClient (notificationId: number) {
  const notification = await prisma.notification.findUniqueOrThrow({
    where: {
      id: notificationId,
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

  let initiatorAvatarUrl: string | undefined;
  let initiatorAvatarExpiresAt: string | undefined;

  if (notification.initiator.avatar) {
    const { urls, expiresAt } = await getPreviewUrls([notification.initiator.avatar]);
    initiatorAvatarUrl = urls[0];
    initiatorAvatarExpiresAt = expiresAt;
  }

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

    initiator: {
      id: notification.initiator.id,
      name: notification.initiator.name,
      avatarUrl: initiatorAvatarUrl,
      expiresAt: initiatorAvatarExpiresAt,
    },

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
}

// a user's lastReadNotificationId points at a notification and becomes null when that one is deleted,
// which would make all their notifications unread again. so before deleting notifications it moves to the next older one
export async function moveReadMarkers (notificationIds: number[]) {
  const users = await prisma.user.findMany({
    where: {
      lastReadNotificationId: {
        in: notificationIds,
      },
    },
    select: {
      id: true,
      lastReadNotificationId: true,
    },
  });

  for (const user of users) {
    const olderNotification = await prisma.notification.findFirst({
      where: {
        recipientId: user.id,
        id: {
          lt: user.lastReadNotificationId!,
          notIn: notificationIds,
        },
      },
      orderBy: {
        id: "desc",
      },
      select: {
        id: true,
      },
    });

    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        lastReadNotificationId: olderNotification?.id ?? null,
      },
    });
  }
}
