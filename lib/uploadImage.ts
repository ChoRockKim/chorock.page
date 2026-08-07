import "server-only";
import crypto from "node:crypto";
import sharp from "sharp";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const s3Client = new S3Client({
  region: process.env.S3_REGION,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY!,
    secretAccessKey: process.env.S3_ACCESS_SECRET_KEY!,
  },
});

/**
 * Ported from the legacy Express blog's utils/uploadToS3.js — same bucket/region, same
 * sharp resize+webp compression, but under a next-posts/ prefix so these uploads don't mix
 * with images the old forum already uploaded under posts/. Filenames there included the
 * uploading username for uniqueness; next-blog only ever has one owner (see auth.ts), so a
 * random suffix does the same job.
 */
export async function uploadPostImage(buffer: Buffer): Promise<string> {
  const optimized = await sharp(buffer)
    .resize(1200, null, { withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();

  const key = `next-posts/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.webp`;
  await s3Client.send(
    new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: key,
      Body: optimized,
      ContentType: "image/webp",
    })
  );

  return `https://${process.env.S3_BUCKET}.s3.${process.env.S3_REGION}.amazonaws.com/${key}`;
}
