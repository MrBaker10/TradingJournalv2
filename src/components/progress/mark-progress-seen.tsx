"use client";

import { useEffect, useRef } from "react";
import { markBadgesSeen } from "@/actions/badges";

/**
 * Spends the process moment once the page has rendered, not while it is
 * built: a GET that writes would spend it even when the response never
 * reached anyone. No revalidate afterwards either, which would re-render the
 * page mid-moment. Renders nothing.
 */
export function MarkProgressSeen({ due }: { due: boolean }) {
  const spent = useRef(false);

  useEffect(() => {
    if (spent.current || !due) return;
    spent.current = true;
    void markBadgesSeen();
  }, [due]);

  return null;
}
