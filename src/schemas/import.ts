import * as z from "zod";
import { directionEnum } from "./trades.ts";

// What the import actions accept.
//
// The **raw file never reaches the server**: parsing, shape detection and
// normalisation are pure modules that run in the browser, and only the rows
// below cross the wire (current-feature.md). That keeps a 2 MB file out of a
// server action's body limit without touching next.config.ts, and it is why
// these fields are already typed values rather than strings off a CSV line.
//
// Everything here is still re-validated and re-matched on the server. The
// client's preview is advisory: the journal may have changed between the
// preview and the confirmation, so `commitImport` decides again.

/** Max rows per file (current-feature.md, §Grenzen und Validierung). */
export const MAX_IMPORT_ROWS = 2000;

/** Max file size in bytes. Enforced in the browser, before anything is read. */
export const MAX_IMPORT_BYTES = 2 * 1024 * 1024;

export const importShapeEnum = z.enum(["round-trip", "fills", "tradingview"]);

const dateField = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date");
const timeField = z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Invalid time");
const priceField = z.number().positive();

/**
 * One row that normalisation accepted. `exitPrice` and `exitTime` are null
 * together for a position the file never closes; it lands as an open trade.
 */
export const normalizedTradeSchema = z.object({
  instrumentId: z.number().int().positive(),
  direction: directionEnum,
  contracts: z.number().int().positive(),
  tradeDate: dateField,
  entryTime: timeField,
  entryPrice: priceField,
  exitTime: timeField.nullable(),
  exitPrice: priceField.nullable(),
  brokerTradeKey: z.string().min(1).max(500).nullable(),
  filePnl: z.number().nullable(),
  sourceRow: z.number().int().nonnegative(),
});

const rowsField = z
  .array(normalizedTradeSchema)
  .max(MAX_IMPORT_ROWS, `A file may hold at most ${MAX_IMPORT_ROWS} rows`);

export const previewImportSchema = z.object({
  accountId: z.number().int().positive(),
  rows: rowsField,
});

export const commitImportSchema = z.object({
  accountId: z.number().int().positive(),
  // Shown in the batch list so an undo can be recognised later.
  filename: z.string().trim().min(1).max(255),
  detectedShape: importShapeEnum,
  rows: rowsField.min(1, "There is nothing to import"),
});

export const undoImportSchema = z.object({
  batchId: z.number().int().positive(),
});

export type PreviewImportInput = z.infer<typeof previewImportSchema>;
export type CommitImportInput = z.infer<typeof commitImportSchema>;
