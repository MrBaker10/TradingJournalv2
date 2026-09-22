import { describe, expect, it } from "vitest";
import { placeholderEmail } from "../placeholder-email.ts";

describe("placeholderEmail", () => {
  it("puts the username on the reserved .invalid domain", () => {
    expect(placeholderEmail("trader")).toBe("trader@users.invalid");
  });

  it("lowercases, so two spellings of one username collide on the unique column", () => {
    // The username plugin stores usernames lowercased. If the email kept the
    // typed spelling, "Trader" and "trader" would get two different emails
    // for what the username column treats as one name.
    expect(placeholderEmail("Trader")).toBe(placeholderEmail("trader"));
  });

  it("ignores surrounding whitespace", () => {
    expect(placeholderEmail("  trader ")).toBe("trader@users.invalid");
  });
});
