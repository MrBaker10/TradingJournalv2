"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db/index";
import { listOwnedAccountIds } from "@/db/queries/accounts";
import {
  createImportBatch,
  type ImportedTrade,
  insertImportedTrades,
  listMatchCandidates,
  removeUntouchedTrades,
  type TradeUpdate,
  updateImportedTrades,
} from "@/db/queries/import";
import { matchRows } from "@/domain/import/match";
import {
  decideOutcome,
  derivePoints,
  deriveResult,
} from "@/domain/import/outcome";
import { sessionFromEntryTime } from "@/domain/import/session";
import type { NormalizedTrade } from "@/domain/import/types";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { awardBadgesQuietly } from "@/lib/badges/sync";
import {
  commitImportSchema,
  previewImportSchema,
  undoImportSchema,
} from "@/schemas/import";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export type RowVerdict = "new" | "update" | "skip";

export interface PreviewRow {
  sourceRow: number;
  verdict: RowVerdict;
  /** Plain English, shown next to the row in the preview table. */
  reason: string;
  /** The file's own P&L, for comparison only — it is never written. */
  filePnl: number | null;
}

export interface ImportCounters {
  new: number;
  update: number;
  skip: number;
}

export interface ImportPreview {
  rows: PreviewRow[];
  counters: ImportCounters;
}

/**
 * Matches every row against the journal and reports what would happen. The
 * pairing itself is pure (src/domain/import/match.ts); this only supplies it
 * with candidates and turns the verdicts into something the preview can print.
 */
function buildPreview(
  rows: NormalizedTrade[],
  candidates: Awaited<ReturnType<typeof listMatchCandidates>>,
): { preview: ImportPreview; outcomes: ReturnType<typeof decideOutcome>[] } {
  const matched = matchRows(rows, candidates);
  const outcomes = rows.map((row, index) => decideOutcome(row, matched[index]));

  const counters: ImportCounters = { new: 0, update: 0, skip: 0 };
  const previewRows = rows.map((row, index) => {
    const outcome = outcomes[index];

    if (outcome.kind === "skip") {
      counters.skip += 1;
      return {
        sourceRow: row.sourceRow,
        verdict: "skip" as const,
        reason: "already in your journal",
        filePnl: row.filePnl,
      };
    }

    if (outcome.kind === "update") {
      counters.update += 1;
      const closesOpen = outcome.changed.includes("exitPrice");
      return {
        sourceRow: row.sourceRow,
        verdict: "update" as const,
        reason: closesOpen
          ? "closes an open trade"
          : `updates ${outcome.changed.join(", ")}`,
        filePnl: row.filePnl,
      };
    }

    counters.new += 1;
    return {
      sourceRow: row.sourceRow,
      verdict: "new" as const,
      reason: row.exitPrice === null ? "new, still open" : "new",
      filePnl: row.filePnl,
    };
  });

  return { preview: { rows: previewRows, counters }, outcomes };
}

/** Dates the file mentions, deduplicated — the read is bounded by these. */
function datesOf(rows: NormalizedTrade[]): string[] {
  return [...new Set(rows.map((row) => row.tradeDate))];
}

/**
 * Reads nothing back into the journal. It exists so the preview can show the
 * four counters and a reason per row before anything is written.
 */
export async function previewImport(
  input: unknown,
): Promise<ActionResult<ImportPreview>> {
  const parsed = previewImportSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
    const user = await getCurrentUser();

    // An account id from the client is a permission boundary, not a label
    // (coding-standards.md, Database). listOwnedAccountIds also drops an
    // archived account, which is not a valid import target.
    const owned = await listOwnedAccountIds(user.id, [parsed.data.accountId]);
    if (owned.length === 0) {
      return { success: false, error: "That account isn't yours" };
    }

    const candidates = await listMatchCandidates(
      user.id,
      parsed.data.accountId,
      datesOf(parsed.data.rows),
    );

    const { preview } = buildPreview(parsed.data.rows, candidates);
    return { success: true, data: preview };
  } catch {
    return {
      success: false,
      error: "Couldn't read your journal to compare against. Try again.",
    };
  }
}

export interface ImportResult extends ImportCounters {
  batchId: number | null;
}

/**
 * Writes the batch. One transaction: either the whole file lands or none of
 * it does.
 *
 * The match runs again here rather than trusting the preview's verdicts — the
 * journal can change between looking and confirming, and the client is not
 * the authority on what is already in it.
 */
export async function commitImport(
  input: unknown,
): Promise<ActionResult<ImportResult>> {
  const parsed = commitImportSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }
  const { accountId, filename, detectedShape, rows } = parsed.data;

  let result: ImportResult;

  try {
    const user = await getCurrentUser();

    const owned = await listOwnedAccountIds(user.id, [accountId]);
    if (owned.length === 0) {
      return { success: false, error: "That account isn't yours" };
    }

    const candidates = await listMatchCandidates(
      user.id,
      accountId,
      datesOf(rows),
    );
    const { preview, outcomes } = buildPreview(rows, candidates);

    const written = preview.counters.new + preview.counters.update;
    if (written === 0) {
      return {
        success: true,
        data: { ...preview.counters, batchId: null },
      };
    }

    result = await db.transaction(async (tx) => {
      const batchId = await createImportBatch(tx, {
        userId: user.id,
        accountId,
        filename,
        rowCount: written,
        detectedShape,
      });

      const toInsert: ImportedTrade[] = [];
      const toUpdate: TradeUpdate[] = [];

      for (const [index, outcome] of outcomes.entries()) {
        const row = rows[index];

        if (outcome.kind === "skip") continue;

        if (outcome.kind === "update") {
          // Collected, not written yet: the updates go out grouped by the
          // fields they touch, so a file of 500 closed positions costs one
          // statement rather than 500.
          toUpdate.push({ tradeId: outcome.tradeId, values: outcome.values });
          continue;
        }

        const points = derivePoints(
          row.direction,
          row.entryPrice,
          row.exitPrice,
        );

        toInsert.push({
          userId: user.id,
          tradeDate: row.tradeDate,
          instrumentId: row.instrumentId,
          contracts: row.contracts,
          entryTime: row.entryTime,
          exitTime: row.exitTime,
          direction: row.direction,
          entryPrice: row.entryPrice,
          exitPrice: row.exitPrice,
          points,
          result: deriveResult(points),
          // Only ever on a row the import creates itself, and only from the
          // entry time. A session the user picked is never overwritten.
          // The zone is the trader's own: the windows are New York times and
          // the entry time is not, so the two are reconciled by date.
          session: sessionFromEntryTime(
            row.entryTime,
            row.tradeDate,
            user.timezone,
          ),
          brokerTradeKey: row.brokerTradeKey,
          importBatchId: batchId,
        });
      }

      await updateImportedTrades(tx, user.id, toUpdate);
      await insertImportedTrades(tx, toInsert, accountId);

      return { ...preview.counters, batchId };
    });

    // Once per batch, after the transaction committed — not per row. A badge
    // that depends on trade count should see the finished import, and a badge
    // failure must not take the import down with it.
    await awardBadgesQuietly(user.id, user.timezone);
  } catch {
    return {
      success: false,
      error: "Nothing was imported — the whole batch was rolled back.",
    };
  }

  revalidatePath("/", "layout");
  return { success: true, data: result };
}

/**
 * Removes one batch's untouched trades.
 *
 * Anything worked on by hand stays, hand-logged trades are never in scope,
 * and badges already earned stay earned — `syncUserBadges` only ever adds.
 */
export async function undoImportBatch(
  input: unknown,
): Promise<ActionResult<{ removed: number }>> {
  const parsed = undoImportSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  let removed: number;

  try {
    const user = await getCurrentUser();
    removed = await db.transaction((tx) =>
      removeUntouchedTrades(tx, user.id, parsed.data.batchId),
    );
  } catch {
    return {
      success: false,
      error: "Couldn't remove that import. Nothing was changed.",
    };
  }

  revalidatePath("/", "layout");
  return { success: true, data: { removed } };
}
