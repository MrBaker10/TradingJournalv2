# Prop firm data stays current through a manual data refresh; discontinued programs are marked, not deleted

Prop firm rules change when firms change them, and the catalogue is only worth reading if
it matches the firms' own pages. We keep it current with a data refresh that runs without
any AI subscription: the user runs a script once a month that reports which pages on each
firm's source list changed, updates `context/PropFirmsData.md` from those pages, seeds,
and proves with a read-only comparison that the database matches the file. AI may speed
up reading the changed pages, never replace a step. A program the firm no longer sells is
marked discontinued instead of deleted, because accounts may be linked to it and an
account bought before the change must still be linkable.

## Considered Options

- **Scheduled AI research (Claude routine):** rejected; the data would go stale the day
  the subscription ends.
- **A cron job inside the app:** rejected; it could only report, not curate, and would
  add outbound fetching and failure modes to a single-user journal.
- **Deleting discontinued programs:** rejected; a linked program cannot be deleted, and
  an unlinked one may still be needed for an account bought before the change.

## Consequences

- A program missing from the data file is discontinued, not gone: it leaves the
  catalogue, stays in the link select marked as no longer sold, and a linked account
  shows a note but keeps its account rules (ADR 0001) and rule status.
- A program rename is decided during the refresh and applied to the existing row before
  seeding, so its links stay; only a program without a successor becomes discontinued.
- A program the firm sells again is no longer discontinued. A firm with no program on
  sale leaves the catalogue.
