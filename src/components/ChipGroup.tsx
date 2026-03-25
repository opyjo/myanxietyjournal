import styles from "./ui.module.css";

interface ChipGroupProps {
  items: string[];
  selectedValues: string[];
  onToggle: (value: string) => void;
}

export default function ChipGroup({
  items,
  selectedValues,
  onToggle,
}: ChipGroupProps) {
  return (
    <div className={styles.chipWrap}>
      {items.map((item) => {
        const selected = selectedValues.includes(item);
        return (
          <button
            key={item}
            type="button"
            className={selected ? styles.chipSelected : styles.chip}
            onClick={() => onToggle(item)}
          >
            {item}
          </button>
        );
      })}
    </div>
  );
}
