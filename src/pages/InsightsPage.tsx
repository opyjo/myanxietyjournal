import { useEffect, useMemo, useState } from "react";
import {
  DEFAULT_RANGE_PRESET,
  MIN_ANALYSIS_CHECKINS,
} from "../../shared/constants";
import { buildPresetRange, clampRange } from "../../shared/date";
import Card from "../components/Card";
import RangeSelector from "../components/RangeSelector";
import { useAuth } from "../hooks/useAuth";
import { acceptAnalysisDisclosure, hasAcceptedAnalysisDisclosure } from "../lib/disclosure";
import { callAnalyzePatterns, getRangeSnapshot } from "../lib/firestore";
import styles from "./Page.module.css";
import ui from "../components/ui.module.css";

function average(numbers: number[]) {
  if (!numbers.length) {
    return "—";
  }

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
    if (!user) {
      return;
    }

    setDisclosureAccepted(hasAcceptedAnalysisDisclosure(user.uid));
  }, [user]);

  useEffect(() => {
    if (!user) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    void getRangeSnapshot(user.uid, rangeStart, rangeEnd)
      .then((value) => {
        if (!cancelled) {
          setSnapshot(value);
        }
      })
      .catch((reason) => {
        if (!cancelled) {
          setError(reason instanceof Error ? reason.message : "Could not load insights.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
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
    if (!user) {
      return;
    }

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
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <p className={styles.eyebrow}>Insights</p>
        <h2 className={styles.title}>Review trends when you want the bigger picture</h2>
        <p className={styles.subtitle}>
          Insights run only when you ask. They help you see patterns —
          not to diagnose or give treatment advice.
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
          <div className={styles.alert}>
            On first use, selected check-ins, trigger notes, and medication logs are
            sent to Claude for analysis.
          </div>
        ) : null}
        <div className={styles.inlineActions}>
          <button
            type="button"
            className={ui.primaryButton}
            onClick={() => runAnalysis()}
            disabled={running || loading || checkinCount < MIN_ANALYSIS_CHECKINS}
          >
            {running ? "Analyzing..." : "Generate insights"}
          </button>
          <p className={styles.smallNote}>
            Need at least {MIN_ANALYSIS_CHECKINS} check-ins in the selected range.
          </p>
        </div>
      </Card>

      {error ? <div className={styles.alert}>{error}</div> : null}

      <div className={styles.metricGrid}>
        <article className={styles.metricCard}>
          <p className={styles.metricLabel}>Check-ins</p>
          <p className={styles.metricValue}>{loading ? "..." : checkinCount}</p>
        </article>
        <article className={styles.metricCard}>
          <p className={styles.metricLabel}>Average anxiety</p>
          <p className={styles.metricValue}>
            {loading ? "..." : average(snapshot?.checkins.map((item) => item.anxietyLevel) || [])}
          </p>
        </article>
        <article className={styles.metricCard}>
          <p className={styles.metricLabel}>Top symptoms</p>
          <p className={styles.metricValue}>{loading ? "..." : topSymptoms.join(", ") || "—"}</p>
        </article>
        <article className={styles.metricCard}>
          <p className={styles.metricLabel}>Common triggers</p>
          <p className={styles.metricValue}>{loading ? "..." : topTriggers.join(", ") || "—"}</p>
        </article>
      </div>

      <div className={styles.twoColumn}>
        <Card
          title="What your entries show"
          subtitle={
            snapshot?.latestAnalysis?.cached
              ? "Returned from a matching saved analysis."
              : "Latest saved analysis for this range."
          }
        >
          {snapshot?.latestAnalysis ? (
            <div className={styles.grid}>
              <p>{snapshot.latestAnalysis.analysis.overview}</p>
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
            <p className={styles.smallNote}>
              No analysis saved for this range yet. Generate one when you’re ready.
            </p>
          )}
        </Card>

        <Card title="Worth reflecting on" subtitle="Things that stood out from your entries.">
          {snapshot?.latestAnalysis ? (
            <div className={styles.grid}>
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
            <p className={styles.smallNote}>
              Reflection points will appear here after an analysis run.
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
