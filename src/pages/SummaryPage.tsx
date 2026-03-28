import { useEffect, useMemo, useState } from "react";
import { DEFAULT_RANGE_PRESET } from "../../shared/constants";
import { buildPresetRange } from "../../shared/date";
import { buildSummary } from "../../shared/summary";
import Card from "../components/Card";
import RangeSelector from "../components/RangeSelector";
import { Button } from "../components/ui/button";
import { useAuth } from "../hooks/useAuth";
import { getRangeSnapshot } from "../lib/firestore";

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
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    void getRangeSnapshot(user.uid, rangeStart, rangeEnd)
      .then((value) => {
        if (!cancelled) setSnapshot(value);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [rangeEnd, rangeStart, user]);

  const summary = useMemo(() => {
    if (!snapshot) return null;
    return buildSummary({
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
    <div className="grid gap-5">
      <div className="grid gap-1.5 py-1">
        <p className="text-xs uppercase tracking-widest text-zinc-400">Summary</p>
        <h2 className="text-3xl font-bold tracking-tight m-0">Export a summary of your journal</h2>
        <p className="text-zinc-500 max-w-xl m-0">
          Keep for yourself, share with someone you trust, or bring to an appointment.
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

      {message ? (
        <div className="rounded-xl bg-green-50 border border-green-200 text-green-700 p-3 text-sm">
          {message}
        </div>
      ) : null}

      <div className="grid md:grid-cols-2 gap-4 items-start">
        <Card
          title="Journal summary"
          subtitle={loading ? "Refreshing..." : "Ready to copy or download."}
          action={
            summary ? (
              <div className="flex flex-wrap gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={async () => {
                    await navigator.clipboard.writeText(summary.text);
                    setMessage("Summary copied to your clipboard.");
                  }}
                >
                  Copy text
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    downloadTextFile(summary.text);
                    setMessage("Summary downloaded as a text file.");
                  }}
                >
                  Download .txt
                </Button>
              </div>
            ) : null
          }
        >
          {summary ? (
            <textarea
              className="w-full min-h-[24rem] rounded-xl border border-zinc-200 bg-white/80 px-3.5 py-2.5 text-sm leading-relaxed resize-vertical focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b97344]/40"
              readOnly
              value={summary.text}
            />
          ) : (
            <p className="text-sm text-zinc-500 m-0">
              Add some check-ins first. Your summary will appear here once there is data in
              the selected range.
            </p>
          )}
        </Card>

        <Card title="What's included" subtitle="A quick preview of the structured inputs.">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-2xl border border-zinc-200 bg-white/80 p-4">
              <p className="text-xs text-zinc-500 m-0">Check-ins</p>
              <p className="text-2xl font-bold m-0 mt-1">{snapshot?.checkins.length ?? 0}</p>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-white/80 p-4">
              <p className="text-xs text-zinc-500 m-0">Trigger logs</p>
              <p className="text-2xl font-bold m-0 mt-1">{snapshot?.triggers.length ?? 0}</p>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-white/80 p-4">
              <p className="text-xs text-zinc-500 m-0">AI review</p>
              <p className="text-2xl font-bold m-0 mt-1">
                {snapshot?.latestAnalysis ? "Included" : "Not yet"}
              </p>
            </div>
          </div>
          <p className="text-sm text-zinc-500 m-0">
            The note includes top symptoms, trigger context, medication adherence, recent notes, and
            discussion points when an AI review exists for this date range.
          </p>
        </Card>
      </div>
    </div>
  );
}
