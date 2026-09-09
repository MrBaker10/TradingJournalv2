interface Tag {
  id: number;
  label: string;
}

export interface TagGroup {
  group: string;
  tags: Tag[];
}

interface TagMultiSelectProps {
  groups: TagGroup[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  disabled?: boolean;
}

// Reused for both confluence tags (grouped, group heading shown) and mistake
// tags (single group with an empty group name, heading omitted).
export function TagMultiSelect({
  groups,
  selectedIds,
  onChange,
  disabled,
}: TagMultiSelectProps) {
  function toggle(id: number) {
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((selected) => selected !== id)
        : [...selectedIds, id],
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {groups.map((group) => (
        <div key={group.group || "_flat"} className="flex flex-col gap-1.5">
          {group.group && <span className="cap">{group.group}</span>}
          <div className="flex flex-wrap gap-1.5">
            {group.tags.map((tag) => {
              const selected = selectedIds.includes(tag.id);
              return (
                <button
                  key={tag.id}
                  type="button"
                  disabled={disabled}
                  aria-pressed={selected}
                  onClick={() => toggle(tag.id)}
                  className={`rounded-xs border px-2 py-1 text-xs transition-colors duration-150 disabled:opacity-60 ${
                    selected
                      ? "border-cyan/50 bg-cyan-dim text-cyan"
                      : "border-white/12 bg-well text-fg-muted hover:border-cyan/35"
                  }`}
                >
                  {tag.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
