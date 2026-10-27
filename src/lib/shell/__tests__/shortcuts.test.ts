import { describe, expect, it } from "vitest";
import { shellShortcut } from "../shortcuts";

const NO_MODIFIERS = { metaKey: false, ctrlKey: false, altKey: false };

describe("shellShortcut, Design.md §3.1", () => {
  it("toggles the sidebar on [", () => {
    expect(shellShortcut({ key: "[", ...NO_MODIFIERS }, false)).toBe(
      "toggleSidebar",
    );
  });

  it("logs a trade on C, with or without Shift", () => {
    expect(shellShortcut({ key: "c", ...NO_MODIFIERS }, false)).toBe(
      "logTrade",
    );
    expect(shellShortcut({ key: "C", ...NO_MODIFIERS }, false)).toBe(
      "logTrade",
    );
  });

  it("leaves copy and other modified presses of C and [ to the browser", () => {
    for (const key of ["c", "["]) {
      for (const modifier of ["metaKey", "ctrlKey", "altKey"] as const) {
        expect(
          shellShortcut({ key, ...NO_MODIFIERS, [modifier]: true }, false),
        ).toBeNull();
      }
    }
  });

  it("toggles the command palette on ⌘K and on Ctrl+K", () => {
    expect(
      shellShortcut({ key: "k", ...NO_MODIFIERS, metaKey: true }, false),
    ).toBe("togglePalette");
    expect(
      shellShortcut({ key: "k", ...NO_MODIFIERS, ctrlKey: true }, false),
    ).toBe("togglePalette");
    expect(shellShortcut({ key: "k", ...NO_MODIFIERS }, false)).toBeNull();
  });

  it("does nothing while the focus is in a field, an editable element or a dialog", () => {
    expect(shellShortcut({ key: "c", ...NO_MODIFIERS }, true)).toBeNull();
    expect(shellShortcut({ key: "[", ...NO_MODIFIERS }, true)).toBeNull();
    expect(
      shellShortcut({ key: "k", ...NO_MODIFIERS, metaKey: true }, true),
    ).toBeNull();
  });
});
