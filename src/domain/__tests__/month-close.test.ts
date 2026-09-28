import { describe, expect, it } from "vitest";
import {
  CLOSE_DAY,
  monthToClose,
  previousMonth,
  shouldWrite,
} from "../month-close.ts";

describe("CLOSE_DAY", () => {
  it("is the day the 48h grace after the month ends is over", () => {
    expect(CLOSE_DAY).toBe(3);
  });
});

describe("previousMonth", () => {
  it("steps back within a year", () => {
    expect(previousMonth("2026-10")).toBe("2026-09");
    expect(previousMonth("2026-12")).toBe("2026-11");
  });

  it("wraps January to December of the year before", () => {
    expect(previousMonth("2027-01")).toBe("2026-12");
  });
});

describe("monthToClose", () => {
  it("closes nothing while the grace is running", () => {
    expect(monthToClose("2026-10-01", "2026-01")).toBeNull();
    expect(monthToClose("2026-10-02", "2026-01")).toBeNull();
  });

  it("closes the previous month on the close day", () => {
    expect(monthToClose("2026-10-03", "2026-01")).toEqual({
      month: "2026-09",
      isCloseDay: true,
    });
  });

  it("still names the previous month after the close day, but not as the close day", () => {
    expect(monthToClose("2026-10-04", "2026-01")).toEqual({
      month: "2026-09",
      isCloseDay: false,
    });
    expect(monthToClose("2026-10-31", "2026-01")).toEqual({
      month: "2026-09",
      isCloseDay: false,
    });
  });

  it("closes December of the year before in January", () => {
    expect(monthToClose("2027-01-03", "2026-01")).toEqual({
      month: "2026-12",
      isCloseDay: true,
    });
  });

  it("closes the registration month itself", () => {
    expect(monthToClose("2026-10-03", "2026-09")).toEqual({
      month: "2026-09",
      isCloseDay: true,
    });
  });

  it("closes nothing for a user who registered in the running month", () => {
    expect(monthToClose("2026-10-03", "2026-10")).toBeNull();
  });
});

describe("shouldWrite", () => {
  it("writes on the close day, over an existing row too", () => {
    expect(shouldWrite(true, false)).toBe(true);
    expect(shouldWrite(true, true)).toBe(true);
  });

  it("after the close day, writes only a missing row", () => {
    expect(shouldWrite(false, false)).toBe(true);
    expect(shouldWrite(false, true)).toBe(false);
  });
});
