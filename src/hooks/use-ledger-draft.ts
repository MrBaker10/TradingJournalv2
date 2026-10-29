"use client";

import { useRef, useState } from "react";
import type { ExpenseCategory, LedgerKind } from "@/domain/ledger";
import { useMessage } from "@/hooks/use-message";
import { parseDecimalInput } from "@/lib/numbers";
import {
  type CreateLedgerEntryInput,
  createLedgerEntrySchema,
} from "@/schemas/ledger";

// The draft the ledger's add and edit forms share (Design-v1.md §4.25) and its
// check before anything is sent.

export interface LedgerDraft {
  kind: LedgerKind;
  category: ExpenseCategory | "";
  /** An account id as the select holds it; "" is no account. */
  accountId: string;
  entryDate: string;
  amount: string;
  note: string;
}

export type LedgerFieldErrors = Record<string, string>;

/**
 * The draft of one form and its client-side check. `validate` returns the
 * input to send, or null after showing every message and focusing the first
 * invalid field. The input, not the parsed data, is what the action gets: the
 * schema turns an empty note into null, and the action parses again.
 */
export function useLedgerDraft(initial: () => LedgerDraft) {
  const [draft, setDraft] = useState<LedgerDraft>(initial);
  const [errors, setErrors] = useState<LedgerFieldErrors>({});
  const formRef = useRef<HTMLFormElement>(null);
  const message = useMessage();

  function change(values: Partial<LedgerDraft>) {
    setDraft((current) => ({ ...current, ...values }));
    setErrors({});
  }

  function validate(): CreateLedgerEntryInput | null {
    const input: CreateLedgerEntryInput = {
      kind: draft.kind,
      category:
        draft.kind === "expense" && draft.category !== ""
          ? draft.category
          : null,
      accountId: draft.accountId === "" ? null : Number(draft.accountId),
      entryDate: draft.entryDate,
      // Empty or unreadable both hear the amount format.
      amount: parseDecimalInput(draft.amount) ?? Number.NaN,
      note: draft.note,
    };
    const parsed = createLedgerEntrySchema.safeParse(input);
    if (parsed.success) return input;

    const next: LedgerFieldErrors = {};
    for (const issue of parsed.error.issues)
      next[issue.path.join(".")] ??= message(issue.message);
    setErrors(next);
    requestAnimationFrame(() =>
      formRef.current
        ?.querySelector<HTMLElement>('[aria-invalid="true"]')
        ?.focus(),
    );
    return null;
  }

  return { draft, errors, change, validate, formRef };
}
