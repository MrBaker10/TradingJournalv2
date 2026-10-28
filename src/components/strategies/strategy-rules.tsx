import type { StrategyContent } from "@/db/queries/strategies";
import { STRATEGY_CHAPTERS } from "./strategy-chapters";

/** The rules as plain text; chapters left empty are not shown. */
export function StrategyRules({ strategy }: { strategy: StrategyContent }) {
  const written = STRATEGY_CHAPTERS.filter(
    (chapter) => strategy[chapter.key] !== null,
  );
  if (written.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No chapters yet — add them when your rules are ready.
      </p>
    );
  }
  return (
    <dl className="flex flex-col gap-3">
      {written.map((chapter) => (
        <div key={chapter.key}>
          <dt className="font-medium text-muted-foreground text-xs">
            {chapter.label}
          </dt>
          <dd className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">
            {strategy[chapter.key]}
          </dd>
        </div>
      ))}
    </dl>
  );
}
