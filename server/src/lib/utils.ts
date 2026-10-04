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
