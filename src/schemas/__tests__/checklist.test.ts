import { describe, expect, it } from "vitest";
import {
  checklistItemIdSchema,
  checklistItemSchema,
  moveChecklistItemSchema,
  renameChecklistItemSchema,
  setChecklistCheckSchema,
} from "../checklist.ts";

describe("checklist inputs", () => {
  it("accepts the three fixed phases and trims text", () => {
    for (const phase of ["premarket", "trading", "review"]) {
      expect(checklistItemSchema.parse({ phase, text: "  My step  " })).toEqual(
        { phase, text: "My step" },
      );
    }
    expect(
      checklistItemSchema.safeParse({ phase: "custom", text: "Step" }).success,
    ).toBe(false);
  });
  it("validates the same text boundaries for add and rename", () => {
    for (const text of ["", "  ", "x".repeat(121)]) {
      expect(
        checklistItemSchema.safeParse({ phase: "review", text }).success,
      ).toBe(false);
      expect(
        renameChecklistItemSchema.safeParse({ itemId: 1, text }).success,
      ).toBe(false);
    }
    expect(
      renameChecklistItemSchema.parse({
        itemId: 1,
        text: ` ${"x".repeat(120)} `,
      }).text,
    ).toBe("x".repeat(120));
  });
  it("requires a positive integer item ID", () => {
    for (const itemId of [0, -1, 1.5, "1", null])
      expect(checklistItemIdSchema.safeParse({ itemId }).success).toBe(false);
    expect(checklistItemIdSchema.safeParse({ itemId: 1 }).success).toBe(true);
  });
  it("accepts a tick only as an item ID with a boolean and no date", () => {
    expect(
      setChecklistCheckSchema.parse({
        itemId: 1,
        checked: true,
        date: "2026-01-01",
      }),
    ).toEqual({ itemId: 1, checked: true });
    for (const checked of ["true", 1, null])
      expect(
        setChecklistCheckSchema.safeParse({ itemId: 1, checked }).success,
      ).toBe(false);
  });
  it("accepts only up or down as a move direction", () => {
    expect(
      moveChecklistItemSchema.parse({ itemId: 1, direction: "up" }),
    ).toEqual({ itemId: 1, direction: "up" });
    for (const direction of ["left", "", 1, null])
      expect(
        moveChecklistItemSchema.safeParse({ itemId: 1, direction }).success,
      ).toBe(false);
  });
});
