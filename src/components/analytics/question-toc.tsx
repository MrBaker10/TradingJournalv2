"use client";

import { ANALYTICS_QUESTIONS, type QuestionId } from "@/domain/analytics";
import { useActiveSection } from "@/hooks/use-active-section";

const QUESTION_IDS: readonly QuestionId[] = ANALYTICS_QUESTIONS.map(
  (question) => question.id,
);

/**
 * The questions as a table of contents that follows the scroll (Design.md
 * §3.7), marked by `useActiveSection`. Hidden below `lg`, where the page is
 * one column (Design.md §3.12).
 */
export function QuestionToc() {
  const current = useActiveSection(QUESTION_IDS);

  return (
    <nav
      aria-label="Questions"
      className="sticky top-6 hidden flex-col gap-0.5 self-start lg:flex"
    >
      {ANALYTICS_QUESTIONS.map((question) => {
        const active = question.id === current;
        return (
          <a
            key={question.id}
            href={`#${question.id}`}
            aria-current={active ? "location" : undefined}
            className={`relative rounded-md py-1.5 pr-2 pl-3 text-sm leading-snug transition-colors duration-150 hover:bg-accent hover:text-foreground ${
              active ? "text-foreground" : "text-muted-foreground"
            }`}
          >
            {active && (
              <span
                aria-hidden="true"
                className="absolute top-1.5 bottom-1.5 left-0 w-0.5 rounded-full bg-foreground"
              />
            )}
            {question.title}
          </a>
        );
      })}
    </nav>
  );
}
