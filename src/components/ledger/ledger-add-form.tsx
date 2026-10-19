"use client";

import { useTransition } from "react";
import { addLedgerEntry } from "@/actions/ledger";
import type { LedgerAccount } from "@/db/queries/ledger";
import type { IsoDate } from "@/domain/streak";
import { useLedgerDraft } from "@/hooks/use-ledger-draft";
import { LEDGER_SAVE_FAILED } from "@/schemas/ledger";
import {
  LedgerEntryFields,
  runWithToast,
  SaveButton,
} from "./ledger-entry-fields";

interface LedgerAddFormProps {
  /** Today in the user's timezone, the date a new entry starts with. */
  today: IsoDate;
  /** The user's real, active accounts; practice ones are never offered. */
  accounts: LedgerAccount[];
}

// Design.md §4.25, "Add entry". Saving is explicit; afterwards amount and
// note clear while kind, category, account and date stay, so a run of
// monthly entries is quick to add.
export function LedgerAddForm({ today, accounts }: LedgerAddFormProps) {
  const { draft, errors, change, validate, formRef } = useLedgerDraft(() => ({
    kind: "expense",
    category: "",
    accountId: "",
    entryDate: today,
    amount: "",
    note: "",
  }));
  const [isPending, startTransition] = useTransition();

  function save() {
    if (isPending) return;
    const input = validate();
    if (input === null) return;
    startTransition(async () => {
      const added = await runWithToast(() => addLedgerEntry(input), {
        success: "Entry added",
        failed: LEDGER_SAVE_FAILED,
      });
      if (added) change({ amount: "", note: "" });
    });
  }

  return (
    <form
      ref={formRef}
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        save();
      }}
      className="card-surface edge flex flex-col gap-4 p-5"
    >
      <h2 className="cap">Add entry</h2>
      <LedgerEntryFields
        draft={draft}
        errors={errors}
        onChange={change}
        accounts={accounts}
        disabled={isPending}
      />
      <div className="flex justify-end">
        <SaveButton pending={isPending} label="Add entry" />
      </div>
    </form>
  );
}
