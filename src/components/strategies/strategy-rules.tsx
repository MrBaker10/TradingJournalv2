import type { StrategyContent } from "@/db/queries/strategies";
import { STRATEGY_CHAPTERS } from "./strategy-chapters";

/** The rules as plain text; chapters left empty are not shown. */
export function StrategyRules({ strategy }: { strategy: StrategyContent }) {
  const written = STRATEGY_CHAPTERS.filter(
    (chapter) => strategy[chapter.key] !== null,
  );
  if (written.length === 0) {
    return (
      <p className="text-fg-subtle text-sm">
        No chapters yet — add them when your rules are ready.
      </p>
    );
  }
  return (
    <dl className="flex flex-col gap-3">
      {written.map((chapter) => (
        <div key={chapter.key}>
          <dt className="cap">{chapter.label}</dt>
          <dd className="mt-1 whitespace-pre-wrap text-fg-muted text-sm">
            {strategy[chapter.key]}
          </dd>
        </div>
      ))}
    </dl>
  );
}
