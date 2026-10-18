# Account rules are entered per account, not curated per program

Rule warnings for a linked account read numeric rule values that the user enters when
linking the account to a prop firm program; the program's rule text is shown beside each
field as reference only. We chose this over curated numeric columns per program because
`context/PropFirmsData.md` states rules as text with conflicts between a firm's own pages
("40% per FAQ / 51% per app"), so extracting a number would mean interpreting the rule,
and because an account keeps the rules it was bought under even after the firm changes
the program.

## Consequences

- Re-seeding prop firm programs never moves an existing account's rule status.
- Rules the data cannot check honestly, such as intraday trailing drawdown, are shown as
  not checkable instead of approximated.
