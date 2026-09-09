interface AccountOption {
  id: number;
  name: string;
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
            className={`rounded-xs border px-2.5 py-1.5 text-sm transition-colors duration-150 disabled:opacity-60 ${
              selected
                ? "border-cyan/50 bg-cyan-dim text-cyan"
                : "border-white/12 bg-well text-fg-muted hover:border-cyan/35"
            }`}
          >
            {account.name}
          </button>
        );
      })}
    </div>
  );
}
