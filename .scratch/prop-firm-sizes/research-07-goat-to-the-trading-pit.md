# Research: sizes for Goat Funded Futures, Legends Trading, E8 Markets, TradeDay, The Trading Pit

Ticket: `issues/07-sizes-goat-to-the-trading-pit.md`. Checked 2026-10-22. Values come from
firm-owned pages only (website, help center, FAQ). propfirmmatch.com served as a size
checklist (spec, Data collection); no value was taken from it.

Program names follow each firm's website (user decision 2026-10-22), so four existing 50k
names change: Goat "50k EOD" → "EOD 50k", Legends "Elite Master 50k" → "50k Elite", E8
"Signature Futures 50k" → "E8 Signature 50k", TradeDay "50k EOD" → "Quick Pay EOD 50k".
"Futures Prime 50k" already matches.

## Completeness check against propfirmmatch.com (2026-10-22)

From each firm's `/futures/prop-firms/<slug>/challenges` table (all pages):

- Goat Funded Futures: EOD 50K/100K/150K — matches the help center. Flex, Goat Daily,
  1-Day Pass, Instant Lite and Instant Classic are other product lines (out of scope).
- Legends Trading: not listed; sizes from the firm's plans page (Elite 25k–150k).
- E8 Futures: E8 Signature 25K/50K/100K/150K — matches. E8 Zero Starter/Max out of scope.
- TradeDay: Quick Pay EOD, Quick Pay Intraday and Fast Pass EOD, each 25K–150K. The old
  "50k EOD" (daily payouts, no cap, 30% eval-only consistency) is Quick Pay EOD; Intraday
  and Fast Pass are other product lines (out of scope).
- The Trading Pit Futures: Futures Prime 50K/100K/150K — matches. Futures Instant out of
  scope.

## Goat Funded Futures — EOD 50k, 100k, 150k

All sizes per article. Plain HTML help center, read with WebFetch.

- https://help.goatfundedfutures.com/eod-challenge.html — all eval and funded values per size, payout caps, overnight, inactivity
- https://help.goatfundedfutures.com/payouts.html — winning days, request windows, 50% rule, 80/20 + 90/10 add-on, processing fee
- https://help.goatfundedfutures.com/drawdown.html — EOD trailing, lock at starting balance, funded DLL soft breach
- https://help.goatfundedfutures.com/trading-rules.html — news, 15:55 CT close, copy trading, EAs, holding-time deductions
- https://help.goatfundedfutures.com/path-to-live.html
- https://goatfundedfutures.com — plan overview, $0 activation

Changed from the old 50k data: target $3,000 (was $2,000), drawdown $2,000 (was $1,250),
80% default split (was 90%), no minimum days (was 7), funded DLL 2.5% (was none).

## Legends Trading — Elite 25k, 50k, 100k, 150k

The firm is at thelegendstrading.com (legendstrading.com is an unrelated education site).
Plans page read in Chrome; help center (Cloudflare check passed by waiting) read in Chrome.
All sizes per article:

- https://thelegendstrading.com/plans — Elite tab: targets, drawdown, contracts, no DLL, 40%, no activation fee; "up to twice per month"; 90/10
- https://knowledge.thelegendstrading.com/en/articles/12720898-simplified-evaluation-structure
- https://knowledge.thelegendstrading.com/en/articles/12720935-transition-to-master-account — buffer, Master DLL, cap, Tier-1 news, 5 Master accounts
- https://knowledge.thelegendstrading.com/en/articles/12720972-elite-evaluation-stage-rules
- https://knowledge.thelegendstrading.com/en/articles/12720988-elite-master-account-stage-rules
- https://knowledge.thelegendstrading.com/en/articles/14062306-are-there-trading-activity-requirements-for-elite-accounts
- https://knowledge.thelegendstrading.com/en/articles/12727929-payout-request-window — no window
- https://knowledge.thelegendstrading.com/en/articles/12721028-payout-eligibility — winning-day minimums
- https://knowledge.thelegendstrading.com/en/articles/12721087-payout-limits-and-caps
- https://knowledge.thelegendstrading.com/en/articles/12721156-consistency-in-the-master-account-stage
- https://knowledge.thelegendstrading.com/en/articles/12724860-scaling-plan-overview
- https://knowledge.thelegendstrading.com/en/articles/12725163-key-notes-about-scaling — DLL unlocks next session
- https://knowledge.thelegendstrading.com/en/articles/13199020-who-qualifies-for-the-live-program
- https://knowledge.thelegendstrading.com/en/articles/13199072-what-are-the-live-funding-amounts
- https://knowledge.thelegendstrading.com/en/articles/13199115-when-is-swing-trading-allowed
- https://knowledge.thelegendstrading.com/en/articles/12092109-prohibited-conduct
- https://knowledge.thelegendstrading.com/en/articles/12099699-frequently-asked-questions-faqs — 35% rule (conflict)
- https://knowledge.thelegendstrading.com/en/articles/12092006-end-of-day-liquidation-times

Conflicts kept as text: payout timing (any time vs twice per month); funded consistency
(40% of total profit vs 35% of the profit target in the FAQ). Copy trading is not stated.
The old 50k scaling text mixed the columns of the scaling table; corrected per size.

## E8 Markets — E8 Signature 25k, 50k, 100k, 150k

e8markets.com/futures returned an unreadable response in Chrome; the futures help center
was read in Chrome. All sizes per article:

- https://helpfutures.e8markets.com/en/articles/11755943-e8-signature — targets, drawdown, daily pause, payouts, contracts, news, copy trading, 23:00 server-time close
- https://helpfutures.e8markets.com/en/articles/11940573-payout-caps-and-buffers-for-e8-signature-explained — futures caps before/after 2026-10-01, max payouts
- https://helpfutures.e8markets.com/en/articles/13106558-all-product-overviews-e8-one-vs-e8-zero-vs-e8-pro-vs-e8-signature — EAs not on futures, no overnight
- https://helpfutures.e8markets.com/en/articles/11969807-daily-pause
- https://helpfutures.e8markets.com/en/articles/11864596-eod-dynamic-drawdown
- https://helpfutures.e8markets.com/en/articles/10149596-can-i-hold-positions-overnight — 15:10 CT
- https://helpfutures.e8markets.com/en/articles/10209321-can-i-trade-news
- https://helpfutures.e8markets.com/en/articles/9453469-can-i-copy-trades-or-trade-as-a-team
- https://helpfutures.e8markets.com/en/articles/5515039-how-many-accounts-can-i-apply-for-at-once
- https://helpfutures.e8markets.com/en/articles/9453425-is-there-any-inactivity-rule — 7 days for futures
- https://helpfutures.e8markets.com/en/articles/11865587-35-best-day-rule
- https://helpfutures.e8markets.com/en/articles/9448349-what-is-payout-on-demand
- https://helpfutures.e8markets.com/en/articles/15272556-everything-about-payouts-when-how-how-fast
- https://helpfutures.e8markets.com/en/articles/10155917-max-available-contract-sizes

Current purchases (futures bought from 2026-10-01 17:00 UTC) carry a $4,000 drawdown on
150k, 4 payouts per account and the lower cap table; the older values are noted in the
fields. Conflicts kept as text: daily close (15:10 CT vs 23:00 server time); inactivity
(7 days vs 60 days). Changed from the old 50k data: EOD dynamic drawdown, not static (tag
"EOD" instead of "Static"); overnight not allowed (was "allowed"); copy trading between
own accounts allowed.

## TradeDay — Quick Pay EOD 25k, 50k, 100k, 150k

All sizes per article.

- https://www.tradeday.com — Quick Pay EOD table (targets, drawdown, position limits, 30%, 5 days), funded parameters, 50/50 below $4k then 80/20
- https://tradeday.freshdesk.com/en/support/solutions/articles/103000008847 — Quick Pay / Fast Pass objectives
- https://tradeday.freshdesk.com/en/support/solutions/articles/103000008855 — EOD vs intraday drawdown, freeze at starting balance
- https://tradeday.freshdesk.com/en/support/solutions/articles/103000008849 — consistency raises the target
- https://tradeday.freshdesk.com/en/support/solutions/articles/103000008850 — minimum days
- https://tradeday.freshdesk.com/en/support/solutions/articles/103000081072 — Tier-1 auto-liquidation
- https://tradeday.freshdesk.com/en/support/solutions/articles/103000018874 — 3:50 PM CT liquidation, no holding into the close
- https://tradeday.freshdesk.com/en/support/solutions/articles/103000354796 — account limits, copier from own account, hedging
- https://tradeday.freshdesk.com/en/support/solutions/articles/103000121031 — prohibited practices, 200 trades/day
- https://tradeday.freshdesk.com/en/support/solutions/articles/103000008889 — Quick Pay Funded Sim uses intraday drawdown, 2% price-limit rule
- https://tradeday.freshdesk.com/en/support/solutions/articles/103000335937 — Quick Pay payout policy
- https://tradeday.freshdesk.com/en/support/solutions/articles/103000262630 — payout request, "Buffer Zone" (conflict)
- https://tradeday.freshdesk.com/en/support/solutions/articles/103000250682 — withdrawals at positive balance
- https://tradeday.freshdesk.com/en/support/solutions/articles/103000353468 — $10,000 gross profit review
- https://tradeday.freshdesk.com/en/support/solutions/articles/103000180686 — Funded Live 90/10, market data fee
- https://tradeday.freshdesk.com/en/support/solutions/articles/103000089243 — slippage buffer per size
- https://tradeday.freshdesk.com/en/support/solutions/articles/103000008899 — 30-day dormancy

No split tag: the split depends on the account's current profit (50% below $4,000, 80%
above). Conflict kept as text: first payout at any positive balance vs after clearing the
Buffer Zone. Changed from the old 50k data: split model (was 80→90→95% lifetime), Quick Pay
Funded Sim drawdown is intraday.

## The Trading Pit — Futures Prime 50k, 100k, 150k

Website read in Chrome (WebFetch first); help center read in Chrome. All sizes per article:

- https://www.thetradingpit.com/futures — targets, drawdown, daily pause, contracts, 30 days, earning-phase scaling, reward caps, every 7 days
- https://support.thetradingpit.com/futures-prime-reward-new-policy — 5 days of $150, 50% rule, caps
- https://support.thetradingpit.com/prime-futures-challenges-compared-classic-futures-challenges — 10 days of $200 (conflict), activation fee
- https://support.thetradingpit.com/latest-40-consistency-policy-for-futures-prime-challenges
- https://support.thetradingpit.com/what-is-the-minimum-profitable-days-requirement-for-the-cfds-prime-challenge-0-0-0 — 3 days
- https://support.thetradingpit.com/how-does-the-daily-pause-work-on-futures-prime-accounts
- https://support.thetradingpit.com/what-is-max-drawdown-trailing-on-eod-end-of-day-balance
- https://support.thetradingpit.com/can-i-leave-positions-open-overnight-in-futures-challenges — 14:55 CT
- https://support.thetradingpit.com/is-news-trading-allowed-1-0-0
- https://support.thetradingpit.com/is-copy-trading-allowed-1
- https://support.thetradingpit.com/inactivity-breach-policy-0-0 — 21 days
- https://support.thetradingpit.com/is-hedging-allowed-0-0
- https://support.thetradingpit.com/prohibited-trading-practices — product rules take precedence
- https://support.thetradingpit.com/what-is-the-minimum-and-maximum-number-of-contracts-i-can-trade

Changed from the old 50k data: daily pause exists ("No DLL" tag removed), 3 minimum days
(was 0), 40% consistency in the challenge only ("No funded consistency" tag added), payout
rules and caps confirmed. Conflict kept as text: first reward after 5 days of $150 vs 10
days of $200. No maximum account count was found.
