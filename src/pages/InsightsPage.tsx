import { useEffect, useMemo, useState } from "react";
import { DEFAULT_RANGE_PRESET, MIN_ANALYSIS_CHECKINS } from "../../shared/constants";
import { buildPresetRange, clampRange } from "../../shared/date";
import Card from "../components/Card";
import RangeSelector from "../components/RangeSelector";
import { Button } from "../components/ui/button";
import { useAuth } from "../hooks/useAuth";
import { acceptAnalysisDisclosure, hasAcceptedAnalysisDisclosure } from "../lib/disclosure";
import { callAnalyzePatterns, getRangeSnapshot } from "../lib/firestore";

function average(numbers: number[]) {
  if (!numbers.length) return "—";
  return (numbers.reduce((sum, value) => sum + value, 0) / numbers.length).toFixed(1);
}

export default function InsightsPage() {
  const { user } = useAuth();
  const defaultRange = useMemo(() => buildPresetRange(DEFAULT_RANGE_PRESET), []);
  const [rangeStart, setRangeStart] = useState(defaultRange.rangeStart);
  const [rangeEnd, setRangeEnd] = useState(defaultRange.rangeEnd);
  const [snapshot, setSnapshot] = useState<Awaited<ReturnType<typeof getRangeSnapshot>> | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [disclosureAccepted, setDisclosureAccepted] = useState(false);

  useEffect(() => {
    if (!user) return;
    setDisclosureAccepted(hasAcceptedAnalysisDisclosure(user.uid));
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    void getRangeSnapshot(user.uid, rangeStart, rangeEnd)
      .then((value) => {
        if (!cancelled) setSnapshot(value);
      })
      .catch((reason) => {
        if (!cancelled)
          setError(reason instanceof Error ? reason.message : "Could not load insights.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [rangeEnd, rangeStart, user]);

  const topSymptoms = useMemo(() => {
    const counts = new Map<string, number>();
    snapshot?.checkins.flatMap((item) => item.symptoms).forEach((item) => {
      counts.set(item, (counts.get(item) ?? 0) + 1);
    });
    return [...counts.entries()]
      .sort((left, right) => right[1] - left[1])
      .slice(0, 4)
      .map(([value]) => value);
  }, [snapshot]);

  const topTriggers = useMemo(() => {
    const counts = new Map<string, number>();
    snapshot?.triggers
      .flatMap((item) => [...item.stressTags, ...item.consumedTags])
      .forEach((item) => counts.set(item, (counts.get(item) ?? 0) + 1));
    return [...counts.entries()]
      .sort((left, right) => right[1] - left[1])
      .slice(0, 4)
      .map(([value]) => value);
  }, [snapshot]);

  async function runAnalysis() {
    if (!user) return;
    try {
      clampRange(rangeStart, rangeEnd);
      setRunning(true);
      setError(null);
      if (!disclosureAccepted) {
        acceptAnalysisDisclosure(user.uid);
        setDisclosureAccepted(true);
      }
      const analysis = await callAnalyzePatterns(rangeStart, rangeEnd);
      setSnapshot((previous) =>
        previous
          ? { ...previous, latestAnalysis: analysis }
          : { checkins: [], triggers: [], latestAnalysis: analysis },
      );
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Analysis failed.");
    } finally {
      setRunning(false);
    }
  }

  const checkinCount = snapshot?.checkins.length ?? 0;

  return (
    <div className="grid gap-5">
      <div className="grid gap-1.5 py-1">
        <p className="text-xs uppercase tracking-widest text-zinc-400">Insights</p>
        <h2 className="text-3xl font-bold tracking-tight m-0">
          Review trends when you want the bigger picture
        </h2>
        <p className="text-zinc-500 max-w-xl m-0">
          Insights run only when you ask. They help you see patterns — not to diagnose or give
          treatment advice.
        </p>
      </div>

      <Card title="Pattern range" subtitle="Choose the time window you want to review.">
        <RangeSelector
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          onChange={({ rangeStart: nextStart, rangeEnd: nextEnd }) => {
            setRangeStart(nextStart);
            setRangeEnd(nextEnd);
          }}
        />
        {!disclosureAccepted ? (
          <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 p-3 text-sm">
            On first use, selected check-ins, trigger notes, and medication logs are sent to Claude
            for analysis.
          </div>
        ) : null}
        <div className="flex flex-wrap gap-3 items-center">
          <Button
            type="button"
            onClick={() => runAnalysis()}
            disabled={running || loading || checkinCount < MIN_ANALYSIS_CHECKINS}
          >
            {running ? "Analyzing..." : "Generate insights"}
          </Button>
          <p className="text-sm text-zinc-500 m-0">
            Need at least {MIN_ANALYSIS_CHECKINS} check-ins in the selected range.
          </p>
        </div>
      </Card>

      {error ? (
        <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 p-3 text-sm">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-zinc-200 bg-white/80 p-4">
          <p className="text-xs text-zinc-500 m-0">Check-ins</p>
          <p className="text-2xl font-bold m-0 mt-1">{loading ? "..." : checkinCount}</p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white/80 p-4">
          <p className="text-xs text-zinc-500 m-0">Average anxiety</p>
          <p className="text-2xl font-bold m-0 mt-1">
            {loading ? "..." : average(snapshot?.checkins.map((item) => item.anxietyLevel) || [])}
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white/80 p-4">
          <p className="text-xs text-zinc-500 m-0">Top symptoms</p>
          <p className="text-2xl font-bold m-0 mt-1">
            {loading ? "..." : topSymptoms.join(", ") || "—"}
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white/80 p-4">
          <p className="text-xs text-zinc-500 m-0">Common triggers</p>
          <p className="text-2xl font-bold m-0 mt-1">
            {loading ? "..." : topTriggers.join(", ") || "—"}
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4 items-start">
        <Card
          title="What your entries show"
          subtitle={
            snapshot?.latestAnalysis?.cached
              ? "Returned from a matching saved analysis."
              : "Latest saved analysis for this range."
          }
        >
          {snapshot?.latestAnalysis ? (
            <div className="grid gap-4">
              <p className="m-0">{snapshot.latestAnalysis.analysis.overview}</p>
              <div>
                <strong>Patterns</strong>
                <ul>
                  {snapshot.latestAnalysis.analysis.patterns.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <strong>Trigger observations</strong>
                <ul>
                  {snapshot.latestAnalysis.analysis.triggerObservations.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <p className="text-sm text-zinc-500 m-0">
              No analysis saved for this range yet. Generate one when you're ready.
            </p>
          )}
        </Card>

        <Card title="Worth reflecting on" subtitle="Things that stood out from your entries.">
          {snapshot?.latestAnalysis ? (
            <div className="grid gap-4">
              <div>
                <strong>Sleep and energy</strong>
                <ul>
                  {snapshot.latestAnalysis.analysis.sleepEnergyLinks.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <strong>Medication consistency</strong>
                <ul>
                  {snapshot.latestAnalysis.analysis.medicationConsistency.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <strong>Worth sitting with</strong>
                <ul>
                  {snapshot.latestAnalysis.analysis.reflectionPoints.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <p className="text-sm text-zinc-500 m-0">
              Reflection points will appear here after an analysis run.
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
