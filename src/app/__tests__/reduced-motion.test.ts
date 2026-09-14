import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Design.md §5 makes a promise that nothing else in this repo checks: under
// `prefers-reduced-motion: reduce`, **every** transition and animation is off,
// and each state stays recognisable without movement.
//
// The promise is kept in two places that have to hold together, and both have
// been wrong before:
//
//   1. The CSS block in globals.css. It shipped without
//      `animation-iteration-count` until 2026-09-13 — and a duration of
//      0.01ms does not stop an `infinite` animation, it spins it a hundred
//      thousand times a second. §5 spells that out; this test enforces it.
//   2. `<MotionConfig reducedMotion="user">` at the app root. `motion`
//      animates through JS-set inline styles and ignores the CSS block
//      entirely, so without this the promise is simply false for the
//      calendar build-in and the streak bump.
//
// Neither can be observed from a unit test in a real browser, and emulating
// the media query is not something the test runner can do. Asserting that the
// two mechanisms are present and complete is the part that *can* be checked,
// and it is the part that regressed before.
function read(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

describe("reduced motion, Design.md §5", () => {
  const css = read("src/app/globals.css");
  const block =
    css.match(
      /@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\n\}/,
    )?.[0] ?? "";

  it("has a prefers-reduced-motion block at all", () => {
    expect(block).not.toBe("");
  });

  it("covers every element and both pseudo-elements", () => {
    expect(block).toMatch(/\*,\s*\*::before,\s*\*::after/);
  });

  it("kills animation duration, iteration count and transition duration", () => {
    // The iteration count is the one that went missing once. It is not
    // optional: it is what actually ends a looping animation.
    expect(block).toMatch(/animation-duration:\s*0?\.01ms\s*!important/);
    expect(block).toMatch(/animation-iteration-count:\s*1\s*!important/);
    expect(block).toMatch(/transition-duration:\s*0?\.01ms\s*!important/);
  });

  it('keeps MotionConfig reducedMotion="user" at the app root', () => {
    const layout = read("src/app/layout.tsx");
    expect(layout).toContain('<MotionConfig reducedMotion="user">');
  });
});
