import { describe, expect, it } from "vitest";
import { parseThemePick, themeBodyClass } from "../theme";

describe("parseThemePick, docs/adr/0007", () => {
  it("reads each pick as itself", () => {
    expect(parseThemePick("dark")).toBe("dark");
    expect(parseThemePick("light")).toBe("light");
    expect(parseThemePick("system")).toBe("system");
  });

  it("falls back to dark for a missing, empty, differently cased or unknown value", () => {
    for (const value of [
      undefined,
      null,
      "",
      "Light",
      "SYSTEM",
      "blue",
      " dark",
    ]) {
      expect(parseThemePick(value)).toBe("dark");
    }
  });
});

describe("themeBodyClass, globals.css", () => {
  it("gives each pick the class its palette sits on", () => {
    expect(themeBodyClass("dark")).toBe("dark");
    expect(themeBodyClass("light")).toBe("light");
    expect(themeBodyClass("system")).toBe("system");
  });
});
