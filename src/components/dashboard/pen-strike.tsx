"use client";

import { motion } from "motion/react";
import { useLayoutEffect, useRef, useState } from "react";
import { type StrikeLine, strikeLines } from "@/lib/dashboard/pen-strike";

/**
 * Text that a pen strikes through when `on` (Design.md §3.2): one line per
 * rendered text line, left to right at a constant pen speed, each after the
 * one before. Line boxes are measured from the DOM and measured again on a
 * resize and once the web fonts have loaded, which changes the text width.
 * Turning it off lifts every line at once. Reduced motion (the root
 * MotionConfig) shows the lines without drawing them.
 */
export function PenStrike({ text, on }: { text: string; on: boolean }) {
  const box = useRef<HTMLSpanElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [lines, setLines] = useState<StrikeLine[]>([]);

  useLayoutEffect(() => {
    const outer = box.current;
    const inner = textRef.current;
    if (!outer || !inner) return;

    function measure() {
      if (!outer || !inner) return;
      const range = document.createRange();
      range.selectNodeContents(inner);
      setLines(
        strikeLines(
          Array.from(range.getClientRects()),
          outer.getBoundingClientRect(),
        ),
      );
    }

    let disposed = false;
    measure();
    void document.fonts.ready.then(() => {
      if (!disposed) measure();
    });
    const observer = new ResizeObserver(measure);
    observer.observe(outer);
    return () => {
      disposed = true;
      observer.disconnect();
    };
  }, []);

  return (
    <span ref={box} className="relative block min-w-0 break-words">
      <span
        ref={textRef}
        className={`transition-colors duration-150 ${on ? "text-muted-foreground" : ""}`}
      >
        {text}
      </span>
      {lines.map((line) => (
        <motion.span
          key={`${line.top}-${line.left}`}
          aria-hidden="true"
          className="pointer-events-none absolute h-[1.5px] origin-left rounded-full bg-muted-foreground"
          style={{ left: line.left, top: line.top, width: line.width }}
          initial={false}
          animate={{ scaleX: on ? 1 : 0 }}
          transition={
            on
              ? { duration: line.duration, delay: line.delay, ease: "linear" }
              : { duration: 0 }
          }
        />
      ))}
    </span>
  );
}
