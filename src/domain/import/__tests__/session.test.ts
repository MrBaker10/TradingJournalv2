import { describe, expect, it } from "vitest";
import { SESSION_WINDOWS, sessionFromEntryTime } from "../session.ts";

// A trader sitting in New York reads the windows as they are written, so
// these cases pin the windows themselves without any zone arithmetic.
const NY = "America/New_York";
const ANY_DAY = "2026-08-13";

function inNewYork(time: string) {
  return sessionFromEntryTime(time, ANY_DAY, NY);
}

describe("sessionFromEntryTime", () => {
  describe("on the New York clock", () => {
    it("reads the four windows at their opening minute", () => {
      expect(inNewYork("18:00")).toBe("Asia");
      expect(inNewYork("03:00")).toBe("London");
      expect(inNewYork("09:30")).toBe("NY-AM");
      expect(inNewYork("12:00")).toBe("NY-PM");
    });

    it("excludes the closing minute, so no two windows claim it", () => {
      // 03:00 opens London, so Asia cannot still hold it.
      expect(inNewYork("02:59")).toBe("Asia");
      expect(inNewYork("09:29")).toBe("London");
      expect(inNewYork("11:59")).toBe("NY-AM");
      expect(inNewYork("15:59")).toBe("NY-PM");
    });

    it("carries Asia across midnight", () => {
      expect(inNewYork("23:59")).toBe("Asia");
      expect(inNewYork("00:00")).toBe("Asia");
      expect(inNewYork("01:30")).toBe("Asia");
    });

    it("leaves the gap between the close and the Asia open empty", () => {
      expect(inNewYork("16:00")).toBeNull();
      expect(inNewYork("17:00")).toBeNull();
      expect(inNewYork("17:59")).toBeNull();
    });

    it("accepts a time with seconds and ignores them", () => {
      expect(inNewYork("09:30:00")).toBe("NY-AM");
      expect(inNewYork("09:29:59")).toBe("London");
    });
  });

  describe("on the trader's own clock", () => {
    const BERLIN = "Europe/Berlin";

    it("reads a Berlin entry time on the New York clock", () => {
      // The fill behind this is 2026-08-13 15:57:01.616Z, which the trader's
      // own clock shows as 17:57 and New York as 11:57.
      expect(sessionFromEntryTime("17:57", "2026-08-13", BERLIN)).toBe("NY-AM");
    });

    it("puts the NY open at 15:30 Berlin in summer", () => {
      expect(sessionFromEntryTime("15:30", "2026-08-13", BERLIN)).toBe("NY-AM");
      expect(sessionFromEntryTime("15:29", "2026-08-13", BERLIN)).toBe(
        "London",
      );
    });

    it("puts the NY open at 15:30 Berlin in winter too", () => {
      // Both zones are on standard time: still six hours apart.
      expect(sessionFromEntryTime("15:30", "2026-01-15", BERLIN)).toBe("NY-AM");
    });

    it("follows the date through the changeover weeks", () => {
      // New York moves to summer time on 2026-03-08, Europe on 2026-03-29. In
      // between the zones are five hours apart, not six, so the NY open falls
      // an hour earlier on the Berlin clock. A constant offset would read
      // 14:30 as 08:30 in New York and call it London.
      expect(sessionFromEntryTime("14:30", "2026-03-10", BERLIN)).toBe("NY-AM");
      expect(sessionFromEntryTime("14:29", "2026-03-10", BERLIN)).toBe(
        "London",
      );

      // The same five-hour week in autumn: Europe steps back on 2026-10-25,
      // New York not until 2026-11-01.
      expect(sessionFromEntryTime("14:30", "2026-10-28", BERLIN)).toBe("NY-AM");
    });

    it("looks back to the previous New York day after midnight", () => {
      // 00:30 in Berlin is 18:30 the evening before in New York, which is the
      // Asia open. Reading the Berlin clock literally would find Asia too, but
      // for the wrong reason — this pins the instant, not the digits.
      expect(sessionFromEntryTime("00:30", "2026-08-14", BERLIN)).toBe("Asia");
      // 23:00 Berlin is 17:00 New York, which is in the gap.
      expect(sessionFromEntryTime("23:00", "2026-08-13", BERLIN)).toBeNull();
    });
  });

  describe("what it refuses to read", () => {
    it("has no session for a time it cannot read", () => {
      expect(inNewYork("")).toBeNull();
      expect(inNewYork("9:30")).toBeNull();
      expect(inNewYork("24:00")).toBeNull();
      expect(inNewYork("09:60")).toBeNull();
      expect(inNewYork("nonsense")).toBeNull();
    });

    it("has no session for a date it cannot read", () => {
      expect(sessionFromEntryTime("09:30", "", NY)).toBeNull();
      expect(sessionFromEntryTime("09:30", "13.08.2026", NY)).toBeNull();
      expect(sessionFromEntryTime("09:30", "2026-8-13", NY)).toBeNull();
    });
  });

  it("covers every minute of the day exactly once or not at all", () => {
    // A window that overlapped another would make the import's choice depend
    // on the order of SESSION_WINDOWS rather than on the clock.
    for (let minute = 0; minute < 24 * 60; minute += 1) {
      const hh = String(Math.floor(minute / 60)).padStart(2, "0");
      const mm = String(minute % 60).padStart(2, "0");
      const matches = SESSION_WINDOWS.filter((window) =>
        window.start < window.end
          ? minute >= window.start && minute < window.end
          : minute >= window.start || minute < window.end,
      );
      expect(
        matches.length,
        `${hh}:${mm} matched ${matches.length} windows`,
      ).toBeLessThanOrEqual(1);
    }
  });
});
