// S3-compatible storage for event images and photo galleries, af-south-1 in
// production. All access is via signed URLs; the bucket is never public.
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createId } from "@paralleldrive/cuid2";

const globalForS3 = globalThis as unknown as { s3?: S3Client };

function s3(): S3Client {
  if (!globalForS3.s3) {
    globalForS3.s3 = new S3Client({
      region: process.env.S3_REGION ?? "af-south-1",
      ...(process.env.S3_ENDPOINT
        ? { endpoint: process.env.S3_ENDPOINT, forcePathStyle: true }
        : {}),
      ...(process.env.S3_ACCESS_KEY_ID
        ? {
            credentials: {
              accessKeyId: process.env.S3_ACCESS_KEY_ID,
              secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
            },
          }
        : {}),
    });
  }
  return globalForS3.s3;
}

function bucket(): string {
  const b = process.env.S3_BUCKET;
  if (!b) throw new Error("S3_BUCKET is not set");
  return b;
}

export function storageConfigured(): boolean {
  return Boolean(process.env.S3_BUCKET);
}

export function galleryKey(eventId: string, filename: string) {
  const ext = filename.includes(".") ? filename.split(".").pop() : "jpg";
  return `galleries/${eventId}/${createId()}.${ext}`;
}

// Presigned PUT so uploads go browser-to-bucket without passing through
// the serverless function body limits.
export async function signedUploadUrl(key: string, contentType: string) {
  return getSignedUrl(
    s3(),
    new PutObjectCommand({ Bucket: bucket(), Key: key, ContentType: contentType }),
    { expiresIn: 600 }
  );
}

export async function signedViewUrl(key: string, expiresIn = 3600) {
  return getSignedUrl(
    s3(),
    new GetObjectCommand({ Bucket: bucket(), Key: key }),
    { expiresIn }
  );
}

export async function deleteObject(key: string) {
  await s3().send(new DeleteObjectCommand({ Bucket: bucket(), Key: key }));
}
