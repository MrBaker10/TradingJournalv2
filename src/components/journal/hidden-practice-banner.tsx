"use client";

import { useTransition } from "react";
import { setSelectedAccount } from "@/actions/accounts";
import { buttonVariants } from "@/components/ui/button";
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
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-practice/30 border-l-2 border-l-practice bg-practice/5 px-4 py-2.5 text-sm">
      <span className="font-medium text-practice-foreground">Practice</span>
      <span className="text-muted-foreground">
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
          className={buttonVariants({
            variant: "outline",
            className:
              "h-10 border-practice/40 text-practice-foreground hover:bg-practice/10 hover:text-practice-foreground lg:h-8 dark:border-practice/40",
          })}
        >
          {entry.accountName} ({entry.count})
        </button>
      ))}
    </div>
  );
}
