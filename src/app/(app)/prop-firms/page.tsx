import { PropFirmCard } from "@/components/prop-firms/prop-firm-card";
import { PropFirmCompare } from "@/components/prop-firms/prop-firm-compare";
import { PropFirmFilters } from "@/components/prop-firms/prop-firm-filters";
import {
  listPropFirmProgramsByIds,
  listPropFirms,
  listSummaryTags,
} from "@/db/queries/prop-firms";
import { MAX_COMPARE, parsePropFirmsState } from "@/lib/prop-firms/href";

interface PropFirmsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function PropFirmsPage({
  searchParams,
}: PropFirmsPageProps) {
  const state = parsePropFirmsState(await searchParams);

  const [rows, tags, compareRows] = await Promise.all([
    listPropFirms({
      search: state.search === "" ? undefined : state.search,
      tags: state.tags,
    }),
    listSummaryTags(),
    listPropFirmProgramsByIds(state.compare),
  ]);

  // The compare columns follow the order they were picked in, not the order the
  // database happened to return them in.
  const compared = state.compare.flatMap((id) => {
    const row = compareRows.find((candidate) => candidate.program.id === id);
    return row ? [row] : [];
  });

  return (
    <div className="flex flex-col gap-4">
      <h1 className="page-title">Prop Firm Rules</h1>
      <p className="text-fg-subtle text-xs">
        Recorded by hand in context/PropFirmsData.md. Where a firm's own pages
        contradict each other, both readings are carried through as written.
      </p>

      <PropFirmFilters state={state} tags={tags} />

      <PropFirmCompare rows={compared} state={state} />

      {rows.length === 0 ? (
        <p className="py-10 text-center text-fg-subtle text-sm">
          No firm matches. Filters narrow together, so two chips describing the
          same thing never match at once.
        </p>
      ) : (
        <div className="flex flex-col gap-[10px]">
          {rows.map((row) => (
            <PropFirmCard
              key={row.program.id}
              row={row}
              state={state}
              selected={state.compare.includes(row.program.id)}
              selectionFull={state.compare.length >= MAX_COMPARE}
            />
          ))}
        </div>
      )}
    </div>
  );
}
