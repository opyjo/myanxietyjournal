import { NavLink } from "react-router-dom";
import type { PropsWithChildren } from "react";
import { APP_NAME } from "../../shared/constants";
import { useAuth } from "../hooks/useAuth";
import { cn } from "../lib/utils";

const navItems = [
  { to: "/app/today", label: "Today" },
  { to: "/app/history", label: "History" },
  { to: "/app/triggers", label: "Triggers" },
  { to: "/app/insights", label: "Insights" },
  { to: "/app/settings", label: "Settings" },
];

export default function AppShell({ children }: PropsWithChildren) {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen p-3 pb-6 bg-zinc-50">
      {/* Header */}
      <header className="sticky top-3 z-10 flex flex-wrap justify-between items-center gap-3 px-4 py-3 mb-3 rounded-2xl bg-white/80 border border-zinc-200 backdrop-blur-xl shadow-sm max-w-[72rem] mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 grid place-items-center rounded-xl bg-gradient-to-br from-[#b97344] to-[#7aa082] text-white font-bold text-sm tracking-wide shadow-md flex-shrink-0">
            AJ
          </div>
          <div>
            <p className="text-[0.7rem] text-zinc-400 uppercase tracking-widest m-0">
              A calmer view of your patterns
            </p>
            <h1 className="text-lg font-semibold m-0 leading-tight">{APP_NAME}</h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold m-0">{user?.displayName || "Signed in"}</p>
            <p className="text-xs text-zinc-500 m-0">{user?.email}</p>
          </div>
          <button
            type="button"
            onClick={() => signOut()}
            className="inline-flex items-center rounded-full border border-zinc-200 bg-white/60 px-4 py-2 text-sm text-zinc-600 hover:-translate-y-px transition-all cursor-pointer"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Nav */}
      <nav className="flex gap-1.5 p-1.5 mb-3 rounded-2xl bg-white/80 border border-zinc-200 backdrop-blur-lg shadow-sm max-w-[72rem] mx-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "flex-1 inline-flex justify-center items-center min-h-[2.75rem] rounded-xl text-sm font-semibold no-underline transition-all",
                isActive
                  ? "bg-gradient-to-br from-[#b97344] to-[#9b5f38] text-white shadow-md"
                  : "text-zinc-500 hover:text-zinc-800",
              )
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Main */}
      <main className="max-w-[72rem] mx-auto">{children}</main>
    </div>
  );
}
