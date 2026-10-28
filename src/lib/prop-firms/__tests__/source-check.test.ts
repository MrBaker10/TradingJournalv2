import { describe, expect, it } from "vitest";
import {
  decideSource,
  extractText,
  reportSourceCheck,
  snapshotPath,
} from "../source-check.ts";

const ARTICLE = `<!doctype html>
<html>
<head><title>Rules</title><style>.x{color:red}</style></head>
<body>
  <header><a href="/">Help center</a></header>
  <nav><a href="/rules">Rules</a></nav>
  <main>
    <h1>Daily loss limit</h1>
    <p>Updated over a week ago</p>
    <p>The limit is <strong>$1,000</strong> &amp; resets at 5&nbsp;PM ET.</p>
    <script>window.track("view")</script>
    <ul><li>News trading: allowed</li><li>Overnight: not allowed</li></ul>
    <p>Updated 12 September 2026</p>
    <aside><h2>You may like to read -</h2><p>Payout policy</p></aside>
  </main>
  <footer>© 2026 Firm</footer>
</body>
</html>`;

describe("extractText", () => {
  it("keeps the article's text, one block per line, without page furniture", () => {
    expect(extractText(ARTICLE, "text/html; charset=utf-8")).toBe(
      [
        "Daily loss limit",
        "The limit is $1,000 & resets at 5 PM ET.",
        "News trading: allowed",
        "Overnight: not allowed",
        "Updated 12 September 2026",
        "",
      ].join("\n"),
    );
  });

  it("decodes numeric entities and drops zero-width characters", () => {
    const html =
      "<main><p>&#36;3,000 &#x2014; EOD</p><p>&#8203;</p><p>Rule\u200B</p></main>";

    expect(extractText(html, "text/html")).toBe("$3,000 — EOD\nRule\n");
  });

  it("reads the body when the page has no main or article", () => {
    const html =
      "<html><body><div>Profit split</div><div>90%</div></body></html>";

    expect(extractText(html, "text/html")).toBe("Profit split\n90%\n");
  });

  it("reads a WordPress help center article from its JSON", () => {
    const json = JSON.stringify({
      id: 32338,
      modified: "2026-10-20T10:00:00",
      title: { rendered: "EOD Evaluations" },
      content: {
        rendered: "<p>Profit target: $3,000</p><p>Drawdown: $2,000</p>",
      },
    });

    expect(extractText(json, "application/json; charset=UTF-8")).toBe(
      "EOD Evaluations\nProfit target: $3,000\nDrawdown: $2,000\n",
    );
  });

  it("drops relative update times, which change while the page does not", () => {
    for (const line of [
      "Updated today",
      "Updated yesterday",
      "Updated this week",
      "Updated in the last hour",
      "Updated over 3 weeks ago",
      "Updated over a month ago",
    ]) {
      expect(
        extractText(`<main><p>${line}</p><p>Rule</p></main>`, "text/html"),
      ).toBe("Rule\n");
    }
  });
});

describe("decideSource", () => {
  it("tells a first sight, a change and no change apart, saving only new text", () => {
    expect(decideSource({ text: "Rule\n" }, null)).toEqual({
      outcome: "new",
      save: true,
    });
    expect(decideSource({ text: "Rule changed\n" }, "Rule\n")).toEqual({
      outcome: "changed",
      save: true,
    });
    expect(decideSource({ text: "Rule\n" }, "Rule\n")).toEqual({
      outcome: "unchanged",
      save: false,
    });
  });

  it("reports a source it could not read as failed and keeps its saved text", () => {
    expect(decideSource({ failure: "HTTP 403" }, "Rule\n")).toEqual({
      outcome: "failed",
      reason: "HTTP 403",
      save: false,
    });
    expect(decideSource({ failure: "ENOTFOUND" }, null)).toEqual({
      outcome: "failed",
      reason: "ENOTFOUND",
      save: false,
    });
  });

  it("never replaces a saved text with an empty page", () => {
    expect(decideSource({ text: "" }, "Rule\n")).toEqual({
      outcome: "failed",
      reason: "no text",
      save: false,
    });
  });
});

describe("snapshotPath", () => {
  it("files each source under its firm, named after its URL", () => {
    expect(
      snapshotPath({
        firm: "Take Profit Trader",
        url: "https://takeprofittraderhelp.zendesk.com/hc/en-us/articles/15169070804125-Rule-1-Hit-Your-Profit-Target",
      }),
    ).toBe(
      "take-profit-trader/takeprofittraderhelp.zendesk.com-hc-en-us-articles-15169070804125-rule-1-hit-your-profit-target.txt",
    );
    expect(
      snapshotPath({
        firm: "E8 Markets",
        url: "https://e8markets.com/futures",
      }),
    ).toBe("e8-markets/e8markets.com-futures.txt");
    expect(
      snapshotPath({ firm: "Futures Elite", url: "https://futureselite.com/" }),
    ).toBe("futures-elite/futureselite.com.txt");
  });
});

describe("reportSourceCheck", () => {
  it("summarises each firm and names every source that changed, is new or failed", () => {
    const report = reportSourceCheck([
      {
        firm: "Tradeify",
        url: "https://help.tradeify.co/a",
        outcome: "unchanged",
      },
      {
        firm: "Tradeify",
        url: "https://help.tradeify.co/b",
        outcome: "changed",
      },
      {
        firm: "Tradeify",
        url: "https://help.tradeify.co/c",
        outcome: "failed",
        reason: "HTTP 403",
      },
      {
        firm: "BluSky",
        url: "https://help.blusky.pro/a",
        outcome: "unchanged",
      },
      { firm: "BluSky", url: "https://help.blusky.pro/b", outcome: "new" },
    ]);

    expect(report).toEqual([
      "Tradeify: 1 changed, 1 unchanged, 1 failed",
      "  changed  https://help.tradeify.co/b",
      "  failed   https://help.tradeify.co/c (HTTP 403)",
      "BluSky: 1 unchanged, 1 new",
      "  new      https://help.blusky.pro/b",
    ]);
  });
});
