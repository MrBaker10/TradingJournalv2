import { describe, expect, it } from "vitest";
import {
  isThemePick,
  parseThemePick,
  THEME_COOKIE_OPTIONS,
  themeBodyClass,
} from "../theme";

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

describe("isThemePick, strict, for untrusted values", () => {
  it("accepts the three picks", () => {
    for (const value of ["dark", "light", "system"]) {
      expect(isThemePick(value)).toBe(true);
    }
  });

  it("refuses anything else instead of falling back to dark", () => {
    for (const value of [
      undefined,
      null,
      "",
      "Dark",
      "blue",
      1,
      {},
      ["dark"],
    ]) {
      expect(isThemePick(value)).toBe(false);
    }
  });
});

describe("THEME_COOKIE_OPTIONS, docs/adr/0007", () => {
  it("keeps the pick for a year on every path, sent on top-level navigation", () => {
    expect(THEME_COOKIE_OPTIONS).toEqual({
      maxAge: 31_536_000,
      sameSite: "lax",
      path: "/",
    });
  });
});
