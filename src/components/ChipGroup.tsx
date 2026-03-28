import { cn } from "../lib/utils";

interface ChipGroupProps {
  items: string[];
  selectedValues: string[];
  onToggle: (value: string) => void;
}

export default function ChipGroup({ items, selectedValues, onToggle }: ChipGroupProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => {
        const selected = selectedValues.includes(item);
        return (
          <button
            key={item}
            type="button"
            onClick={() => onToggle(item)}
            className={cn(
              "inline-flex items-center rounded-full px-3.5 py-2 text-sm font-medium border transition-all hover:-translate-y-px cursor-pointer",
              selected
                ? "bg-gradient-to-br from-[#b97344] to-[#9b5f38] text-white border-transparent shadow-md"
                : "bg-white/70 border-zinc-200 text-zinc-800",
            )}
          >
            {item}
          </button>
        );
      })}
    </div>
  );
}
