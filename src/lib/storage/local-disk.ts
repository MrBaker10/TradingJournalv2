import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import type { StorageAdapter } from "./types";

const UPLOAD_ROOT = resolve(process.cwd(), "storage", "uploads");

export class LocalDiskStorage implements StorageAdapter {
  async put(key: string, data: Buffer): Promise<void> {
    const filePath = join(UPLOAD_ROOT, key);
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, data);
  }

  async get(key: string): Promise<Buffer | null> {
    try {
      return await readFile(join(UPLOAD_ROOT, key));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return null;
      }
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    await rm(join(UPLOAD_ROOT, key), { force: true });
  }
}
