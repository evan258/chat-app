import { Request, Response } from "express";
import { prisma } from "../lib/prisma.js";
import { PutObjectCommand } from "@aws-sdk/client-s3";
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
          Bucket: process.env.AWS_S3_BUCKET!,
          Key: fileRecord.storageKey,
          ContentType: fileRecord.fileType,
        });

        const putUrl = await getSignedUrl(s3Client, command, {
          expiresIn: 60 * 10,
        });

        return {
          fileId: fileRecord.id,
          previewUrl: putUrl,
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
