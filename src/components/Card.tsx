import type { PropsWithChildren, ReactNode } from "react";
import styles from "./ui.module.css";

interface CardProps extends PropsWithChildren {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
}

export default function Card({ children, title, subtitle, action }: CardProps) {
  return (
    <section className={styles.card}>
      {(title || subtitle || action) && (
        <div className={styles.cardHeader}>
          <div>
            {title ? <h2 className={styles.cardTitle}>{title}</h2> : null}
            {subtitle ? <p className={styles.cardSubtitle}>{subtitle}</p> : null}
          </div>
          {action ? <div>{action}</div> : null}
        </div>
      )}
      {children}
    </section>
  );
}
