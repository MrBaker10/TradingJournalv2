import { describe, expect, it } from "vitest";
import { timeStrip } from "../time-strip.ts";

describe("timeStrip", () => {
  it("centres a single entry in a four-hour window on the chart clock", () => {
    expect(timeStrip(["09:30:00"])).toMatchObject({
      hours: [
        { hour: 8, left: 12.5 },
        { hour: 9, left: 37.5 },
        { hour: 10, left: 62.5 },
        { hour: 11, left: 87.5 },
      ],
      positions: [50],
    });
  });

  it("keeps the window inside the day for an entry just after midnight", () => {
    const strip = timeStrip(["00:20:00"]);

    expect(strip.hours.map((tick) => tick.hour)).toEqual([0, 1, 2, 3, 4]);
    expect(strip.hours[0].left).toBe(0);
    expect(strip.positions).toEqual([8.33]);
  });

  it("keeps the window inside the day for an entry just before midnight", () => {
    const strip = timeStrip(["23:45:00"]);

    expect(strip.hours.map((tick) => tick.hour)).toEqual([20, 21, 22, 23, 24]);
    expect(strip.hours.at(-1)?.left).toBe(100);
    expect(strip.positions).toEqual([93.75]);
  });

  it("pads a long session by an hour each side and keeps the input order", () => {
    const strip = timeStrip(["14:30:00", "08:00:00"]);

    expect(strip.hours.map((tick) => tick.hour)).toEqual([
      7, 8, 9, 10, 11, 12, 13, 14, 15,
    ]);
    expect(strip.positions).toEqual([88.24, 11.76]);
  });

  it("spans the whole day when entries sit at both ends of it", () => {
    const strip = timeStrip(["00:10:00", "23:50:00"]);

    expect(strip.hours[0]).toMatchObject({ hour: 0, left: 0 });
    expect(strip.hours.at(-1)).toMatchObject({ hour: 24, left: 100 });
    expect(strip.positions).toEqual([0.69, 99.31]);
  });

  it("labels every hour of a short window", () => {
    const strip = timeStrip(["09:30:00"]);

    expect(strip.hours.every((tick) => tick.label)).toBe(true);
  });

  it("labels at most seven hours, on round steps, so a phone can read them", () => {
    const labelled = (times: string[]) =>
      timeStrip(times)
        .hours.filter((tick) => tick.label)
        .map((tick) => tick.hour);

    expect(labelled(["00:10:00", "23:50:00"])).toEqual([
      0, 4, 8, 12, 16, 20, 24,
    ]);
    expect(labelled(["14:30:00", "08:00:00"])).toEqual([8, 10, 12, 14]);
  });
});
