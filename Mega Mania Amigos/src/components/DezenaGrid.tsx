import { cn } from "@/lib/utils";

interface Props {
  selected: number[];
  onToggle: (n: number) => void;
  max?: number;
  disabled?: boolean;
}

export function DezenaGrid({ selected, onToggle, max = 9, disabled }: Props) {
  const set = new Set(selected);
  return (
    <div className="grid grid-cols-6 gap-2 sm:grid-cols-10 sm:gap-3">
      {Array.from({ length: 60 }, (_, i) => i + 1).map((n) => {
        const isOn = set.has(n);
        const blockedNew = !isOn && selected.length >= max;
        return (
          <button
            key={n}
            type="button"
            disabled={disabled || (blockedNew && !isOn)}
            onClick={() => onToggle(n)}
            aria-pressed={isOn}
            aria-label={`Dezena ${n}`}
            className={cn(
              "relative aspect-square rounded-full font-bold text-base sm:text-lg transition-all duration-150 select-none",
              "border border-border/60 disabled:opacity-40 disabled:cursor-not-allowed",
              isOn
                ? "mega-ball scale-105"
                : "bg-card text-foreground hover:bg-secondary hover:scale-105 active:scale-95",
            )}
          >
            {String(n).padStart(2, "0")}
          </button>
        );
      })}
    </div>
  );
}
