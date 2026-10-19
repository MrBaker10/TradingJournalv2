import * as z from "zod";
import {
  EXPENSE_CATEGORIES,
  LEDGER_KINDS,
  LEDGER_MESSAGES,
  validateLedgerCategory,
} from "../domain/ledger.ts";
import { exactCents } from "../lib/money.ts";

/** Shown by the form and returned by the action when a save fails. */
export const LEDGER_SAVE_FAILED =
  "Couldn't add the entry. Your input is still here — try again.";

/**
 * The largest amount accepted. Same bound and reason as
 * `MAX_STARTING_BALANCE`: `exactCents` reads a typed number exactly only up to
 * about a billion, far below what `numeric(14, 2)` would hold.
 */
export const MAX_LEDGER_AMOUNT = 100_000_000;

export const MAX_LEDGER_NOTE_LENGTH = 500;

/**
 * One ledger entry as the form sends it. The amount stays a number in USD,
 * like every other amount the forms send; the action turns it into cents with
 * `exactCents`. The category rule is the domain's (`validateLedgerCategory`), so
 * form and server report it with the same words.
 */
// Relative imports, unlike the other schemas: they keep this file within
// Vitest's reach (src/schemas/__tests__/ledger.test.ts).
const ledgerEntryFields = z.object({
  kind: z.enum(LEDGER_KINDS),
  category: z.enum(EXPENSE_CATEGORIES).nullable(),
  entryDate: z.iso.date("Pick a date"),
  amount: z
    .number({ error: LEDGER_MESSAGES.amountFormat })
    .min(0, LEDGER_MESSAGES.amountNegative)
    .max(MAX_LEDGER_AMOUNT, "That amount is too large")
    .refine(
      (value) => exactCents(value) !== null,
      LEDGER_MESSAGES.amountFormat,
    ),
  // An empty note is stored as NULL, not as "".
  note: z
    .string()
    .trim()
    .max(MAX_LEDGER_NOTE_LENGTH, "Keep the note under 500 characters")
    .transform((value) => (value === "" ? null : value)),
});

export const createLedgerEntrySchema = ledgerEntryFields.superRefine(
  (entry, ctx) => {
    const check = validateLedgerCategory(entry.kind, entry.category);
    if (!check.success) {
      ctx.addIssue({
        code: "custom",
        path: [check.field],
        message: check.error,
      });
    }
  },
  {
    // Runs whenever kind and category parse, so an empty amount does not
    // hide a missing category: the form shows every message at once.
    when: (payload) =>
      ledgerEntryFields
        .pick({ kind: true, category: true })
        .safeParse(payload.value).success,
  },
);

export type CreateLedgerEntryInput = z.input<typeof createLedgerEntrySchema>;
