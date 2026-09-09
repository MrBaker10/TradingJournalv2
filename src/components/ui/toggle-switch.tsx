interface ToggleSwitchProps {
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
  disabled?: boolean;
  ariaLabel: string;
}

export function ToggleSwitch({
  checked,
  onCheckedChange,
  disabled,
  ariaLabel,
}: ToggleSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className="relative flex h-10 w-10 shrink-0 items-center justify-center"
    >
      <span
        className={`relative h-5 w-9 overflow-hidden rounded-full transition-colors duration-150 ${
          checked ? "bg-practice-dim" : "bg-toggle-track"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full transition-transform duration-150 ${
            checked ? "translate-x-4 bg-practice" : "translate-x-0 bg-fg-muted"
          }`}
        />
      </span>
    </button>
  );
}
