interface StatusCardProps {
  label: string;
  value: string;
  sub: string;
}

// Design.md §4.3, small form: the dashboard tile reduced to one row for
// Progress, where the score card is the main thing and these sit beside it.
// The value is process, so it may glow; no icon tile, because on this page
// the label alone says what the number is.
export function StatusCard({ label, value, sub }: StatusCardProps) {
  return (
    <div className="card-surface edge-neon flex items-baseline justify-between gap-3 px-5 py-4">
      <span className="cap">{label}</span>
      <span className="flex items-baseline gap-2">
        <span className="text-glow font-mono text-[20px] font-bold leading-none tabular-nums">
          {value}
        </span>
        <span className="text-[11.5px] text-fg-subtle tabular-nums">{sub}</span>
      </span>
    </div>
  );
}
