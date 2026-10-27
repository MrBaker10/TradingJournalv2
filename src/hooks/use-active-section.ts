"use client";

import { useEffect, useState } from "react";

/**
 * The section a table of contents that follows the scroll marks as current
 * (Design.md §3.7, §3.8): an intersection observer picks the section in the
 * upper third of the viewport. It relies on every section being able to
 * reach that third, which is why such a page gives its last section at
 * least the height of the screen.
 */
export function useActiveSection<Id extends string>(ids: readonly Id[]): Id {
  const [current, setCurrent] = useState<Id>(ids[0]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((entry) => entry.isIntersecting);
        if (visible) setCurrent(visible.target.id as Id);
      },
      { rootMargin: "0px 0px -70% 0px" },
    );
    for (const id of ids) {
      const section = document.getElementById(id);
      if (section) observer.observe(section);
    }
    return () => observer.disconnect();
  }, [ids]);

  return current;
}
