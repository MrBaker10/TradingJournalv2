import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

// The redesign is sealed by this guard (.scratch/redesign/spec.md → Testing
// Decisions). Like reduced-motion.test.ts and toast-imports.test.ts it
// asserts the mechanism, because the look itself cannot be observed from the
// test runner: what it catches is a prototype artefact or a raw colour coming
// back, the two ways the redesign was most likely to be undone.

const ROOT = process.cwd();

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      return entry.name === "__tests__" ? [] : sourceFiles(path);
    }
    return /\.(ts|tsx)$/.test(entry.name) ? [path] : [];
  });
}

/** Files under `src/` whose text matches, as repo-relative paths. */
function matching(directories: string[], pattern: RegExp): string[] {
  return directories
    .flatMap((directory) => sourceFiles(join(ROOT, directory)))
    .filter((path) => pattern.test(readFileSync(path, "utf8")))
    .map((path) => relative(ROOT, path));
}

describe("redesign guard", () => {
  it("has no raw colour literal in a component (Design.md §2)", () => {
    // Colours are tokens in globals.css; a component names the token. A hex
    // counts where a colour stands (after a quote, `[`, `(` or `:`), so an
    // "issue #123" in a comment does not.
    const rawColour =
      /["'`[(:]\s*#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![\w-])|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch)\(\s*[\d.]/;
    expect(matching(["src/components", "src/app"], rawColour)).toEqual([]);
  });

  it("has no prototype/ directory", () => {
    // The prototype branches kept their variants in `…/prototype/` folders.
    const SKIP = new Set(["node_modules", ".git", ".next"]);
    function prototypeDirs(directory: string): string[] {
      return readdirSync(directory, { withFileTypes: true }).flatMap(
        (entry) => {
          if (!entry.isDirectory() || SKIP.has(entry.name)) return [];
          const path = join(directory, entry.name);
          if (entry.name === "prototype") return [relative(ROOT, path)];
          return prototypeDirs(path);
        },
      );
    }
    expect(prototypeDirs(ROOT)).toEqual([]);
  });

  it("reads no variant or view search parameter", () => {
    // How the prototypes switched views: `params.variant`, `params.view`,
    // `searchParams.get("view")`, `params.delete("variant")`, `?view=A` —
    // and the other ways a page reads one: destructured from `searchParams`,
    // optional chaining, a bracket.
    const parameter = new RegExp(
      [
        String.raw`\b(?:params|searchParams)\s*\??\.\s*(?:variant|view)\b`,
        String.raw`\.\s*(?:get|getAll|has|set|delete)\(\s*["'](?:variant|view)["']`,
        String.raw`\[\s*["'](?:variant|view)["']\s*\]`,
        String.raw`\{[^{}]*\b(?:variant|view)\b[^{}]*\}\s*=\s*(?:await\s+)?[\w.]*searchParams`,
        "[?&](?:variant|view)=",
      ].join("|"),
    );
    expect(matching(["src"], parameter)).toEqual([]);
  });

  describe("the root layout", () => {
    const layout = readFileSync(join(ROOT, "src/app/layout.tsx"), "utf8");

    it('wraps every page in <MotionConfig reducedMotion="user"> (Design.md §4)', () => {
      expect(layout).toMatch(
        /<MotionConfig reducedMotion="user">[\s\S]*\{children\}[\s\S]*<\/MotionConfig>/,
      );
    });

    it("sets the theme class on <body>, where overlays portal to", () => {
      // coding-standards.md → Styling: on a wrapper, sheets and menus that
      // portal into <body> would lose the tokens.
      const body = layout.match(/<body\s[^>]*>/)?.[0] ?? "";
      expect(body).toMatch(/className=[\s\S]*["'`\s]dark["'`\s]/);
      expect(layout.match(/<html\s[^>]*>/)?.[0]).not.toMatch(/\bdark\b/);
    });
  });
});
