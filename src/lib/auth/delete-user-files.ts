import { listScreenshotKeysForUser } from "../../db/queries/trades.ts";
import { storage } from "../storage/index.ts";

// Account deletion removes the user's rows by cascade (migration 0011) and
// their files here. Two steps because the database cannot delete a file:
// the keys are read before the row goes, the files removed after it went.

export function listUserStorageKeys(userId: number): Promise<string[]> {
  return listScreenshotKeysForUser(userId);
}

export async function deleteUserFiles(keys: string[]): Promise<void> {
  for (const key of keys) {
    await storage.delete(key);
  }
}
