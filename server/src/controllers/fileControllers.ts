import { Request, Response } from "express";
import { prisma } from "../lib/prisma.js";
import { HeadObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3Client } from "../lib/s3Client.js";

export async function prepareFileUploads (req: Request, res: Response) {
  try {
    const files : {
      name: string,
      size: number,
      type: string,
    }[] = req.body.files;

    const userId = req.userId;

    // one after the other, so the file ids follow the order of the files in the message
    const result = [];

    for (const file of files) {
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
        Bucket: process.env.AWS_S3_BUCKET!,
        Key: fileRecord.storageKey,
        ContentType: fileRecord.fileType,
      });

      const putUrl = await getSignedUrl(s3Client, command, {
        expiresIn: 60 * 10,
      });

      result.push({
        fileId: fileRecord.id,
        putUrl,
      });
    }
    
    res.json({
      files: result,
    });
  } catch (err) {
    res.status(500).json({message: "Error preparing file uploads"});
  }
}

export async function confirmFileUploads (req: Request, res: Response) {
  try {
    const fileIds: number[] = req.body.fileIds;
    const userId = req.userId;

    const files = await prisma.file.findMany({
      where: {
        id: {
          in: fileIds,
        },
        ownerId: userId!,
      },
    });

    if (!files.length || files.length !== fileIds.length) {
      return res.status(400).json({message: "Invalid files"});
    }

    try {
      await Promise.all(
        files.map((file) =>
          s3Client.send(
            new HeadObjectCommand({
              Bucket: process.env.AWS_S3_BUCKET!,
              Key: file.storageKey,
            })
          )
        )
      );
    } catch (err) {
      return res.status(400).json({message: "Files are not uploaded"});
    }

    await prisma.file.updateMany({
      where: {
        id: {
          in: fileIds,
        },
      },
      data: {
        uploaded: true,
      },
    });

    res.json({
      fileIds,
    });
  } catch (err) {
    res.status(500).json({message: "Error confirming file uploads"});
  }
}
