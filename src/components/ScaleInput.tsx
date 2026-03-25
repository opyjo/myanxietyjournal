import styles from "./ui.module.css";

interface ScaleInputProps {
  label: string;
  helper?: string;
  min: number;
  max: number;
  value: number;
  onChange: (value: number) => void;
}

export default function ScaleInput({
  label,
  helper,
  min,
  max,
  value,
  onChange,
}: ScaleInputProps) {
  return (
    <div className={styles.fieldBlock}>
      <div className={styles.fieldHeader}>
        <label className={styles.fieldLabel}>{label}</label>
        {helper ? <span className={styles.fieldHelper}>{helper}</span> : null}
      </div>
      <div className={styles.scaleRow}>
        {Array.from({ length: max - min + 1 }, (_, index) => {
          const number = min + index;
          return (
            <button
              key={number}
              type="button"
              className={number === value ? styles.scaleSelected : styles.scaleButton}
              onClick={() => onChange(number)}
            >
              {number}
            </button>
          );
        })}
      </div>
    </div>
  );
}
