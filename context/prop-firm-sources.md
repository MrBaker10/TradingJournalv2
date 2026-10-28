# Prop firm sources

The official pages each data refresh checks (`docs/adr/0005`), one `## <Firm name>`
heading per firm in `PropFirmsData.md`, named exactly as there, one `- <url>` line per
page. Official pages only: firm website, help center, FAQ, terms, checkout. No review,
affiliate or community sites. `src/lib/prop-firms/sources.ts` parses this file; a test
fails when it and `PropFirmsData.md` name different firms or a URL is not https.

First filled 2026-10-28 from the research notes in `.scratch/prop-firm-sizes/`.

## Futures Elite

- https://faq.futureselite.com/en/articles/17584185-elite-rules-at-a-glance
- https://faq.futureselite.com/en/articles/17584216-elite-drawdown-daily-loss-limit-and-contracts
- https://faq.futureselite.com/en/articles/17584256-elite-checkout-options
- https://faq.futureselite.com/en/articles/17584271-elite-payouts
- https://faq.futureselite.com/en/articles/17584717-news-trading
- https://faq.futureselite.com/en/articles/17584810-trading-hours-and-the-2-price-limit-rule
- https://faq.futureselite.com/en/articles/17584626-allowed-and-prohibited-trading-practices
- https://faq.futureselite.com/en/articles/17585385-one-trader-per-household-ips-vpns-and-copiers
- https://faq.futureselite.com/en/articles/17584731-high-frequency-and-automated-trading
- https://faq.futureselite.com/en/articles/17584128-how-many-accounts-can-i-have
- https://faq.futureselite.com/en/articles/17585246-reset-fees
- https://faq.futureselite.com/en/articles/17585353-inactivity-rules
- https://faq.futureselite.com/en/articles/17585527-the-live-trading-program
- https://faq.futureselite.com/en/articles/17585223-payments-refunds-and-the-one-time-fee
- https://futureselite.com/terms-and-conditions

## Tradeify

- https://help.tradeify.co/en/articles/12853921-select-evaluation-accounts
- https://help.tradeify.co/en/articles/12853966-select-flex-and-select-daily-payout-policies
- https://help.tradeify.co/en/articles/16497699-300k-select-account
- https://help.tradeify.co/en/articles/10468321-rules-daily-loss-limit
- https://help.tradeify.co/en/articles/10495874-rules-news-trading
- https://help.tradeify.co/en/articles/10495876-rules-permitted-times-to-trade
- https://help.tradeify.co/en/articles/13196343-tradovate-order-entry-copy-trading
- https://help.tradeify.co/en/articles/10468318-guidelines-for-traders
- https://help.tradeify.co/en/articles/12268167-essential-trading-rules-overview
- https://help.tradeify.co/en/articles/12268494-common-faqs

## Take Profit Trader

- https://takeprofittraderhelp.zendesk.com/hc/en-us/articles/15169070804125-Rule-1-Hit-Your-Profit-Target
- https://takeprofittraderhelp.zendesk.com/hc/en-us/articles/15169066911133-Rule-2-Do-Not-Exceed-Maximum-Position-Size
- https://takeprofittraderhelp.zendesk.com/hc/en-us/articles/15170265979165-Rule-3-Do-Not-Hit-End-Of-Day-EOD-Maximum-Trailing-Drawdown
- https://takeprofittraderhelp.zendesk.com/hc/en-us/articles/15170347090461-Rule-4-Trade-Approved-Products-During-Approved-Hours
- https://takeprofittraderhelp.zendesk.com/hc/en-us/articles/15170316538013-Rule-5-Be-Consistent
- https://takeprofittraderhelp.zendesk.com/hc/en-us/articles/15171769361053-PRO-Account-Rules
- https://takeprofittraderhelp.zendesk.com/hc/en-us/articles/15172219527581-PRO-Account-Profit-Split-Withdrawal-Rules
- https://takeprofittraderhelp.zendesk.com/hc/en-us/articles/15172006753821-PRO-Account-Rules
- https://takeprofittraderhelp.zendesk.com/hc/en-us/articles/15171929948829-Advantages-of-PRO
- https://takeprofittraderhelp.zendesk.com/hc/en-us/articles/15171978600349-PRO-Account-Upgrade-Process-Overview-and-Guidelines
- https://takeprofittraderhelp.zendesk.com/hc/en-us/articles/36429526878237-PRO-Development-Accounts
- https://takeprofittraderhelp.zendesk.com/hc/en-us/articles/34431176505245-Trade-Copier-Policy
- https://takeprofittraderhelp.zendesk.com/hc/en-us/articles/15172695563933-Rules-for-Multiple-Accounts
- https://takeprofittraderhelp.zendesk.com/hc/en-us/articles/37697356049949-Speed-of-Payouts-Update-Q-A
- https://takeprofittraderhelp.zendesk.com/hc/en-us/articles/15141145057053-Test-Subscriptions
- https://takeprofittrader.com

## My Funded Futures

- https://myfundedfutures.com/plans/rapid
- https://help.myfundedfutures.com/en/articles/14116402-rapid-plan-25k-a-comprehensive-look
- https://help.myfundedfutures.com/en/articles/13134709-rapid-plan-50k-a-comprehensive-look
- https://help.myfundedfutures.com/en/articles/13286542-rapid-plan-100k-a-comprehensive-look
- https://help.myfundedfutures.com/en/articles/13286582-rapid-plan-150k-a-comprehensive-look
- https://help.myfundedfutures.com/en/articles/13134718-understanding-rapid-live
- https://help.myfundedfutures.com/en/articles/13745661-payout-policy-overview-best-and-fastest-prop-firm-payouts
- https://help.myfundedfutures.com/en/articles/8230009-news-trading-policy
- https://help.myfundedfutures.com/en/articles/8444599-fair-play-and-prohibited-trading-practices

## FundedNext

- https://helpfutures.fundednext.com/en/articles/14283903-road-to-live-trading-legacy-challenge-rapid-challenge-former
- https://fundednext.com/futures/rapid
- https://helpfutures.fundednext.com/en/articles/17229667-what-is-fundednext-futures-rapid-pro-daily-challenge
- https://helpfutures.fundednext.com/en/articles/17229677-fundednext-futures-rapid-pro-challenge-all-rules
- https://helpfutures.fundednext.com/en/articles/17229713-fundednext-futures-rapid-pro-fundednext-account-all-rules
- https://helpfutures.fundednext.com/en/articles/17228899-what-are-the-available-account-sizes-and-their-prices-in-fundednext-futures
- https://helpfutures.fundednext.com/en/articles/17225754-what-are-the-trading-hours-in-fundednext-futures
- https://helpfutures.fundednext.com/en/articles/17225788-fundednext-futures-most-frequently-asked-questions
- https://helpfutures.fundednext.com/en/articles/17230319-what-is-copy-group-trading-policy-at-fundednext-futures
- https://helpfutures.fundednext.com/en/articles/17225812-how-many-accounts-can-i-hold-with-fundednext-futures-and-what-is-the-maximum-allocation-available
- https://helpfutures.fundednext.com/en/articles/17228935-is-there-any-inactivity-period-in-fundednext-futures
- https://helpfutures.fundednext.com/en/articles/16522296-road-to-live-trading-rapid-flex-direct

## Top One Futures

- https://help.toponefutures.com/en/articles/15056075-elite-daily-v2-overview
- https://help.toponefutures.com/en/articles/13904722-elite-daily-v2-max-loss-limit-mll
- https://help.toponefutures.com/en/articles/15056446-elite-daily-v2-daily-payout-rules
- https://help.toponefutures.com/en/articles/13904824-elite-daily-v2-contract-scaling-plan
- https://help.toponefutures.com/en/articles/13904852-elite-daily-v2-news-trading-rule-funded-only
- https://help.toponefutures.com/en/articles/15056388-elite-daily-v2-daily-loss-limit-dll-evaluation-phase
- https://help.toponefutures.com/en/articles/13904706-elite-daily-v2-daily-loss-limit-dll-funded-phase
- https://help.toponefutures.com/en/articles/15056475-elite-daily-v2-40-consistency-target-evaluation-only
- https://help.toponefutures.com/en/articles/13904734-elite-daily-v2-profit-target-evaluation
- https://help.toponefutures.com/en/articles/13904864-elite-daily-v2-maximum-account-rules
- https://help.toponefutures.com/en/articles/17635087-no-daily-loss-limit-add-on-trade-without-daily-limits
- https://help.toponefutures.com/en/articles/11680891-copy-trading-policy
- https://help.toponefutures.com/en/articles/10907901-can-i-hold-trades-overnight
- https://help.toponefutures.com/en/articles/11165893-trading-hours-at-top-one-futures
- https://help.toponefutures.com/en/articles/10907989-inactivity-rule-explained
- https://help.toponefutures.com/en/articles/10907367-maximum-payout-until-live-explained
- https://help.toponefutures.com/en/articles/11003130-path-to-trading-live
- https://help.toponefutures.com/en/articles/10907920-can-i-use-ea-s-bots
- https://www.toponefutures.com

## BluSky

- https://help.blusky.pro/en/articles/16300862-propel-plans-phases-rules-and-costs
- https://help.blusky.pro/en/articles/12434059-evaluation-rules
- https://help.blusky.pro/en/articles/12433943-multiple-accounts-copy-trading
- https://help.blusky.pro/en/articles/17297032-sim-funded-accounts-rules
- https://help.blusky.pro/en/articles/12292284-sim-funded-payouts

## Funded Futures Family

- https://intercom.help/funded-futures-family/en/articles/15657092-prime-evaluation-account
- https://intercom.help/funded-futures-family/en/articles/15705476-prime-funded-account
- https://intercom.help/funded-futures-family/en/articles/15715050-prime-payout-requirements
- https://intercom.help/funded-futures-family/en/articles/15808673-prime-consistency
- https://intercom.help/funded-futures-family/en/articles/15808767-prime-drawdown
- https://intercom.help/funded-futures-family/en/articles/16302640-prime-scaling-plan
- https://intercom.help/funded-futures-family/en/articles/15892350-permitted-times-to-trade
- https://intercom.help/funded-futures-family/en/articles/15892353-news-trading-policy
- https://intercom.help/funded-futures-family/en/articles/15892413-bots-algorithmic-trading-policy
- https://intercom.help/funded-futures-family/en/articles/15892419-micro-scalping-policy
- https://intercom.help/funded-futures-family/en/articles/15892427-maximum-account-idle-time
- https://intercom.help/funded-futures-family/en/articles/15695739-how-many-accounts-per-household
- https://intercom.help/funded-futures-family/en/articles/15880840-professional-stage-structure
- https://fundedfuturesfamily.com/faq/

## Lucid Trading

- https://support.lucidtrading.com/en/articles/16226050-lucidflex-customization
- https://support.lucidtrading.com/en/articles/12945790-lucidflex-evaluation-account
- https://support.lucidtrading.com/en/articles/12945795-lucidflex-funded-account
- https://support.lucidtrading.com/en/articles/12945796-lucidflex-payouts
- https://support.lucidtrading.com/en/articles/12945805-lucidflex-consistency-percentage
- https://support.lucidtrading.com/en/articles/12945808-lucidflex-scaling-plan
- https://support.lucidtrading.com/en/articles/12945815-lucidflex-drawdown
- https://support.lucidtrading.com/en/articles/16558826-new-live-structure
- https://support.lucidtrading.com/en/articles/11404729-allowed-trading-times
- https://support.lucidtrading.com/en/articles/11404632-inactivity-policy
- https://support.lucidtrading.com/en/articles/11404728-other-trading-activities
- https://support.lucidtrading.com/en/articles/11404617-maximum-number-of-accounts
- https://support.lucidtrading.com/en/articles/11404742-prohibited-microscalping
- https://lucidtrading.com

## Apex Trader Funding

- https://apextraderfunding.com/wp-json/wp/v2/help-center/32338
- https://apextraderfunding.com/wp-json/wp/v2/help-center/32368
- https://apextraderfunding.com/wp-json/wp/v2/help-center/32416
- https://apextraderfunding.com/wp-json/wp/v2/help-center/32337
- https://apextraderfunding.com/wp-json/wp/v2/help-center/42663
- https://apextraderfunding.com/wp-json/wp/v2/help-center/32413
- https://apextraderfunding.com/wp-json/wp/v2/help-center/32507
- https://apextraderfunding.com/wp-json/wp/v2/help-center/42455
- https://apextraderfunding.com/wp-json/wp/v2/help-center/32424
- https://apextraderfunding.com/wp-json/wp/v2/help-center/32521

## Goat Funded Futures

- https://help.goatfundedfutures.com/eod-challenge.html
- https://help.goatfundedfutures.com/payouts.html
- https://help.goatfundedfutures.com/drawdown.html
- https://help.goatfundedfutures.com/trading-rules.html
- https://help.goatfundedfutures.com/path-to-live.html
- https://goatfundedfutures.com

## Legends Trading

- https://thelegendstrading.com/plans
- https://knowledge.thelegendstrading.com/en/articles/12720898-simplified-evaluation-structure
- https://knowledge.thelegendstrading.com/en/articles/12720935-transition-to-master-account
- https://knowledge.thelegendstrading.com/en/articles/12720972-elite-evaluation-stage-rules
- https://knowledge.thelegendstrading.com/en/articles/12720988-elite-master-account-stage-rules
- https://knowledge.thelegendstrading.com/en/articles/14062306-are-there-trading-activity-requirements-for-elite-accounts
- https://knowledge.thelegendstrading.com/en/articles/12727929-payout-request-window
- https://knowledge.thelegendstrading.com/en/articles/12721028-payout-eligibility
- https://knowledge.thelegendstrading.com/en/articles/12721087-payout-limits-and-caps
- https://knowledge.thelegendstrading.com/en/articles/12721156-consistency-in-the-master-account-stage
- https://knowledge.thelegendstrading.com/en/articles/12724860-scaling-plan-overview
- https://knowledge.thelegendstrading.com/en/articles/12725163-key-notes-about-scaling
- https://knowledge.thelegendstrading.com/en/articles/13199020-who-qualifies-for-the-live-program
- https://knowledge.thelegendstrading.com/en/articles/13199072-what-are-the-live-funding-amounts
- https://knowledge.thelegendstrading.com/en/articles/13199115-when-is-swing-trading-allowed
- https://knowledge.thelegendstrading.com/en/articles/12092109-prohibited-conduct
- https://knowledge.thelegendstrading.com/en/articles/12099699-frequently-asked-questions-faqs
- https://knowledge.thelegendstrading.com/en/articles/12092006-end-of-day-liquidation-times

## E8 Markets

- https://e8markets.com/futures
- https://helpfutures.e8markets.com/en/articles/11755943-e8-signature
- https://helpfutures.e8markets.com/en/articles/11940573-payout-caps-and-buffers-for-e8-signature-explained
- https://helpfutures.e8markets.com/en/articles/13106558-all-product-overviews-e8-one-vs-e8-zero-vs-e8-pro-vs-e8-signature
- https://helpfutures.e8markets.com/en/articles/11969807-daily-pause
- https://helpfutures.e8markets.com/en/articles/11864596-eod-dynamic-drawdown
- https://helpfutures.e8markets.com/en/articles/10149596-can-i-hold-positions-overnight
- https://helpfutures.e8markets.com/en/articles/10209321-can-i-trade-news
- https://helpfutures.e8markets.com/en/articles/9453469-can-i-copy-trades-or-trade-as-a-team
- https://helpfutures.e8markets.com/en/articles/5515039-how-many-accounts-can-i-apply-for-at-once
- https://helpfutures.e8markets.com/en/articles/9453425-is-there-any-inactivity-rule
- https://helpfutures.e8markets.com/en/articles/11865587-35-best-day-rule
- https://helpfutures.e8markets.com/en/articles/9448349-what-is-payout-on-demand
- https://helpfutures.e8markets.com/en/articles/15272556-everything-about-payouts-when-how-how-fast
- https://helpfutures.e8markets.com/en/articles/10155917-max-available-contract-sizes

## TradeDay

- https://www.tradeday.com
- https://tradeday.freshdesk.com/en/support/solutions/articles/103000008847
- https://tradeday.freshdesk.com/en/support/solutions/articles/103000008855
- https://tradeday.freshdesk.com/en/support/solutions/articles/103000008849
- https://tradeday.freshdesk.com/en/support/solutions/articles/103000008850
- https://tradeday.freshdesk.com/en/support/solutions/articles/103000081072
- https://tradeday.freshdesk.com/en/support/solutions/articles/103000018874
- https://tradeday.freshdesk.com/en/support/solutions/articles/103000354796
- https://tradeday.freshdesk.com/en/support/solutions/articles/103000121031
- https://tradeday.freshdesk.com/en/support/solutions/articles/103000008889
- https://tradeday.freshdesk.com/en/support/solutions/articles/103000335937
- https://tradeday.freshdesk.com/en/support/solutions/articles/103000262630
- https://tradeday.freshdesk.com/en/support/solutions/articles/103000250682
- https://tradeday.freshdesk.com/en/support/solutions/articles/103000353468
- https://tradeday.freshdesk.com/en/support/solutions/articles/103000180686
- https://tradeday.freshdesk.com/en/support/solutions/articles/103000089243
- https://tradeday.freshdesk.com/en/support/solutions/articles/103000008899

## The Trading Pit

- https://www.thetradingpit.com/futures
- https://support.thetradingpit.com/futures-prime-reward-new-policy
- https://support.thetradingpit.com/prime-futures-challenges-compared-classic-futures-challenges
- https://support.thetradingpit.com/latest-40-consistency-policy-for-futures-prime-challenges
- https://support.thetradingpit.com/what-is-the-minimum-profitable-days-requirement-for-the-cfds-prime-challenge-0-0-0
- https://support.thetradingpit.com/how-does-the-daily-pause-work-on-futures-prime-accounts
- https://support.thetradingpit.com/what-is-max-drawdown-trailing-on-eod-end-of-day-balance
- https://support.thetradingpit.com/can-i-leave-positions-open-overnight-in-futures-challenges
- https://support.thetradingpit.com/is-news-trading-allowed-1-0-0
- https://support.thetradingpit.com/is-copy-trading-allowed-1
- https://support.thetradingpit.com/inactivity-breach-policy-0-0
- https://support.thetradingpit.com/is-hedging-allowed-0-0
- https://support.thetradingpit.com/prohibited-trading-practices
- https://support.thetradingpit.com/what-is-the-minimum-and-maximum-number-of-contracts-i-can-trade
