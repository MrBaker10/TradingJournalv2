import { describe, expect, it } from "vitest";
import { setThemeSchema } from "../theme.ts";

describe("setThemeSchema, the set-theme action's input", () => {
  it("accepts the three picks", () => {
    for (const value of ["dark", "light", "system"]) {
      expect(setThemeSchema.safeParse(value)).toEqual({
        success: true,
        data: value,
      });
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
      expect(setThemeSchema.safeParse(value).success).toBe(false);
    }
  });
});
