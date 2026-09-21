"use client";

import { InlineMessage } from "@/components/ui/inline-message";
import { PendingIndicator } from "@/components/ui/pending-indicator";
import type { ImportAccount, ParsedFile } from "./import-wizard";

interface AccountStepProps {
  accounts: ImportAccount[];
  parsed: ParsedFile;
  pending: boolean;
  error: string | null;
  onBack: () => void;
  onChoose: (accountId: number) => void;
}

/**
 * Step two: which account these trades belong to.
 *
 * One account per import, and every row goes to it. The duplicate check runs
 * against this account alone and never across accounts, so choosing the wrong
 * one here would not corrupt another account's trades — it would just put
 * them in the wrong place.
 */
export function AccountStep({
  accounts,
  parsed,
  pending,
  error,
  onBack,
  onChoose,
}: AccountStepProps) {
  const real = accounts.filter((account) => !account.isPractice);
  const practice = accounts.filter((account) => account.isPractice);

  return (
    <section className="card-surface edge flex flex-col gap-4 p-5">
      <div className="flex flex-col gap-1">
        <h2 className="cap cap-neon">Import into</h2>
        <p className="text-[11.5px] text-fg-subtle">
          {parsed.rows.length} round trips from {parsed.sourceRows} rows in{" "}
          {parsed.filename}.
        </p>
      </div>

      <AccountChips accounts={real} pending={pending} onChoose={onChoose} />

      {practice.length > 0 ? (
        <div className="flex flex-col gap-2">
          <span className="cap">Practice</span>
          <AccountChips
            accounts={practice}
            pending={pending}
            onChoose={onChoose}
          />
          <p className="text-[11.5px] text-practice">
            Trades on a practice account are left out of every combined figure.
          </p>
        </div>
      ) : null}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          disabled={pending}
          className="rounded-ctl border border-white/12 px-4 py-2 text-fg-muted text-sm transition-colors duration-150 hover:border-cyan/35 disabled:opacity-60"
        >
          Back
        </button>
        {pending ? (
          <span className="flex items-center gap-2 text-fg-muted text-sm">
            <PendingIndicator label="Checking…" />
          </span>
        ) : null}
      </div>

      <InlineMessage message={error} />
    </section>
  );
}

function AccountChips({
  accounts,
  pending,
  onChoose,
}: {
  accounts: ImportAccount[];
  pending: boolean;
  onChoose: (accountId: number) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {accounts.map((account) => (
        <button
          key={account.id}
          type="button"
          disabled={pending}
          onClick={() => onChoose(account.id)}
          className={`rounded-xs border px-2.5 py-1.5 text-sm transition-colors duration-150 disabled:opacity-60 ${
            account.isPractice
              ? "border-practice/40 bg-well text-practice hover:bg-practice-dim"
              : "border-white/12 bg-well text-fg-muted hover:border-cyan/35"
          }`}
        >
          {account.name}
        </button>
      ))}
    </div>
  );
}
