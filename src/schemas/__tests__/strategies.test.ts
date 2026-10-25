import { describe, expect, it } from "vitest";
import { strategyContentSchema } from "../strategies.ts";

const nameOnly = {
  name: "Reversal",
  prerequisites: "",
  entry: "",
  stopRisk: "",
  exit: "",
  exclusions: "",
};

describe("strategyContentSchema", () => {
  it("accepts a name alone and stores empty chapters as null", () => {
    const result = strategyContentSchema.safeParse(nameOnly);
    expect(result.success && result.data).toEqual({
      name: "Reversal",
      prerequisites: null,
      entry: null,
      stopRisk: null,
      exit: null,
      exclusions: null,
    });
  });

  it("rejects a blank name", () => {
    const result = strategyContentSchema.safeParse({
      ...nameOnly,
      name: "   ",
    });
    expect(!result.success && result.error.issues[0].message).toBe(
      "Name your strategy",
    );
  });

  it("trims a chapter and keeps its text", () => {
    const result = strategyContentSchema.safeParse({
      ...nameOnly,
      entry: "  Retest of the range \n",
    });
    expect(result.success && result.data.entry).toBe("Retest of the range");
  });

  it("rejects an over-long chapter", () => {
    const result = strategyContentSchema.safeParse({
      ...nameOnly,
      exit: "x".repeat(4001),
    });
    expect(result.success).toBe(false);
  });
});
