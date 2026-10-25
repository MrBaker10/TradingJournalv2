# Preserve the rules assigned to a trade

A trader may change a strategy after reviewing trades against its rules. Existing
trade assignments retain their historical rule set; later strategy edits apply to
new assignments. Reading only the current rules would be simpler, but could make
an earlier by-the-book assessment misleading. This decision accepts the cost of
preserving historical rules to keep those assessments interpretable. The storage
approach and explicit reassignment behaviour remain to be decided.

## Assignment behaviour confirmed

New assignments use the current rules even for backfilled trades. An already
assigned trade adopts newer rules only through an explicit action. Assigning,
switching, clearing or updating the assigned rules clears the by-the-book answer,
so an assessment of the previous rules is not silently reused. Saving a trade
without changing its assignment preserves both the assigned rules and its answer.

## Persistence approach confirmed

Store strategy ownership and archive state separately from immutable revisions
containing the strategy name and chapters. A trade optionally references one
revision. This preserves a shared historical rule set without copying its text
into every assigned trade. The additional revision table and joins are accepted
in exchange for explicit revision identity and consistent historical reads.
