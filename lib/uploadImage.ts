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
  // animated: true is required to read every frame of an animated GIF — sharp defaults to
  // reading just the first frame, so without this an uploaded GIF silently became a static
  // WebP with no animation. Harmless for a plain (single-frame) image: resize/webp() behave
  // identically either way when there's only one frame to begin with.
  //
  // limitInputPixels: false disables sharp's default ~268M-pixel safety cap. That default
  // exists to guard against decompression-bomb-style input on public/untrusted upload
  // endpoints; this action is behind requireOwner() (single authenticated owner, never public)
  // and already bounded by the 4MB compressed-file cap in actions.ts#uploadImage, so the extra
  // guard just gets in the way of legitimate animated GIFs — sharp's animated read reports an
  // image's height as ALL frames stacked (frame height * frame count), so pixel count scales
  // with frame count too, and a real screen-recording-derived GIF can cross 268M pixels well
  // before it's anywhere near suspicious. Confirmed directly: forcing a low limit on a real
  // multi-frame test GIF reproduces sharp's own "Input image exceeds pixel limit" throw, which
  // (before actions.ts#uploadImage wrapped this call in try/catch) is exactly what Next.js was
  // masking into the generic "Server Components render" error a real GIF paste triggered.
  const optimized = await sharp(buffer, { animated: true, limitInputPixels: false })
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
