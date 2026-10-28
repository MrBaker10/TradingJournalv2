import { describe, expect, it } from "vitest";
import { DEMO_USERNAME, isDemoUsername } from "../demo.ts";

describe("isDemoUsername", () => {
  it("knows the seeded demo user", () => {
    expect(DEMO_USERNAME).toBe("demo");
    expect(isDemoUsername("demo")).toBe(true);
  });

  it("matches any case, as usernames are stored lowercased", () => {
    expect(isDemoUsername("Demo")).toBe(true);
    expect(isDemoUsername("DEMO")).toBe(true);
  });

  it("leaves every other user alone", () => {
    expect(isDemoUsername("demo1")).toBe(false);
    expect(isDemoUsername("my_demo")).toBe(false);
    expect(isDemoUsername("local")).toBe(false);
    expect(isDemoUsername("")).toBe(false);
  });
});
