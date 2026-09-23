import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import type { StorageAdapter } from "./types";

// S3 caps one DeleteObjects request at 1000 keys.
const DELETE_BATCH_SIZE = 1000;

export type R2Config = {
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
};

// Screenshots stay private: this bucket has no public URL and no custom
// domain, and the credentials never leave the server. A screenshot reaches
// the browser only through /api/uploads, which checks the signature and the
// owner before it streams the bytes (src/lib/uploads/signed-url.ts).
export class R2Storage implements StorageAdapter {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(config: R2Config) {
    this.bucket = config.bucket;
    this.client = new S3Client({
      // R2 ignores the region but the SDK insists on one.
      region: "auto",
      endpoint: config.endpoint,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }

  async put(key: string, data: Buffer): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: data,
        // The upload route resizes to JPEG before it gets here
        // (src/app/api/uploads/route.ts), and serves the same type back.
        ContentType: "image/jpeg",
      }),
    );
  }

  async get(key: string): Promise<Buffer | null> {
    try {
      const response = await this.client.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      if (!response.Body) {
        return null;
      }
      return Buffer.from(await response.Body.transformToByteArray());
    } catch (error) {
      // A missing object is not an error here, same as ENOENT on local disk:
      // the caller turns `null` into a 404.
      if (isNotFound(error)) {
        return null;
      }
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }

  async deleteMany(keys: string[]): Promise<void> {
    for (let i = 0; i < keys.length; i += DELETE_BATCH_SIZE) {
      const batch = keys.slice(i, i + DELETE_BATCH_SIZE);
      const response = await this.client.send(
        new DeleteObjectsCommand({
          Bucket: this.bucket,
          Delete: { Objects: batch.map((Key) => ({ Key })), Quiet: true },
        }),
      );
      // A batch delete answers 200 even when single keys failed, so the
      // caller would never learn about a file left behind.
      const failed = response.Errors ?? [];
      if (failed.length > 0) {
        throw new Error(
          `Failed to delete ${failed.length} of ${batch.length} objects, first: ${failed[0].Key} (${failed[0].Code})`,
        );
      }
    }
  }
}

/**
 * S3 reports a missing key as `NoSuchKey`, but a HeadObject-style 404 arrives
 * as `NotFound` with an empty name, so both are checked.
 *
 * Exported for its tests: it decides whether a missing screenshot becomes a
 * 404 or a 500, and it is the one piece of this adapter that is testable
 * without reaching the network.
 */
export function isNotFound(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }
  const { name } = error as { name?: string };
  if (name === "NoSuchKey" || name === "NotFound") {
    return true;
  }
  const status = (error as { $metadata?: { httpStatusCode?: number } })
    .$metadata?.httpStatusCode;
  return status === 404;
}
