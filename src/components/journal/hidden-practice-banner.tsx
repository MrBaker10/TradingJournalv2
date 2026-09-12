"use client";

import { useTransition } from "react";
import { setSelectedAccount } from "@/actions/accounts";
import type { JournalHiddenPracticeCount } from "@/db/queries/trades";

interface HiddenPracticeBannerProps {
  hiddenCounts: JournalHiddenPracticeCount[];
}

// project-overview.md: a practice-only trade "is hidden with a visible count
// and a one-click way to show it" — clicking an account here reuses the
// existing account switcher state (setSelectedAccount) instead of a second,
// journal-local channel, since practice figures are only ever visible via a
// single-account selection.
export function HiddenPracticeBanner({
  hiddenCounts,
}: HiddenPracticeBannerProps) {
  const [isPending, startTransition] = useTransition();

  if (hiddenCounts.length === 0) return null;

  function reveal(accountId: number) {
    startTransition(async () => {
      await setSelectedAccount({ accountId });
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-ctl border border-practice/30 bg-practice-dim px-4 py-2.5 text-sm">
      <span className="cap-practice rounded-xs px-1.5 py-0.5">Practice</span>
      <span className="text-fg-muted">
        {hiddenCounts.length === 1
          ? `${hiddenCounts[0].count} trade${
              hiddenCounts[0].count === 1 ? "" : "s"
            } hidden on a practice account —`
          : "Trades hidden on practice accounts —"}
      </span>
      {hiddenCounts.map((entry) => (
        <button
          key={entry.accountId}
          type="button"
          disabled={isPending}
          onClick={() => reveal(entry.accountId)}
          className="rounded-xs border border-practice/40 px-2 py-1 text-practice text-xs transition-colors hover:bg-practice-dim disabled:opacity-60"
        >
          {entry.accountName} ({entry.count})
        </button>
      ))}
    </div>
  );
}
