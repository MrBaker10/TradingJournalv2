import { describe, expect, it } from "vitest";
import { domainLabel, snapshotImageUrl } from "../links.ts";

describe("domainLabel", () => {
  it("drops the www prefix", () => {
    expect(domainLabel("https://www.tradingview.com/x/aB3dEf9k/")).toBe(
      "tradingview.com",
    );
  });

  it("returns the input unchanged when it does not parse", () => {
    expect(domainLabel("not a url")).toBe("not a url");
  });
});

describe("snapshotImageUrl", () => {
  // The pair this whole function exists for, checked against the live host on
  // 2026-09-23: the derived URL answered 200 image/png, the same id under the
  // wrong directory letter answered 403.
  it("derives the snapshot image from a share link", () => {
    expect(snapshotImageUrl("https://www.tradingview.com/x/yThC9lEo/")).toBe(
      "https://s3.tradingview.com/snapshots/y/yThC9lEo.png",
    );
  });

  it("accepts the host without www and without a trailing slash", () => {
    expect(snapshotImageUrl("https://tradingview.com/x/m7azfyek")).toBe(
      "https://s3.tradingview.com/snapshots/m/m7azfyek.png",
    );
  });

  // The directory is the first character *lowercased*, while the filename
  // keeps the id's own casing. Getting this wrong is a silent 403, not an
  // error, so it gets its own case.
  it("lowercases the directory but not the filename", () => {
    expect(snapshotImageUrl("https://www.tradingview.com/x/KKPjceQ6/")).toBe(
      "https://s3.tradingview.com/snapshots/k/KKPjceQ6.png",
    );
  });

  it("ignores a query string and a fragment", () => {
    expect(
      snapshotImageUrl("https://www.tradingview.com/x/yThC9lEo/?utm=x#top"),
    ).toBe("https://s3.tradingview.com/snapshots/y/yThC9lEo.png");
  });

  it("returns null for any other host", () => {
    expect(snapshotImageUrl("https://example.com/x/yThC9lEo/")).toBeNull();
    expect(
      snapshotImageUrl("https://evil-tradingview.com/x/yThC9lEo/"),
    ).toBeNull();
    // A subdomain is not the share host either — the snapshot ids live under
    // the bare domain only.
    expect(
      snapshotImageUrl("https://de.tradingview.com/x/yThC9lEo/"),
    ).toBeNull();
  });

  it("returns null for another path on the same host", () => {
    expect(
      snapshotImageUrl("https://www.tradingview.com/chart/yThC9lEo/"),
    ).toBeNull();
    expect(snapshotImageUrl("https://www.tradingview.com/x/")).toBeNull();
    expect(
      snapshotImageUrl("https://www.tradingview.com/x/yThC9lEo/extra"),
    ).toBeNull();
  });

  it("returns null for a non-alphanumeric id", () => {
    expect(
      snapshotImageUrl("https://www.tradingview.com/x/../../etc/passwd"),
    ).toBeNull();
    expect(snapshotImageUrl("https://www.tradingview.com/x/a-b_c/")).toBeNull();
  });

  it("returns null for http and for anything that does not parse", () => {
    expect(
      snapshotImageUrl("http://www.tradingview.com/x/yThC9lEo/"),
    ).toBeNull();
    expect(snapshotImageUrl("javascript:alert(1)")).toBeNull();
    expect(snapshotImageUrl("not a url")).toBeNull();
    expect(snapshotImageUrl("")).toBeNull();
  });
});
