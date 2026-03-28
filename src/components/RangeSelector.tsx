import { DEFAULT_RANGE_PRESET, rangePresetOptions } from "../../shared/constants";
import { buildPresetRange, todayDateKey } from "../../shared/date";
import { cn } from "../lib/utils";

interface RangeSelectorProps {
  rangeStart: string;
  rangeEnd: string;
  onChange: (value: { rangeStart: string; rangeEnd: string }) => void;
}

export default function RangeSelector({ rangeStart, rangeEnd, onChange }: RangeSelectorProps) {
  const today = todayDateKey();

  return (
    <div className="grid gap-3">
      <div className="flex justify-between items-center gap-4">
        <span className="text-sm font-semibold text-zinc-800">Date range</span>
        <span className="text-xs text-zinc-500">Up to 90 days</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {rangePresetOptions.map((preset) => {
          const presetRange = buildPresetRange(preset.days);
          const active =
            rangeStart === presetRange.rangeStart && rangeEnd === presetRange.rangeEnd;
          return (
            <button
              key={preset.days}
              type="button"
              onClick={() => onChange(presetRange)}
              className={cn(
                "inline-flex items-center rounded-full px-3.5 py-2 text-sm font-medium border transition-all hover:-translate-y-px cursor-pointer",
                active
                  ? "bg-gradient-to-br from-[#b97344] to-[#9b5f38] text-white border-transparent shadow-md"
                  : "bg-white/70 border-zinc-200 text-zinc-800",
              )}
            >
              {preset.label}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => onChange(buildPresetRange(DEFAULT_RANGE_PRESET))}
          className={cn(
            "inline-flex items-center rounded-full px-3.5 py-2 text-sm font-medium border border-zinc-200 bg-transparent text-zinc-500 transition-all hover:-translate-y-px cursor-pointer",
            rangeStart === buildPresetRange(DEFAULT_RANGE_PRESET).rangeStart &&
              rangeEnd === today
              ? "hidden"
              : "",
          )}
        >
          Reset
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1.5">
          <span className="text-sm font-medium text-zinc-700">From</span>
          <input
            className="flex w-full rounded-xl border border-zinc-200 bg-white/80 px-3.5 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b97344]/40"
            type="date"
            value={rangeStart}
            max={rangeEnd}
            onChange={(event) => onChange({ rangeStart: event.target.value, rangeEnd })}
          />
        </label>
        <label className="grid gap-1.5">
          <span className="text-sm font-medium text-zinc-700">To</span>
          <input
            className="flex w-full rounded-xl border border-zinc-200 bg-white/80 px-3.5 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b97344]/40"
            type="date"
            value={rangeEnd}
            min={rangeStart}
            max={today}
            onChange={(event) => onChange({ rangeStart, rangeEnd: event.target.value })}
          />
        </label>
      </div>
    </div>
  );
}
