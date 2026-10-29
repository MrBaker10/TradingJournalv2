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

/** One theme's custom properties, from the block that follows `opening`. */
function themeTokens(css: string, opening: string): Record<string, string> {
  const start = css.indexOf(opening);
  if (start === -1) throw new Error(`no theme block opens with ${opening}`);
  const block = css.slice(start + opening.length, css.indexOf("}", start));
  return Object.fromEntries(
    [...block.matchAll(/--([\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2]]),
  );
}

/** An `oklch()` token as gamma-encoded sRGB channels and its alpha. */
function oklchToSrgb(value: string): { rgb: number[]; alpha: number } {
  const match = value.match(
    /^oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+)(%?))?\)$/,
  );
  if (!match) throw new Error(`not an oklch() colour: ${value}`);
  const [lightness, chroma, hue] = match.slice(1, 4).map(Number);
  const alpha =
    match[4] === undefined ? 1 : Number(match[4]) / (match[5] ? 100 : 1);
  // OKLab → linear sRGB (Björn Ottosson's matrices), clipped to the gamut.
  const a = chroma * Math.cos((hue * Math.PI) / 180);
  const b = chroma * Math.sin((hue * Math.PI) / 180);
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const linear = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  const rgb = linear.map((channel) => {
    const c = Math.min(Math.max(channel, 0), 1);
    return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
  });
  return { rgb, alpha };
}

function relativeLuminance(rgb: number[]): number {
  const [r, g, b] = rgb.map((c) =>
    c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast of a token over a surface token, the token's alpha blended in. */
function contrast(tokens: Record<string, string>, fg: string, bg: string) {
  const surface = oklchToSrgb(tokens[bg]);
  const mark = oklchToSrgb(tokens[fg]);
  const blended = mark.rgb.map(
    (c, i) => c * mark.alpha + surface.rgb[i] * (1 - mark.alpha),
  );
  const [high, low] = [
    relativeLuminance(blended),
    relativeLuminance(surface.rgb),
  ].sort((x, y) => y - x);
  return (high + 0.05) / (low + 0.05);
}

/** The pairs below `minimum`, each with its ratio, for a readable failure. */
function failingPairs(
  tokens: Record<string, string>,
  pairs: string[][],
  minimum: number,
): string[][] {
  return pairs
    .map(([fg, bg]) => [fg, bg, contrast(tokens, fg, bg).toFixed(2)])
    .filter(([, , ratio]) => Number(ratio) < minimum);
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

  it("has no fixed amber palette class in a component (Design.md §2)", () => {
    // The practice amber changes with the theme, so it is the `practice` and
    // `practice-foreground` tokens; a fixed `amber-400` would stay the dark value in
    // Light (coding-standards.md → Themes).
    expect(matching(["src/components", "src/app"], /\bamber-\d/)).toEqual([]);
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

  describe("both themes meet WCAG 2.2 AA (Design.md §5)", () => {
    const css = readFileSync(join(ROOT, "src/app/globals.css"), "utf8");
    const themes = {
      Dark: themeTokens(css, ".dark,\n.system {"),
      Light: themeTokens(css, "@variant light {"),
    };
    // The account avatar's initial (sidebar-primary-foreground on
    // sidebar-primary) is decoration: the account's name stands beside it or
    // in the rail's tooltip, so it is not listed.
    const text = [
      ["foreground", "background"],
      ["foreground", "card"],
      ["card-foreground", "card"],
      ["popover-foreground", "popover"],
      ["primary-foreground", "primary"],
      ["secondary-foreground", "secondary"],
      ["muted-foreground", "background"],
      ["muted-foreground", "card"],
      ["muted-foreground", "popover"],
      ["muted-foreground", "muted"],
      ["accent-foreground", "accent"],
      ["sidebar-foreground", "sidebar"],
      ["sidebar-foreground", "sidebar-accent"],
      ["sidebar-accent-foreground", "sidebar-accent"],
      ["muted-foreground", "sidebar"],
      ["positive", "background"],
      ["positive", "card"],
      ["negative", "background"],
      ["negative", "card"],
      ["destructive", "background"],
      ["destructive", "card"],
      ["process", "background"],
      ["process", "card"],
      ["practice-foreground", "background"],
      ["practice-foreground", "card"],
      ["practice-foreground", "popover"],
      ["practice-foreground", "sidebar"],
    ];
    // Field borders, the focus ring and the practice stripe; `border` is a
    // decorative hairline and exempt.
    const marks = [
      ["input", "background"],
      ["input", "card"],
      ["input", "popover"],
      ["ring", "background"],
      ["ring", "card"],
      ["practice", "background"],
      ["practice", "card"],
      ["practice", "popover"],
    ];

    it("defines the same tokens in both themes (Design.md §2)", () => {
      // A token only one theme sets is undefined in the other.
      expect(Object.keys(themes.Light).sort()).toEqual(
        Object.keys(themes.Dark).sort(),
      );
    });

    for (const [theme, tokens] of Object.entries(themes)) {
      it(`${theme}: text at least 4.5:1 on its surface`, () => {
        expect(failingPairs(tokens, text, 4.5)).toEqual([]);
      });

      it(`${theme}: field border, focus ring and practice stripe at least 3:1`, () => {
        expect(failingPairs(tokens, marks, 3)).toEqual([]);
      });
    }
  });

  describe("the root layout", () => {
    const layout = readFileSync(
      join(ROOT, "src/app/[locale]/layout.tsx"),
      "utf8",
    );

    it('wraps every page in <MotionConfig reducedMotion="user"> (Design.md §4)', () => {
      expect(layout).toMatch(
        /<MotionConfig reducedMotion="user">[\s\S]*\{children\}[\s\S]*<\/MotionConfig>/,
      );
    });

    it("sets the theme class on <body>, where overlays portal to", () => {
      // coding-standards.md → Styling: on a wrapper, sheets and menus that
      // portal into <body> would lose the tokens.
      // The class comes from the `theme` cookie through the theme module
      // (docs/adr/0007), never a hard-coded `dark`.
      const body = layout.match(/<body\s[^>]*>/)?.[0] ?? "";
      expect(body).toMatch(/className=[\s\S]*\$\{themeBodyClass\(/);
      expect(body).not.toMatch(/["'`\s]dark["'`\s]/);
      expect(layout).toMatch(/parseThemePick\(\s*\w+\.get\(THEME_COOKIE\)/);
      expect(layout.match(/<html\s[^>]*>/)?.[0]).not.toMatch(
        /\b(?:dark|light|system|themeBodyClass)\b/,
      );
    });
  });
});
