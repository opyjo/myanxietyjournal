import { useCallback, useEffect, useMemo, useState } from "react";
import { moodOptions } from "../../shared/constants";
import { buildPresetRange, formatFriendlyDate } from "../../shared/date";
import type { DailyCheckin, TriggerLog } from "../../shared/types";
import Card from "../components/Card";
import { useAuth } from "../hooks/useAuth";
import { getRangeCheckins, getRangeTriggerLogs } from "../lib/firestore";

export default function HistoryPage() {
  const { user } = useAuth();
  const [checkins, setCheckins] = useState<DailyCheckin[]>([]);
  const [triggers, setTriggers] = useState<TriggerLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedDate, setExpandedDate] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const { rangeStart, rangeEnd } = buildPresetRange(90);
    Promise.all([
      getRangeCheckins(user.uid, rangeStart, rangeEnd),
      getRangeTriggerLogs(user.uid, rangeStart, rangeEnd),
    ])
      .then(([c, t]) => {
        setCheckins(c.reverse());
        setTriggers(t);
      })
      .finally(() => setLoading(false));
  }, [user]);

  const triggersByDate = useMemo(() => {
    const map: Record<string, TriggerLog[]> = {};
    for (const t of triggers) {
      (map[t.occurredOn] ??= []).push(t);
    }
    return map;
  }, [triggers]);

  const moodLabel = useCallback((mood: string) => {
    return moodOptions.find((m) => m.value === mood)?.label ?? mood;
  }, []);

  function handleExpand(date: string) {
    setExpandedDate(expandedDate === date ? null : date);
  }

  if (loading) {
    return (
      <div className="grid gap-5">
        <div className="grid gap-1.5 py-1">
          <p className="text-xs uppercase tracking-widest text-zinc-400">History</p>
          <h2 className="text-3xl font-bold tracking-tight m-0">Past check-ins</h2>
        </div>
        <p className="text-sm text-zinc-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      <div className="grid gap-1.5 py-1">
        <p className="text-xs uppercase tracking-widest text-zinc-400">History</p>
        <h2 className="text-3xl font-bold tracking-tight m-0">Past check-ins</h2>
        <p className="text-zinc-500 max-w-xl m-0">
          Browse your journal entries from the last 90 days.
        </p>
      </div>

      {checkins.length === 0 ? (
        <p className="text-sm text-zinc-500">No check-ins found in the last 90 days.</p>
      ) : (
        <div className="grid gap-3">
          {checkins.map((entry) => {
            const isExpanded = expandedDate === entry.date;
            const dayTriggers = triggersByDate[entry.date] ?? [];

            return (
              <div
                key={entry.date}
                className="grid gap-2 p-4 rounded-xl bg-white/60 border border-zinc-200 cursor-pointer hover:border-zinc-300 transition-colors"
                onClick={() => handleExpand(entry.date)}
              >
                {/* Collapsed view — always visible */}
                <div>
                  <strong>{formatFriendlyDate(entry.date)}</strong>
                  <div className="flex flex-wrap gap-2 text-sm text-zinc-500 mt-0.5">
                    <span>{moodLabel(entry.mood)}</span>
                    <span>Anxiety {entry.anxietyLevel}/10</span>
                  </div>
                </div>

                {entry.symptoms.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {entry.symptoms.map((s) => (
                      <span
                        key={s}
                        className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-amber-100 text-amber-800"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                )}

                {entry.note && (
                  <p className="text-sm text-zinc-500 m-0">
                    {isExpanded
                      ? entry.note
                      : entry.note.slice(0, 120) + (entry.note.length > 120 ? "..." : "")}
                  </p>
                )}

                {/* Expanded view */}
                {isExpanded && (
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="rounded-2xl border border-zinc-200 bg-white/80 p-4">
                        <p className="text-xs text-zinc-500 m-0">Energy</p>
                        <p className="text-2xl font-bold m-0 mt-1">{entry.energy}/5</p>
                      </div>
                      <div className="rounded-2xl border border-zinc-200 bg-white/80 p-4">
                        <p className="text-xs text-zinc-500 m-0">Sleep quality</p>
                        <p className="text-2xl font-bold m-0 mt-1">{entry.sleepQuality}/5</p>
                      </div>
                      <div className="rounded-2xl border border-zinc-200 bg-white/80 p-4">
                        <p className="text-xs text-zinc-500 m-0">Anxiety</p>
                        <p className="text-2xl font-bold m-0 mt-1">{entry.anxietyLevel}/10</p>
                      </div>
                    </div>

                    {entry.symptomNote && (
                      <p className="text-sm text-zinc-500 m-0">{entry.symptomNote}</p>
                    )}

                    {entry.medicationStatuses.length > 0 && (
                      <Card title="Medications">
                        <div className="grid gap-3">
                          {entry.medicationStatuses.map((med) => (
                            <div
                              key={med.medicationId}
                              className="grid gap-2 p-4 rounded-xl bg-white/60 border border-zinc-200"
                            >
                              <div>
                                <strong>{med.name}</strong>
                                <div className="flex flex-wrap gap-2 text-sm text-zinc-500 mt-0.5">
                                  <span>{med.status}</span>
                                  {med.note && <span>{med.note}</span>}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </Card>
                    )}

                    {dayTriggers.length > 0 && (
                      <Card title="Triggers">
                        {dayTriggers.map((trig) => (
                          <div key={trig.id} style={{ marginBottom: "0.5rem" }}>
                            <div className="flex flex-wrap gap-1.5">
                              {trig.stressTags.map((t) => (
                                <span
                                  key={t}
                                  className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-amber-100 text-amber-800"
                                >
                                  {t}
                                </span>
                              ))}
                              {trig.consumedTags.map((t) => (
                                <span
                                  key={t}
                                  className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-amber-100 text-amber-800"
                                >
                                  {t}
                                </span>
                              ))}
                            </div>
                            {trig.note && (
                              <p className="text-sm text-zinc-500 m-0 mt-1">{trig.note}</p>
                            )}
                          </div>
                        ))}
                      </Card>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
