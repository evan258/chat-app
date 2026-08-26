import { GetObjectCommand } from "@aws-sdk/client-s3";
import { File } from "../../generated/prisma/index.js";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3Client } from "./s3Client.js";
import WebSocket from "ws";
import { clients } from "../websocket.js";

export async function getPreviewUrls (files : File[]) {
  const result = await Promise.all(
    files.map(async (file) => {
      const command = new GetObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME!,
        Key: file.storageKey,
      });

      const getUrl = await getSignedUrl(s3Client, command, {
        expiresIn: 60 * 60,
      });

      return getUrl;
    })
  )

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
