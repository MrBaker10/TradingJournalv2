interface AccountOption {
  id: number;
  name: string;
  isPractice?: boolean;
  /**
   * Archived accounts only ever reach this list when the trade being edited is
   * already assigned to them — src/db/queries/accounts.ts,
   * listAssignableAccounts. They stay togglable so the assignment can be
   * removed; what they cannot do is be added to a different trade, and that is
   * enforced on the server, not here.
   */
  isArchived?: boolean;
}

interface AccountMultiSelectProps {
  accounts: AccountOption[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  disabled?: boolean;
}

// Copy-trading: a trade can be assigned to several accounts at once
// (project-overview.md, A2). Only rendered when taken=true.
export function AccountMultiSelect({
  accounts,
  selectedIds,
  onChange,
  disabled,
}: AccountMultiSelectProps) {
  function toggle(id: number) {
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((selected) => selected !== id)
        : [...selectedIds, id],
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {accounts.map((account) => {
        const selected = selectedIds.includes(account.id);
        return (
          <button
            key={account.id}
            type="button"
            disabled={disabled}
            aria-pressed={selected}
            onClick={() => toggle(account.id)}
            className={`flex items-center gap-1.5 rounded-xs border px-2.5 py-1.5 text-sm transition-colors duration-150 disabled:opacity-60 ${
              selected
                ? "border-cyan/50 bg-cyan-dim text-cyan"
                : "border-white/12 bg-well text-fg-muted hover:border-cyan/35"
            }`}
          >
            {account.name}
            {/* Design.md §4.12: a practice account carries its marker
                everywhere its numbers do, because they render in the same
                green and red as real money. Calm amber, no glow. */}
            {account.isPractice && (
              <span className="cap-practice rounded-xs px-1 py-0.5">
                Practice
              </span>
            )}
            {account.isArchived && (
              <span className="cap rounded-xs bg-well px-1 py-0.5">
                Archived
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
