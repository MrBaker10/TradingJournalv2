import { listScreenshotKeysForUser } from "../../db/queries/trades.ts";
import { storage } from "../storage/index.ts";

// Account deletion removes the user's rows by cascade (migration 0011) and
// their files here. Two steps because the database cannot delete a file:
// the keys are read before the row goes, the files removed after it went.

export function listUserStorageKeys(userId: number): Promise<string[]> {
  return listScreenshotKeysForUser(userId);
}

export async function deleteUserFiles(keys: string[]): Promise<void> {
  // One call, not one per file: against R2 every delete is an HTTP request,
  // and the number of screenshots a user has is unbounded.
  await storage.deleteMany(keys);
}
