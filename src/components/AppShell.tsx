import { NavLink } from "react-router-dom";
import type { PropsWithChildren } from "react";
import { APP_NAME } from "../../shared/constants";
import { useAuth } from "../hooks/useAuth";
import styles from "./AppShell.module.css";

const navItems = [
  { to: "/app/today", label: "Today" },
  { to: "/app/triggers", label: "Triggers" },
  { to: "/app/insights", label: "Insights" },
  { to: "/app/summary", label: "Summary" },
  { to: "/app/settings", label: "Settings" },
];

export default function AppShell({ children }: PropsWithChildren) {
  const { user, signOut } = useAuth();

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.brandGroup}>
          <div className={styles.brandMark}>AJ</div>
          <div>
            <p className={styles.eyebrow}>A calmer view of your patterns</p>
            <h1 className={styles.title}>{APP_NAME}</h1>
          </div>
        </div>
        <div className={styles.headerActions}>
          <div className={styles.userBlock}>
            <span className={styles.userName}>{user?.displayName || "Signed in"}</span>
            <span className={styles.userMeta}>{user?.email}</span>
          </div>
          <button type="button" className={styles.ghostButton} onClick={() => signOut()}>
            Sign out
          </button>
        </div>
      </header>
      <nav className={styles.nav}>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => (isActive ? styles.navActive : styles.navLink)}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
      <main className={styles.main}>{children}</main>
    </div>
  );
}
