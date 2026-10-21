import type { ReactNode } from "react";

interface EmptySectionProps {
  title: string;
  /** Why the section is empty — the sentence that used to sit in an empty card. */
  children: ReactNode;
}

// Design.md §4.17: a section with nothing recorded is one line, not a row of
// empty cards. The reason stays — a blank section here usually means "not
// recorded", not "did not happen".
export function EmptySection({ title, children }: EmptySectionProps) {
  return (
    <section className="card-surface edge flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-5 py-4">
      <h2 className="cap cap-neon">{title}</h2>
      <p className="text-fg-subtle text-sm">{children}</p>
    </section>
  );
}
