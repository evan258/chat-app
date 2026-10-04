import { S3Client } from "@aws-sdk/client-s3";

export const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  // without this the presigned PUT urls carry the crc32 of an empty body and S3 rejects the real upload
  requestChecksumCalculation: "WHEN_REQUIRED",
  credentials: {
    accessKeyId: process.env.IAM_USER_ACCESS_KEY_ID!,
    secretAccessKey: process.env.IAM_USER_SECRET_ACCESS_KEY!,
  },
})
