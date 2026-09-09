import { LocalDiskStorage } from "./local-disk";

export type { StorageAdapter } from "./types";

/** Phase 1: local disk. Phase 2 swaps this for a Cloudflare R2 implementation. */
export const storage = new LocalDiskStorage();
