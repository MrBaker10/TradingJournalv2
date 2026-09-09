import { asc, eq } from "drizzle-orm";
import { db } from "../index.ts";
import { instruments } from "../schema/instruments.ts";

export async function listInstruments() {
  return db.select().from(instruments).orderBy(asc(instruments.symbol));
}

export async function getInstrumentById(id: number) {
  const [instrument] = await db
    .select()
    .from(instruments)
    .where(eq(instruments.id, id))
    .limit(1);

  return instrument;
}
