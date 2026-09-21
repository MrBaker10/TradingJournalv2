"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  commitImport,
  type ImportPreview,
  type ImportResult,
  previewImport,
} from "@/actions/import";
import type { ImportBatchSummary } from "@/db/queries/import";
import type { InstrumentRef } from "@/domain/import/normalize";
import type {
  ImportShape,
  InvalidRow,
  NormalizedTrade,
} from "@/domain/import/types";
import { AccountStep } from "./account-step";
import { BatchList } from "./batch-list";
import { FileStep } from "./file-step";
import { PreviewStep } from "./preview-step";
import { ResultStep } from "./result-step";

/** An account the import may write to. */
export interface ImportAccount {
  id: number;
  name: string;
  isPractice: boolean;
}

/** Everything the browser worked out about the file before anything is sent. */
export interface ParsedFile {
  filename: string;
  shape: ImportShape;
  /** How many data rows the file had, before pairing. */
  sourceRows: number;
  /** Round trips that survived normalisation. */
  rows: NormalizedTrade[];
  /** Rows dropped on the way, in file order. */
  invalid: InvalidRow[];
}

interface ImportWizardProps {
  accounts: ImportAccount[];
  instruments: InstrumentRef[];
  timeZone: string;
  batches: ImportBatchSummary[];
}

const STEPS = ["File", "Account", "Preview", "Result"] as const;

/**
 * The four steps of an import, on one route.
 *
 * The **raw file never leaves the browser**: reading, shape detection,
 * pairing and normalisation are pure modules that run here, and only the
 * normalized rows reach a server action. That keeps a 2 MB file out of the
 * action's body limit without touching next.config.ts and without a route
 * handler (current-feature.md, §Regeln).
 *
 * The preview the user confirms is advisory. `commitImport` matches again
 * against the journal as it is at that moment, because it may have changed in
 * between — which is why the result counters come back from the server rather
 * than being carried over from step 3.
 */
export function ImportWizard({
  accounts,
  instruments,
  timeZone,
  batches,
}: ImportWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [parsed, setParsed] = useState<ParsedFile | null>(null);
  const [accountId, setAccountId] = useState<number | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function reset() {
    setParsed(null);
    setAccountId(null);
    setPreview(null);
    setResult(null);
    setError(null);
    setStep(0);
  }

  function handleParsed(file: ParsedFile) {
    setParsed(file);
    setError(null);
    setStep(1);
  }

  function handleAccount(id: number) {
    if (parsed === null) return;
    setAccountId(id);
    setError(null);

    startTransition(async () => {
      const response = await previewImport({
        accountId: id,
        rows: parsed.rows,
      });
      if (!response.success) {
        setError(response.error);
        return;
      }
      setPreview(response.data);
      setStep(2);
    });
  }

  function handleConfirm() {
    if (parsed === null || accountId === null) return;
    setError(null);

    startTransition(async () => {
      const response = await commitImport({
        accountId,
        filename: parsed.filename,
        detectedShape: parsed.shape,
        rows: parsed.rows,
      });
      if (!response.success) {
        setError(response.error);
        return;
      }
      setResult(response.data);
      setStep(3);
      // The batch list below is server data; it has to catch up.
      router.refresh();
    });
  }

  const account = accounts.find((candidate) => candidate.id === accountId);

  return (
    <div className="flex flex-col gap-6">
      <Stepper current={step} />

      {step === 0 ? (
        <FileStep
          instruments={instruments}
          timeZone={timeZone}
          onParsed={handleParsed}
        />
      ) : null}

      {step === 1 && parsed !== null ? (
        <AccountStep
          accounts={accounts}
          parsed={parsed}
          pending={isPending}
          error={error}
          onBack={reset}
          onChoose={handleAccount}
        />
      ) : null}

      {step === 2 && parsed !== null && preview !== null ? (
        <PreviewStep
          parsed={parsed}
          preview={preview}
          instruments={instruments}
          accountName={account?.name ?? ""}
          isPractice={account?.isPractice ?? false}
          pending={isPending}
          error={error}
          onBack={() => setStep(1)}
          onConfirm={handleConfirm}
        />
      ) : null}

      {step === 3 && result !== null ? (
        <ResultStep result={result} onAnother={reset} />
      ) : null}

      <BatchList batches={batches} timeZone={timeZone} />
    </div>
  );
}

/**
 * Where in the four steps this is. Plain text and a rule, not a progress bar:
 * nothing here is a process value that Design.md §1 would let glow.
 */
function Stepper({ current }: { current: number }) {
  return (
    <ol className="flex items-center gap-2">
      {STEPS.map((label, index) => (
        <li key={label} className="flex items-center gap-2">
          <span
            className={`cap ${index === current ? "cap-neon" : index < current ? "text-fg-muted" : "text-fg-subtle"}`}
          >
            {index + 1}. {label}
          </span>
          {index < STEPS.length - 1 ? (
            <span aria-hidden="true" className="h-px w-6 bg-white/12" />
          ) : null}
        </li>
      ))}
    </ol>
  );
}
