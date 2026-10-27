# Trading-Journal

A private journal for prop-firm futures traders that rewards consistent journaling,
never profit.

## People

**User**:
The person who signs in and owns a journal; deleting the user deletes everything they logged.
_Avoid_: Account, profile, login

## Entries

**Trade**:
One execution decision, taken or missed, logged with its prices, times, tags and notes.
_Avoid_: Position, order, fill

**Taken trade**:
A trade that was actually executed and feeds every P&L, win rate and R figure.

**Missed setup**:
A trade that was recognised but not executed; it counts for streak and badges and never for P&L, win rate or R.
_Avoid_: Skipped trade, missed trade

**Trading strategy**:
A user's reusable trading approach, expressed as rules for when and how to enter, manage and exit a trade.
_Avoid_: Setup type, entry model, pre-market plan

**Strategy revision**:
A recorded rule set of a trading strategy, preserved so past trades can be reviewed against the rules assigned to them.
_Avoid_: Strategy copy, current rules

**By the book**:
The trader's assessment of whether a taken trade followed its assigned trading strategy, or their own trading rules when no strategy is assigned.

**Confluence**:
A tagged reason supporting a trade, grouped into a fixed taxonomy.

**Mistake**:
A tagged execution error on a trade, from a fixed list.

**Chart clock**:
The wall-clock time the trader reads off their chart, in which entry and exit times are recorded.
_Avoid_: Local time, broker time

**Trade date**:
The calendar date of a trade on the chart clock; the journal and the calendar group entries by it, with no Sunday roll.
_Avoid_: Trading day (that one rolls Sunday onto Monday)

**Import batch**:
The set of trades created by one CSV import, undoable as a unit.

## Accounts

**Account**:
A trading account the user names themselves, to which trades are assigned.
_Avoid_: Broker account, portfolio

**Real account**:
An account that is not a practice account; only real accounts feed combined figures.
_Avoid_: Live account, funded account

**Practice account**:
An account flagged as practice, excluded from every combined figure and visible only when selected on its own.
_Avoid_: Demo account, backtest account

**Copy trade**:
A single trade assigned to several accounts because the same execution ran on each.

**Default account**:
The account preselected for new trades.

## Progress

**Trading day**:
The day an entry belongs to: its trade date, with a Sunday rolling onto the following Monday. A Saturday belongs to no trading day for streaks; for account rules it rolls onto Monday too, so its P&L stays in the balance.
_Avoid_: Session day, calendar day

**Logged day**:
A trading day with at least one entry, taken or missed. Backfilled entries count too, except in the streak.

**Streak**:
The run of consecutive logged days, skipping Saturdays and tolerating one grace day per month. Only entries logged within 48 hours of their trade date count towards it.

**Grace day**:
The one skipped weekday per calendar month that does not break a streak.

**Process metric**:
A figure measuring journaling discipline: streak, consistency score, badges, by-the-book rate and review habit. It may be rewarded.
_Avoid_: Process value, habit stat

**Money metric**:
A figure derived from P&L, such as net P&L, average winner and loser, expectancy or drawdown. It is shown, never rewarded.
_Avoid_: Performance metric, result

**Process moment**:
The instant a process metric improves, such as a badge unlocking, a streak extending or a weekly review being completed.
_Avoid_: Win, achievement, celebration

**Consistency score**:
A monthly score out of 100 for showing up, journaling completeness, plan adherence and review habit; never for results.

**Badge**:
A personal milestone for journaling behaviour, never for profit.

**Pre-market plan**:
The daily note written before trading, optionally followed by an end-of-day review.

**Checklist template**:
The user's reusable list of routine steps, grouped into three fixed phases: pre-market, trading and day review. It is independent of trading strategies.
_Avoid_: Rulebook, routine, strategy checklist

**Daily checklist**:
One day's copy of the checklist template, ticked off by hand; it records whether each step was done, feeds neither streak, consistency score nor badges, and is never evaluated as rule adherence.
_Avoid_: Daily rules, adherence log, pre-market plan

## Prop firms

**Prop firm**:
A funding company whose evaluation and funded rules the app documents.

**Prop firm program**:
One rule set a prop firm sells, for one product line at one account size; each size of a product line is its own program.
_Avoid_: Plan, challenge, variant

**Product line**:
The name under which a prop firm sells a family of programs that differ by account size.
_Avoid_: Program type, plan, tier

**Linked account**:
A real account tied to one prop firm program, carrying the rule values the user entered for it.
_Avoid_: Prop account, challenge account

**Account rules**:
The rule values a linked account was bought under, entered by the user and unaffected by later changes to the program.
_Avoid_: Program rules, firm rules

**Attempt**:
The period of a linked account from its evaluation start, or from its latest reset, until now.
_Avoid_: Run, try, challenge

**Rule status**:
How a linked account's current attempt stands against its account rules: ok, close or breached.
_Avoid_: Alert, alarm

## Reviews

**Review week**:
Sunday to Friday in the user's timezone; Sunday opens the new week.

**Weekly review**:
The user's written look back at one review week, beside a read-only summary of that week.
_Avoid_: Weekly report, recap

## Ledger

**Ledger entry**:
A real-money movement of the user's prop trading business, optionally tied to one real account.
_Avoid_: Transaction, cost, booking

**Expense**:
A ledger entry for money paid out, in one fixed category: evaluation, reset, activation, subscription, data or other.
_Avoid_: Fee, cost

**Payout**:
A ledger entry for money a prop firm paid to the user.
_Avoid_: Withdrawal, profit

**Ledger net**:
Payouts minus expenses; real money, never combined with trading P&L.
_Avoid_: Profit, business P&L
