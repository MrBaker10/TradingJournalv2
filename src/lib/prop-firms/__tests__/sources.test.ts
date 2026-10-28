import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parsePropFirms } from "../parse.ts";
import { parseSourceList } from "../sources.ts";

describe("parseSourceList", () => {
  it("reads every firm with its URLs in file order", () => {
    const markdown = [
      "# Prop firm sources",
      "",
      "Official pages only.",
      "",
      "## Tradeify",
      "",
      "- https://help.tradeify.co/en/articles/1-rules",
      "- https://help.tradeify.co/en/articles/2-payouts",
      "",
      "## Apex Trader Funding",
      "- https://apextraderfunding.com/wp-json/wp/v2/help-center/32338",
      "",
    ].join("\n");

    expect(parseSourceList(markdown)).toEqual([
      {
        firm: "Tradeify",
        urls: [
          "https://help.tradeify.co/en/articles/1-rules",
          "https://help.tradeify.co/en/articles/2-payouts",
        ],
      },
      {
        firm: "Apex Trader Funding",
        urls: ["https://apextraderfunding.com/wp-json/wp/v2/help-center/32338"],
      },
    ]);
  });

  it("rejects a URL that is not https", () => {
    const markdown = "## Tradeify\n\n- http://help.tradeify.co/rules\n";

    expect(() => parseSourceList(markdown)).toThrow(
      'prop-firm-sources.md line 3: a URL for "Tradeify" must be https, found "http:"',
    );
  });

  it("rejects a line that is not a URL", () => {
    const markdown = "## Tradeify\n\n- help center rules page\n";

    expect(() => parseSourceList(markdown)).toThrow(
      'prop-firm-sources.md line 3: a URL for "Tradeify" is not a URL: "help center rules page"',
    );
  });

  it("rejects a line that is not a list item", () => {
    const markdown = "## Tradeify\n\nhttps://help.tradeify.co/rules\n";

    expect(() => parseSourceList(markdown)).toThrow(
      'prop-firm-sources.md line 3: expected "- <url>"',
    );
  });

  it("rejects a firm without URLs", () => {
    const markdown =
      "## Tradeify\n\n## Apex Trader Funding\n- https://apextraderfunding.com\n";

    expect(() => parseSourceList(markdown)).toThrow(
      'prop-firm-sources.md line 1: "Tradeify" has no URL',
    );
  });

  it("rejects a firm listed twice", () => {
    const markdown =
      "## Tradeify\n- https://tradeify.co\n\n## Tradeify\n- https://help.tradeify.co\n";

    expect(() => parseSourceList(markdown)).toThrow(
      'prop-firm-sources.md line 4: "Tradeify" is listed twice',
    );
  });
});

// The real files: every firm the data file has is in the source list and the
// other way round. Parsing the list also checks that every URL is https.
describe("context/prop-firm-sources.md", () => {
  const read = (path: string) =>
    readFileSync(join(process.cwd(), path), "utf8");

  it("names exactly the firms of PropFirmsData.md", () => {
    const firms = parsePropFirms(read("context/PropFirmsData.md"));
    const sources = parseSourceList(read("context/prop-firm-sources.md"));

    expect(sources.map((entry) => entry.firm).sort()).toEqual(
      firms.map((firm) => firm.name).sort(),
    );
  });
});
