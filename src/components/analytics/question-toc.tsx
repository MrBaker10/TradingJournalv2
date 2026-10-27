"use client";

import { useEffect, useState } from "react";
import { ANALYTICS_QUESTIONS, type QuestionId } from "@/domain/analytics";

/**
 * The questions as a table of contents that follows the scroll (Design.md
 * §3.7): an intersection observer marks the question in the upper third of
 * the viewport as current. It relies on every question being able to reach
 * that third, which is why the page gives its last question at least the
 * height of the screen. Hidden below `lg`, where the page is one column
 * (Design.md §3.12).
 */
export function QuestionToc() {
  const [current, setCurrent] = useState<QuestionId>(ANALYTICS_QUESTIONS[0].id);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((entry) => entry.isIntersecting);
        if (visible) setCurrent(visible.target.id as QuestionId);
      },
      { rootMargin: "0px 0px -70% 0px" },
    );
    for (const question of ANALYTICS_QUESTIONS) {
      const section = document.getElementById(question.id);
      if (section) observer.observe(section);
    }
    return () => observer.disconnect();
  }, []);

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
