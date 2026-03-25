import { DEFAULT_RANGE_PRESET, rangePresetOptions } from "../../shared/constants";
import { buildPresetRange, todayDateKey } from "../../shared/date";
import styles from "./ui.module.css";

interface RangeSelectorProps {
  rangeStart: string;
  rangeEnd: string;
  onChange: (value: { rangeStart: string; rangeEnd: string }) => void;
}

export default function RangeSelector({
  rangeStart,
  rangeEnd,
  onChange,
}: RangeSelectorProps) {
  const today = todayDateKey();

  return (
    <div className={styles.fieldBlock}>
      <div className={styles.fieldHeader}>
        <label className={styles.fieldLabel}>Date range</label>
        <span className={styles.fieldHelper}>Up to 90 days</span>
      </div>
      <div className={styles.presetRow}>
        {rangePresetOptions.map((preset) => {
          const presetRange = buildPresetRange(preset.days);
          const active =
            rangeStart === presetRange.rangeStart && rangeEnd === presetRange.rangeEnd;
          return (
            <button
              key={preset.days}
              type="button"
              className={active ? styles.presetSelected : styles.presetButton}
              onClick={() => onChange(presetRange)}
            >
              {preset.label}
            </button>
          );
        })}
        <button
          type="button"
          className={
            rangeStart === buildPresetRange(DEFAULT_RANGE_PRESET).rangeStart &&
            rangeEnd === today
              ? styles.hiddenButton
              : styles.presetGhost
          }
          onClick={() => onChange(buildPresetRange(DEFAULT_RANGE_PRESET))}
        >
          Reset
        </button>
      </div>
      <div className={styles.inlineGrid}>
        <label className={styles.inputLabel}>
          <span>From</span>
          <input
            className={styles.input}
            type="date"
            value={rangeStart}
            max={rangeEnd}
            onChange={(event) =>
              onChange({ rangeStart: event.target.value, rangeEnd })
            }
          />
        </label>
        <label className={styles.inputLabel}>
          <span>To</span>
          <input
            className={styles.input}
            type="date"
            value={rangeEnd}
            min={rangeStart}
            max={today}
            onChange={(event) =>
              onChange({ rangeStart, rangeEnd: event.target.value })
            }
          />
        </label>
      </div>
    </div>
  );
}
