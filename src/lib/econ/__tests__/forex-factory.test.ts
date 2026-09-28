import { describe, expect, it } from "vitest";
import { parseEvents } from "../forex-factory.ts";

// Verbatim from ff_calendar_thisweek.json, fetched 2026-09-28.
const response = [
  {
    title: "SPPI y/y",
    country: "JPY",
    date: "2026-09-27T19:50:00-04:00",
    impact: "Low",
    forecast: "3.6%",
    previous: "3.6%",
  },
  {
    title: "ECB President Lagarde Speaks",
    country: "EUR",
    date: "2026-09-28T09:30:00-04:00",
    impact: "Medium",
    forecast: "",
    previous: "",
  },
  {
    title: "Cash Rate",
    country: "AUD",
    date: "2026-09-29T00:30:00-04:00",
    impact: "High",
    forecast: "4.60%",
    previous: "4.35%",
  },
  {
    title: "Bank Holiday",
    country: "CAD",
    date: "2026-09-30T08:00:00-04:00",
    impact: "Holiday",
    forecast: "",
    previous: "",
  },
];

describe("parseEvents", () => {
  it("reads the feed as instants and display text", () => {
    expect(parseEvents(response)).toEqual([
      {
        occursAt: new Date("2026-09-27T23:50:00Z"),
        currency: "JPY",
        title: "SPPI y/y",
        impact: "Low",
        forecast: "3.6%",
        previous: "3.6%",
      },
      {
        occursAt: new Date("2026-09-28T13:30:00Z"),
        currency: "EUR",
        title: "ECB President Lagarde Speaks",
        impact: "Medium",
        forecast: null,
        previous: null,
      },
      {
        occursAt: new Date("2026-09-29T04:30:00Z"),
        currency: "AUD",
        title: "Cash Rate",
        impact: "High",
        forecast: "4.60%",
        previous: "4.35%",
      },
      {
        occursAt: new Date("2026-09-30T12:00:00Z"),
        currency: "CAD",
        title: "Bank Holiday",
        impact: "Holiday",
        forecast: null,
        previous: null,
      },
    ]);
  });

  it("reads the standard-time offset too", () => {
    const [event] = parseEvents([
      { ...response[0], date: "2026-11-02T08:30:00-05:00" },
    ]);
    expect(event?.occursAt).toEqual(new Date("2026-11-02T13:30:00Z"));
  });

  it("reads an empty week as no events", () => {
    expect(parseEvents([])).toEqual([]);
  });

  it("rejects a body that is not a list", () => {
    expect(() => parseEvents({ events: [] })).toThrow(/not a list/);
    expect(() => parseEvents("<html>")).toThrow(/not a list/);
  });

  it("rejects a row with a missing or empty field", () => {
    const { impact: _, ...withoutImpact } = response[2] as Record<
      string,
      unknown
    >;
    expect(() => parseEvents([response[0], withoutImpact])).toThrow(/row 2/);
    expect(() => parseEvents([{ ...response[0], title: " " }])).toThrow(
      /row 1/,
    );
    expect(() => parseEvents([{ ...response[0], forecast: null }])).toThrow(
      /row 1/,
    );
    expect(() => parseEvents([null])).toThrow(/row 1/);
  });

  it("rejects a date without an offset or that is not a date", () => {
    for (const date of [
      "2026-09-27T19:50:00",
      "2026-09-27",
      "09-27-2026 7:50pm",
      "2026-13-45T19:50:00-04:00",
    ]) {
      expect(() => parseEvents([{ ...response[0], date }])).toThrow(/row 1/);
    }
  });
});
