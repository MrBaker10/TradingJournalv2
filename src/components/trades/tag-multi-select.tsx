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
  /**
   * How a selected chip looks — the same surface as the badge on the detail
   * page (Design.md §4.20, §4.22): `info` for confluences, `neutral` for
   * mistakes, so a mistake never lights up like something earned.
   */
  tone?: "info" | "neutral";
}

const SELECTED: Record<"info" | "neutral", string> = {
  info: "border-transparent bg-[image:var(--gradient-info-soft)] text-fg shadow-[var(--shadow-info-soft)]",
  neutral:
    "border-transparent bg-[image:var(--gradient-dark-soft)] text-fg shadow-[var(--shadow-dark-soft)]",
};

// Reused for both confluence tags (grouped, group heading shown) and mistake
// tags (single group with an empty group name, heading omitted).
export function TagMultiSelect({
  groups,
  selectedIds,
  onChange,
  disabled,
  tone = "info",
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
          {/* A group name sits under the field label, so it is quieter than
              it: sentence case in fg-subtle, like the detail page. */}
          {group.group && (
            <span className="text-fg-subtle text-xs">{group.group}</span>
          )}
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
                      ? SELECTED[tone]
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
