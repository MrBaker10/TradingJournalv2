export interface StorageAdapter {
  put(key: string, data: Buffer): Promise<void>;
  get(key: string): Promise<Buffer | null>;
  delete(key: string): Promise<void>;
  /**
   * Removes many keys at once. Only account deletion needs it
   * (src/lib/auth/delete-user-files.ts), where the count is unbounded and one
   * round trip per file would be one HTTP request per file against R2.
   */
  deleteMany(keys: string[]): Promise<void>;
}
