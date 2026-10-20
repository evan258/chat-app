import { Request, Response } from "express";
import { prisma } from "../lib/prisma.js";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3Client } from "../lib/s3Client.js";
import { getPreviewUrls } from "../lib/utils.js";

export async function prepareFileUploads (req: Request, res: Response) {
  try {
    const files : {
      name: string,
      size: number,
      type: string,
    }[] = req.body.files;

    const userId = req.userId;

    const result = await Promise.all(
      files.map(async (file) => {
        const fileRecord = await prisma.file.create({
          data: {
            ownerId: userId!,
            fileName: file.name,
            fileType: file.type,
            size: file.size,
            storageKey: `uploads/${Date.now()}-${file.name}`,
          },
        });

        const command = new PutObjectCommand({
          Bucket: process.env.S3_BUCKET_NAME!,
          Key: fileRecord.storageKey,
          ContentType: fileRecord.fileType,
        });

        const putUrl = await getSignedUrl(s3Client, command, {
          expiresIn: 60 * 10,
        });

        return {
          fileId: fileRecord.id,
          putUrl,
        };
      })
    );
    
    res.json({
      files: result,
    });
  } catch (err) {
    res.status(500).json({message: "Error preparing file uploads"});
  }
}

// the signed urls the client holds expire, it asks for new ones for what it has in its store before they do
export async function refreshUrls (req: Request, res: Response) {
  try {
    const userId = req.userId!;
    const userIds: string[] = req.body.userIds ?? [];
    const conversationIds: number[] = req.body.conversationIds ?? [];
    const messageIds: number[] = req.body.messageIds ?? [];

    const users = await prisma.user.findMany({
      where: {
        id: { in: userIds },
        fileId: { not: null },
      },
      select: {
        id: true,
        avatar: true,
      },
    });

    const conversations = await prisma.conversation.findMany({
      where: {
        id: { in: conversationIds },
        fileId: { not: null },
        members: { some: { userId } },
      },
      select: {
        id: true,
        avatar: true,
      },
    });

    const messages = await prisma.message.findMany({
      where: {
        id: { in: messageIds },
        conversation: { members: { some: { userId } } },
      },
      select: {
        id: true,
        conversationId: true,
        files: { orderBy: { id: "asc" } },
      },
    });

    const files = [
      ...users.map((user) => user.avatar!),
      ...conversations.map((conversation) => conversation.avatar!),
      ...messages.flatMap((message) => message.files),
    ];
    const { urls, expiresAt } = await getPreviewUrls(files);

    // the urls are in the same order as the files, so they are taken one by one in the same order
    let index = 0;

    res.json({
      expiresAt,
      users: users.map((user) => ({ id: user.id, avatarUrl: urls[index++], expiresAt })),
      conversations: conversations.map((conversation) => ({ id: conversation.id, avatarUrl: urls[index++], expiresAt })),
      messages: messages.map((message) => ({
        id: message.id,
        conversationId: message.conversationId,
        previewUrls: message.files.map(() => urls[index++]),
        expiresAt,
      })),
    });
  } catch (err) {
    res.status(500).json({message: "Error refreshing urls"});
  }
}
