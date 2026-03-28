import { APP_NAME, crisisSupportCopy } from "../../shared/constants";
import { useAuth } from "../hooks/useAuth";

export default function HomePage() {
  const { firebaseReady, signInWithGoogle } = useAuth();

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between px-6 py-5 border-b border-zinc-800/60">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#b97344] to-[#7aa082] flex items-center justify-center text-white text-xs font-bold">
            AJ
          </div>
          <span className="text-sm font-semibold text-zinc-200">{APP_NAME}</span>
        </div>
        <button
          type="button"
          onClick={() => signInWithGoogle()}
          disabled={!firebaseReady}
          className="inline-flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm text-zinc-300 hover:border-zinc-500 hover:text-white transition-all disabled:opacity-50 cursor-pointer"
        >
          Sign in with Google
        </button>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900 px-4 py-1.5 text-xs text-zinc-400 mb-8">
          Warm private tracking for anxious days
        </div>

        <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight bg-gradient-to-br from-white to-zinc-400 bg-clip-text text-transparent max-w-3xl leading-[1.05] mb-6">
          A calmer view of your patterns
        </h1>

        <p className="text-lg text-zinc-400 max-w-xl mb-10 leading-relaxed">
          Track anxiety, energy, sleep, symptoms, triggers, and medication in one calm
          routine. Generate supportive AI insights and a clinician-ready note when you
          want the bigger picture.
        </p>

        <div className="flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={() => signInWithGoogle()}
            disabled={!firebaseReady}
            className="inline-flex items-center gap-2.5 rounded-full bg-gradient-to-br from-[#b97344] to-[#9b5f38] px-7 py-3.5 text-base font-semibold text-white shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-50 cursor-pointer"
          >
            Get started — sign in with Google
          </button>
          <p className="text-sm text-zinc-500">
            Private check-ins, on-demand AI insights, and a clean note for care visits.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-8 mt-20 max-w-lg mx-auto">
          <div className="text-center">
            <p className="text-3xl font-bold text-white mb-1">1 min</p>
            <p className="text-sm text-zinc-500">to log today</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-white mb-1">On demand</p>
            <p className="text-sm text-zinc-500">AI pattern review</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-white mb-1">Copy ready</p>
            <p className="text-sm text-zinc-500">for your care team</p>
          </div>
        </div>

        {/* Feature cards */}
        <div className="grid sm:grid-cols-3 gap-4 mt-20 max-w-3xl mx-auto w-full text-left">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 hover:border-zinc-700 transition-colors">
            <p className="text-xs font-semibold text-[#b97344] uppercase tracking-wider mb-3">
              Daily check-in
            </p>
            <p className="text-sm text-zinc-300 leading-relaxed">
              One clean screen for anxiety, mood, sleep, energy, and symptoms. Made to
              feel light when your head does not.
            </p>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 hover:border-zinc-700 transition-colors">
            <p className="text-xs font-semibold text-[#b97344] uppercase tracking-wider mb-3">
              Trigger tracking
            </p>
            <p className="text-sm text-zinc-300 leading-relaxed">
              Quick tags for stress events and consumed items so patterns become visible
              over time, not just in the moment.
            </p>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 hover:border-zinc-700 transition-colors">
            <p className="text-xs font-semibold text-[#b97344] uppercase tracking-wider mb-3">
              Pattern insights
            </p>
            <p className="text-sm text-zinc-300 leading-relaxed">
              Claude looks across entries only when you ask, then surfaces calm,
              discussable trends for your next appointment.
            </p>
          </div>
        </div>
      </main>

      {/* Crisis notice */}
      <aside className="mx-6 mb-6 rounded-xl bg-red-950/40 border border-red-900/50 px-5 py-3.5 flex gap-3 items-start">
        <span className="text-xs font-semibold text-red-400 uppercase tracking-wider mt-0.5 flex-shrink-0">
          Important
        </span>
        <span className="text-sm text-red-300/80">{crisisSupportCopy}</span>
      </aside>
    </div>
  );
}
