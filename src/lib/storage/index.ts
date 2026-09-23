import { env } from "../env";
import { LocalDiskStorage } from "./local-disk";
import { R2Storage } from "./r2";
import type { StorageAdapter } from "./types";

export type { StorageAdapter } from "./types";

/**
 * The same rule the env schema enforces (src/lib/env.ts), written as a type:
 * the `r2` driver carries all four values, the `local` driver carries none it
 * needs. A caller cannot ask for R2 without credentials and find out at run
 * time.
 */
type StorageConfig =
  | { STORAGE_DRIVER: "local" }
  | {
      STORAGE_DRIVER: "r2";
      R2_ENDPOINT: string;
      R2_ACCESS_KEY_ID: string;
      R2_SECRET_ACCESS_KEY: string;
      R2_BUCKET: string;
    };

/**
 * Picks the adapter for a configuration. Takes the values rather than reading
 * `env` itself so both branches are reachable from a test.
 */
export function createStorage(config: StorageConfig): StorageAdapter {
  if (config.STORAGE_DRIVER === "r2") {
    return new R2Storage({
      endpoint: config.R2_ENDPOINT,
      accessKeyId: config.R2_ACCESS_KEY_ID,
      secretAccessKey: config.R2_SECRET_ACCESS_KEY,
      bucket: config.R2_BUCKET,
    });
  }
  return new LocalDiskStorage();
}

/**
 * Narrows the parsed environment onto that union. The env schema has already
 * rejected a `r2` driver with anything missing, so this only tells the
 * compiler what the schema guarantees — it never decides anything itself.
 */
function storageConfigFrom(parsed: typeof env): StorageConfig {
  if (parsed.STORAGE_DRIVER !== "r2") {
    return { STORAGE_DRIVER: "local" };
  }
  const { R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET } =
    parsed;
  if (!(R2_ENDPOINT && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_BUCKET)) {
    throw new Error(
      'STORAGE_DRIVER is "r2" but the R2 variables are incomplete. The env schema should have caught this.',
    );
  }
  return {
    STORAGE_DRIVER: "r2",
    R2_ENDPOINT,
    R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY,
    R2_BUCKET,
  };
}

/** R2 in production, local disk in development (coding-standards.md). */
export const storage = createStorage(storageConfigFrom(env));
