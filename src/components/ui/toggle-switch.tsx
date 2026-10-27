interface ToggleSwitchProps {
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
  disabled?: boolean;
  ariaLabel: string;
  ariaDescribedBy?: string;
}

// Its one use is the practice switch, so "on" is the practice amber.
export function ToggleSwitch({
  checked,
  onCheckedChange,
  disabled,
  ariaLabel,
  ariaDescribedBy,
}: ToggleSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className="group relative flex h-10 w-10 shrink-0 items-center justify-center rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
    >
      <span
        className={`relative h-5 w-9 overflow-hidden rounded-full transition-colors duration-150 ${
          checked ? "bg-amber-400/30" : "bg-input"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full transition-[translate,background-color] duration-150 ${
            checked
              ? "translate-x-4 bg-amber-400"
              : "translate-x-0 bg-muted-foreground"
          }`}
        />
      </span>
    </button>
  );
}
