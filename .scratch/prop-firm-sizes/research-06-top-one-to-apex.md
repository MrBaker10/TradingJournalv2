# Research: sizes for Top One Futures, BluSky, Funded Futures Family, Lucid Trading, Apex Trader Funding

Ticket: `issues/06-sizes-top-one-to-apex.md`. Checked 2026-10-22. Values come from firm-owned
pages only (website, help center, FAQ). propfirmmatch.com served as a size checklist
(spec, Data collection); no value was taken from it.

## Completeness check against propfirmmatch.com (2026-10-22)

From each firm's `/challenges` table (all pages):

- Top One Futures: Elite Daily 25K/50K/100K/150K — matches.
- Funded Futures Family: Prime Standard and Prime Max, each 25K–150K. The firm's own pages
  show Standard/Max as a contract-size option of the one Prime plan, so it is one program
  per size with both contract caps in Scaling.
- Lucid Trading: LucidFlex 25K–150K — matches.
- Apex Trader Funding: Standard EOD and No Activation EOD, each 25K–150K. The firm's
  "No Activation Fee Evaluations" article says both follow the same rules; only the PA
  activation fee differs, so one program per size.
- BluSky: not listed ("unlisted firm"); sizes from the firm's Propel article only.

## Top One Futures — Elite Daily 25k, 50k, 100k, 150k

Elite Daily V2 (launched 5/11/26), all sizes per article:

- https://help.toponefutures.com/en/articles/15056075-elite-daily-v2-overview — all eval and funded parameters, resets, purchase limits
- https://help.toponefutures.com/en/articles/13904722-elite-daily-v2-max-loss-limit-mll
- https://help.toponefutures.com/en/articles/15056446-elite-daily-v2-daily-payout-rules — caps, buffers, 50% rule, 5 payouts to live
- https://help.toponefutures.com/en/articles/13904824-elite-daily-v2-contract-scaling-plan
- https://help.toponefutures.com/en/articles/13904852-elite-daily-v2-news-trading-rule-funded-only
- https://help.toponefutures.com/en/articles/15056388-elite-daily-v2-daily-loss-limit-dll-evaluation-phase
- https://help.toponefutures.com/en/articles/13904706-elite-daily-v2-daily-loss-limit-dll-funded-phase
- https://help.toponefutures.com/en/articles/15056475-elite-daily-v2-40-consistency-target-evaluation-only
- https://help.toponefutures.com/en/articles/13904734-elite-daily-v2-profit-target-evaluation — no minimum days
- https://help.toponefutures.com/en/articles/13904864-elite-daily-v2-maximum-account-rules
- https://help.toponefutures.com/en/articles/17635087-no-daily-loss-limit-add-on-trade-without-daily-limits
- https://help.toponefutures.com/en/articles/11680891-copy-trading-policy
- https://help.toponefutures.com/en/articles/10907901-can-i-hold-trades-overnight
- https://help.toponefutures.com/en/articles/11165893-trading-hours-at-top-one-futures — 4:10 PM EST
- https://help.toponefutures.com/en/articles/10907989-inactivity-rule-explained — 14 days
- https://help.toponefutures.com/en/articles/10907367-maximum-payout-until-live-explained
- https://help.toponefutures.com/en/articles/11003130-path-to-trading-live
- https://help.toponefutures.com/en/articles/10907920-can-i-use-ea-s-bots
- https://www.toponefutures.com — checkout links for 25/50/100/150

Conflict kept as text: max 5 funded accounts per trader (overview) vs max 5 Elite Daily
accounts per household including evaluations (account rules).

## BluSky — Propel 25k, 50k, 100k, 150k, 200k, 300k

All sizes per article.

- https://help.blusky.pro/en/articles/16300862-propel-plans-phases-rules-and-costs — all six sizes: eval, Buffer Zone, Sim Funded, consistency, resets
- https://help.blusky.pro/en/articles/12434059-evaluation-rules — 34%/21%, news, 4:45 PM close
- https://help.blusky.pro/en/articles/12433943-multiple-accounts-copy-trading — copier allowed, 3 Sim Funded
- https://help.blusky.pro/en/articles/17297032-sim-funded-accounts-rules — payout caps, $10k Brokerage Review, Bonus Vault/buyout (from 2026-10-01)
- https://help.blusky.pro/en/articles/12292284-sim-funded-payouts — 90/10, minimum balance table

150k, 200k and 300k Propel use a static drawdown, so their tag is "Static" instead of
"EOD". Conflict kept as text: Sim Funded starting balance with $100 minimum balance
(Propel article) vs $26,500 / $53,000 / $103,500 minimum balance (Sim Funded payouts
article, 25k–100k only). Consistency on Propel Sim Funded is not stated.

## Funded Futures Family — Prime 25k, 50k, 100k, 150k

All sizes per article.

- https://intercom.help/funded-futures-family/en/articles/15657092-prime-evaluation-account
- https://intercom.help/funded-futures-family/en/articles/15705476-prime-funded-account
- https://intercom.help/funded-futures-family/en/articles/15715050-prime-payout-requirements — 90/10, buffer, caps, 3 days between requests
- https://intercom.help/funded-futures-family/en/articles/15808673-prime-consistency
- https://intercom.help/funded-futures-family/en/articles/15808767-prime-drawdown
- https://intercom.help/funded-futures-family/en/articles/16302640-prime-scaling-plan
- https://intercom.help/funded-futures-family/en/articles/15892350-permitted-times-to-trade — 4:45 PM EST
- https://intercom.help/funded-futures-family/en/articles/15892353-news-trading-policy
- https://intercom.help/funded-futures-family/en/articles/15892413-bots-algorithmic-trading-policy
- https://intercom.help/funded-futures-family/en/articles/15892419-micro-scalping-policy
- https://intercom.help/funded-futures-family/en/articles/15892427-maximum-account-idle-time
- https://intercom.help/funded-futures-family/en/articles/15695739-how-many-accounts-per-household
- https://intercom.help/funded-futures-family/en/articles/15880840-professional-stage-structure
- https://fundedfuturesfamily.com/faq/ — 90/10, no activation fee

Changed from the old 50k data: split 90% (was 100% on the first $10k), 1 minimum day (was
7), payouts every 3 trading days with caps. Copy trading is not stated on the firm's pages;
the old "unauthorized copy trading prohibited" could not be confirmed and was dropped.

## Lucid Trading — LucidFlex 25k, 50k, 100k, 150k

All sizes per article.

The website blocks non-browser clients and was read in Chrome; the help center was read
directly.

- https://support.lucidtrading.com/en/articles/16226050-lucidflex-customization — DLL on/off, 40%/50%
- https://support.lucidtrading.com/en/articles/12945790-lucidflex-evaluation-account
- https://support.lucidtrading.com/en/articles/12945795-lucidflex-funded-account
- https://support.lucidtrading.com/en/articles/12945796-lucidflex-payouts
- https://support.lucidtrading.com/en/articles/12945805-lucidflex-consistency-percentage
- https://support.lucidtrading.com/en/articles/12945808-lucidflex-scaling-plan
- https://support.lucidtrading.com/en/articles/12945815-lucidflex-drawdown
- https://support.lucidtrading.com/en/articles/16558826-new-live-structure
- https://support.lucidtrading.com/en/articles/11404729-allowed-trading-times
- https://support.lucidtrading.com/en/articles/11404632-inactivity-policy
- https://support.lucidtrading.com/en/articles/11404728-other-trading-activities — news, copiers
- https://support.lucidtrading.com/en/articles/11404617-maximum-number-of-accounts
- https://support.lucidtrading.com/en/articles/11404742-prohibited-microscalping
- https://lucidtrading.com — Flex tab: DLL amounts $600 / $1,200 / $1,800 / $2,700

The DLL is a checkout choice with no stated default, so the "No DLL" tag was removed.
Conflict kept as text: payout max "50% of profit" (table) vs "50% of their account
balance" (one sentence).

## Apex Trader Funding — 25k, 50k, 100k, 150k EOD

Help center read through its public WordPress REST API in Chrome (the site blocks
non-browser clients). Each article is at `https://apextraderfunding.com/wp-json/wp/v2/help-center/<id>`;
all sizes per article:

- https://apextraderfunding.com/wp-json/wp/v2/help-center/32338 — EOD Evaluations: targets, drawdown, DLL, contracts, 30-day access
- https://apextraderfunding.com/wp-json/wp/v2/help-center/32368 — EOD Performance Accounts (PA): drawdown, max contracts, 20 PAs, 100% split
- https://apextraderfunding.com/wp-json/wp/v2/help-center/32416 — EOD Payouts: 5 qualifying days, safety net, max payouts 1–6
- https://apextraderfunding.com/wp-json/wp/v2/help-center/32337 — Scaling Levels (PA) Explained: tiers for contracts and DLL
- https://apextraderfunding.com/wp-json/wp/v2/help-center/42663 — No Activation Fee Evaluations: same rules, $0 activation
- https://apextraderfunding.com/wp-json/wp/v2/help-center/32413 — Inactivity Policy on PAs
- https://apextraderfunding.com/wp-json/wp/v2/help-center/32507 — Prohibited Activities: news trading
- https://apextraderfunding.com/wp-json/wp/v2/help-center/42455 — Apex Live Prop Trading Program FAQ: invitation, 90/10, no overnight
- https://apextraderfunding.com/wp-json/wp/v2/help-center/32424 — Tradovate Group Copier
- https://apextraderfunding.com/wp-json/wp/v2/help-center/32521 — Legacy PA Compliance: no AI/automation/HFT

Overnight holding is only stated in the live program FAQ; no explicit Evaluation/PA rule
was found, which the field says.
