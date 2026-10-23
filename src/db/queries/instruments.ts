import { asc, eq } from "drizzle-orm";
import { db } from "../index.ts";
import { instruments } from "../schema/instruments.ts";

export async function listInstruments() {
  return db.select().from(instruments).orderBy(asc(instruments.symbol));
}

/** Anything that can run a read: the shared client, or a transaction. */
export type ReadExecutor = Pick<typeof db, "select">;

export async function getInstrumentById(
  id: number,
  executor: ReadExecutor = db,
) {
  const [instrument] = await executor
    .select()
    .from(instruments)
    .where(eq(instruments.id, id))
    .limit(1);

  return instrument;
}
