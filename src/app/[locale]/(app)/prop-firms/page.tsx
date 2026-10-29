import { PropFirmCatalogue } from "@/components/prop-firms/prop-firm-catalogue";
import { PropFirmCompare } from "@/components/prop-firms/prop-firm-compare";
import { PropFirmFilters } from "@/components/prop-firms/prop-firm-filters";
import { listProgramLinks } from "@/db/queries/account-rules";
import {
  listAccountSizes,
  listPropFirms,
  listSummaryTags,
} from "@/db/queries/prop-firms";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { orderCatalogue } from "@/lib/prop-firms/cards";
import { effectiveSizes, parsePropFirmsState } from "@/lib/prop-firms/href";

interface PropFirmsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

// The reference catalogue (Design.md §3.9). The rows are filtered in SQL; the
// unfiltered list feeds the firm sheet's program switcher and the compare
// panel, so a compared program survives filters that hide it.
export default async function PropFirmsPage({
  searchParams,
}: PropFirmsPageProps) {
  const user = await getCurrentUser();
  const state = parsePropFirmsState(await searchParams);
  const links = await listProgramLinks(user.id);
  const sizes = effectiveSizes(
    state,
    links.flatMap((link) =>
      link.accountSizeUsd === null ? [] : [link.accountSizeUsd],
    ),
  );

  const [rows, allRows, tags, sizeChips] = await Promise.all([
    listPropFirms({
      search: state.search === "" ? undefined : state.search,
      tags: state.tags,
      sizes,
    }),
    listPropFirms({}),
    listSummaryTags(),
    listAccountSizes(),
  ]);

  // The compare columns follow the order they were picked in.
  const compared = state.compare.flatMap((id) => {
    const row = allRows.find((candidate) => candidate.program.id === id);
    return row ? [row] : [];
  });
  const cards = orderCatalogue(rows, links);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="page-title">Prop Firm Rules</h1>
        <p className="text-muted-foreground text-xs">
          Recorded by hand in context/PropFirmsData.md. Where a firm's own pages
          contradict each other, both readings are carried through as written.
        </p>
      </header>

      <PropFirmFilters
        state={state}
        sizes={sizes}
        sizeChips={sizeChips}
        tags={tags}
        count={rows.length}
      />

      <PropFirmCompare rows={compared} state={state} />

      <PropFirmCatalogue
        cards={cards}
        allRows={allRows}
        links={links}
        state={state}
      />
    </div>
  );
}
