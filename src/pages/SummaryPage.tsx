import { useEffect, useMemo, useState } from "react";
import { DEFAULT_RANGE_PRESET } from "../../shared/constants";
import { buildPresetRange } from "../../shared/date";
import { buildClinicianSummary } from "../../shared/summary";
import Card from "../components/Card";
import RangeSelector from "../components/RangeSelector";
import { useAuth } from "../hooks/useAuth";
import { getRangeSnapshot } from "../lib/firestore";
import styles from "./Page.module.css";
import ui from "../components/ui.module.css";

export default function SummaryPage() {
  const { user } = useAuth();
  const defaultRange = useMemo(() => buildPresetRange(DEFAULT_RANGE_PRESET), []);
  const [rangeStart, setRangeStart] = useState(defaultRange.rangeStart);
  const [rangeEnd, setRangeEnd] = useState(defaultRange.rangeEnd);
  const [snapshot, setSnapshot] = useState<Awaited<ReturnType<typeof getRangeSnapshot>> | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      return;
    }

    let cancelled = false;
    setLoading(true);

    void getRangeSnapshot(user.uid, rangeStart, rangeEnd)
      .then((value) => {
        if (!cancelled) {
          setSnapshot(value);
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

  const summary = useMemo(() => {
    if (!snapshot) {
      return null;
    }

    return buildClinicianSummary({
      rangeStart,
      rangeEnd,
      checkins: snapshot.checkins,
      triggers: snapshot.triggers,
      analysis: snapshot.latestAnalysis,
    });
  }, [rangeEnd, rangeStart, snapshot]);

  function downloadTextFile(content: string) {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `anxiety-journal-summary-${rangeStart}-to-${rangeEnd}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <p className={styles.eyebrow}>Summary</p>
        <h2 className={styles.title}>Prepare a clean note for a doctor or therapist</h2>
        <p className={styles.subtitle}>
          This is a deterministic summary built from your entries, with the latest saved
          AI review for the selected range folded in when available.
        </p>
      </div>

      <Card title="Summary range" subtitle="Choose the entries you want to include.">
        <RangeSelector
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          onChange={({ rangeStart: nextStart, rangeEnd: nextEnd }) => {
            setRangeStart(nextStart);
            setRangeEnd(nextEnd);
          }}
        />
      </Card>

      {message ? <div className={styles.success}>{message}</div> : null}

      <div className={styles.twoColumn}>
        <Card
          title="Clinician note"
          subtitle={loading ? "Refreshing..." : "Ready to copy or download."}
          action={
            summary ? (
              <div className={styles.inlineActions}>
                <button
                  type="button"
                  className={ui.secondaryButton}
                  onClick={async () => {
                    await navigator.clipboard.writeText(summary.text);
                    setMessage("Summary copied to your clipboard.");
                  }}
                >
                  Copy text
                </button>
                <button
                  type="button"
                  className={ui.ghostButton}
                  onClick={() => {
                    downloadTextFile(summary.text);
                    setMessage("Summary downloaded as a text file.");
                  }}
                >
                  Download .txt
                </button>
              </div>
            ) : null
          }
        >
          {summary ? (
            <textarea className={styles.summaryBox} readOnly value={summary.text} />
          ) : (
            <p className={styles.smallNote}>
              Add some check-ins first. Your summary will appear here once there is data in
              the selected range.
            </p>
          )}
        </Card>

        <Card title="What’s included" subtitle="A quick preview of the structured inputs.">
          <div className={styles.metricGrid}>
            <article className={styles.metricCard}>
              <p className={styles.metricLabel}>Check-ins</p>
              <p className={styles.metricValue}>{snapshot?.checkins.length ?? 0}</p>
            </article>
            <article className={styles.metricCard}>
              <p className={styles.metricLabel}>Trigger logs</p>
              <p className={styles.metricValue}>{snapshot?.triggers.length ?? 0}</p>
            </article>
            <article className={styles.metricCard}>
              <p className={styles.metricLabel}>AI review</p>
              <p className={styles.metricValue}>{snapshot?.latestAnalysis ? "Included" : "Not yet"}</p>
            </article>
          </div>
          <p className={styles.smallNote}>
            The note includes top symptoms, trigger context, medication adherence, recent
            notes, and discussion points when an AI review exists for this date range.
          </p>
        </Card>
      </div>
    </div>
  );
}
