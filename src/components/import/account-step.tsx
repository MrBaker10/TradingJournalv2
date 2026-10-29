"use client";

import { useEffect, useState } from "react";
import { Choice } from "@/components/trades/form-blocks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PendingIndicator } from "@/components/ui/pending-indicator";
import type { ImportAccount, ParsedFile } from "./import-wizard";
import { StepError } from "./step-error";

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
 * them in the wrong place. A pick is the trade form's loose choice; picking
 * runs the preview at once, as before. The practice account is never
 * preselected and carries the amber stripe.
 */
export function AccountStep({
  accounts,
  parsed,
  pending,
  error,
  onBack,
  onChoose,
}: AccountStepProps) {
  // Real accounts first, practice after them, as before.
  const ordered = [
    ...accounts.filter((account) => !account.isPractice),
    ...accounts.filter((account) => account.isPractice),
  ];
  const byId = new Map(ordered.map((account) => [String(account.id), account]));
  // Shows the pick while its preview runs; never preselected. A failed
  // preview clears it, so the same account can be picked again.
  const [picked, setPicked] = useState("");
  useEffect(() => {
    if (error !== null) setPicked("");
  }, [error]);
  const hasPractice = accounts.some((account) => account.isPractice);

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="font-semibold text-lg">Import into</h2>
        <p className="font-mono text-muted-foreground text-xs tabular-nums">
          {parsed.rows.length} round trips from {parsed.sourceRows} rows in{" "}
          {parsed.filename}
        </p>
      </div>

      <Choice
        label="Account"
        options={[...byId.keys()]}
        value={picked}
        clearable={false}
        disabled={pending}
        onChange={(id) => {
          if (id === "") return;
          setPicked(id);
          onChoose(Number(id));
        }}
        render={(id) => {
          const account = byId.get(id);
          if (account === undefined) return id;
          return account.isPractice ? (
            <>
              <span
                aria-hidden="true"
                className="h-4 w-0.5 rounded-full bg-practice"
              />
              {account.name}
              <Badge variant="outline">Practice</Badge>
            </>
          ) : (
            account.name
          );
        }}
      />
      {hasPractice && (
        <p className="text-muted-foreground text-xs">
          Trades on a practice account are left out of every combined figure.
        </p>
      )}

      <div className="flex items-center gap-3">
        <Button
          type="button"
          size="lg"
          variant="ghost"
          className="h-10 px-4"
          onClick={onBack}
          disabled={pending}
        >
          Back
        </Button>
        {pending && (
          <span className="text-muted-foreground text-sm">
            <PendingIndicator label="Checking…" />
          </span>
        )}
      </div>

      <StepError message={error} />
    </section>
  );
}
