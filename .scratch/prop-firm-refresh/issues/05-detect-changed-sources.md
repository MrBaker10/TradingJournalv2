# 05: Detect which source pages changed

**What to build:** One command fetches every page on the source list, extracts its readable
text and compares it with the text seen at the last data refresh, then reports per firm:
changed, unchanged or failed (with the HTTP status or error). It saves the new text in the
repo so the change shows in a diff, and never touches the prop firm data file or a
database. Its first run records the starting texts.

Spec: `.scratch/prop-firm-refresh/spec.md`. Decision: `docs/adr/0005`. Terms: `GLOSSARY.md` →
Source list, Data refresh.

**Blocked by:** 04

**Status:** done

- [x] Spike first: try text extraction without a new dependency against the real sources and record the result in this ticket. If a dependency is needed, stop and ask the user before adding it.
- [x] Extracting the text and comparing it with the saved text are pure functions, covered by Vitest with fixture HTML; no test fetches the network.
- [x] A page that cannot be fetched is reported as failed, never as unchanged, and its saved text is kept.
- [x] Two runs in a row without a change on the firms' side report every reachable source as unchanged (no false changes from page furniture).
- [x] The first run's saved texts are committed with this ticket.
- [x] Full gate; no browser check needed (no screen changes), stated as such.

## Spike (2026-10-28)

Dependency-free extraction (Node `fetch`, regex tag stripping: `<main>`/`<article>` or
`<body>`, drop script/style/noscript/svg/template/head/nav/header/footer/iframe, block tags
to line breaks, decode entities, collapse whitespace; WordPress JSON via
`title.rendered` + `content.rendered`), honest User-Agent, all 194 sources fetched twice
a few minutes apart:

- Reachable: 140 and 136 of 194. Every source reachable in both runs (132) gave the
  identical text: no false changes between runs. Texts read as the article (median
  3,186 characters).
- 403 on every run: Tradeify help center (10), Apex help center API (10), Legends
  knowledge base (17), lucidtrading.com, e8markets.com/futures. These block non-browser
  clients (as the research notes say for Tradeify and Apex); they are reported as failed,
  not worked around.
- 403 on some runs: E8 help center and Take Profit Trader Zendesk, varying between runs
  (rate limiting).
- 404: support.thetradingpit.com/prohibited-trading-practices (dead link).
- Page furniture that changes with time: Intercom's relative "Updated over a week ago"
  lines (dropped by the extractor; absolute "Updated 12 September 2026" and Freshdesk
  "Modified on …" stay, they are real signals) and the live payout ticker on
  myfundedfutures.com/plans/rapid ("Updates every 4 hours"), not filtered.

Result: no new dependency needed for extraction.

Added during implementation: `aside` joined the dropped tags (Freshdesk's rotating "You
may like to read" sidebar gave three false changes on TradeDay), and zero-width
characters are removed (they stood as lines of their own).

## Review

Standards:
- Fixed: reading a saved text swallowed every error as "no saved text"; only `ENOENT`
  counts now, anything else stops the run (coding-standards → Error handling).
- Fixed: the rule "failed, never unchanged, saved text kept" and the empty-page guard
  lived only in the script; they are the pure `decideSource`, covered by Vitest.
- Fixed: results were keyed by URL alone; they now land at their source's index.
- Fixed: `snapshotPath` repeated `slug`; one `slug` with the replaced characters as a
  parameter. A `Source` type bundles firm and URL. Renamed `describe` →
  `failureReason`, `COUNTED` → `SUMMARY_ORDER`, `own` → `firmResults`.
- Fixed: zero-width characters stood as lines of their own; removed, with a test that
  also covers numeric entities.
- Fixed (user decision 2026-10-28): `src/scripts/` is listed in
  `context/project-structure.md`.

Spec:
- Fixed: the Spike section now lists `aside` and the zero-width cleanup.
- Kept (user decision 2026-10-28): the payout ticker on myfundedfutures.com/plans/rapid
  ("Updates every 4 hours") reports that page as changed on most runs; a known false
  change, not filtered. Back-to-back runs are clean.
- Accepted (user decision 2026-10-28): 68 of 193 sources fail with HTTP 403 for
  non-browser clients (Tradeify, Apex, Legends, E8 all; Take Profit Trader 15 of 16;
  lucidtrading.com). They are not worked around and have no saved text; the refresh
  guide (ticket 06) lists them for a manual look in the browser.
- Fixed (user decision 2026-10-28): the dead link
  support.thetradingpit.com/prohibited-trading-practices (HTTP 404) left the source list.

Verification: `pnpm lint`, `pnpm typecheck`, `pnpm test` (98 files, 1482 passed, none
skipped; no test fetches the network), `pnpm build` all pass. `pnpm
check:prop-firm-sources`: first run saved 125 texts, 69 failed. After each extraction
fix, one run took over the cleaner texts and the run right after reported all 125
reachable sources unchanged, 69 failed, no failed source written. No browser check: no
screen changes.
