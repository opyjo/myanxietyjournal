import { cn } from "../lib/utils";

interface ScaleInputProps {
  label: string;
  helper?: string;
  min: number;
  max: number;
  value: number;
  onChange: (value: number) => void;
}

export default function ScaleInput({ label, helper, min, max, value, onChange }: ScaleInputProps) {
  return (
    <div className="grid gap-1.5">
      <div className="flex justify-between items-center gap-4">
        <span className="text-sm font-semibold text-zinc-800">{label}</span>
        {helper ? <span className="text-xs text-zinc-500">{helper}</span> : null}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {Array.from({ length: max - min + 1 }, (_, index) => {
          const number = min + index;
          return (
            <button
              key={number}
              type="button"
              onClick={() => onChange(number)}
              className={cn(
                "inline-flex items-center justify-center rounded-full min-w-[2rem] h-8 px-2.5 text-sm font-medium border transition-all hover:-translate-y-px cursor-pointer",
                number === value
                  ? "bg-gradient-to-br from-[#b97344] to-[#9b5f38] text-white border-transparent shadow-md"
                  : "bg-white/70 border-zinc-200 text-zinc-800",
              )}
            >
              {number}
            </button>
          );
        })}
      </div>
    </div>
  );
}
