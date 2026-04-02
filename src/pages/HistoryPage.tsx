import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { moodOptions } from "../../shared/constants";
import { buildPresetRange, enumerateDateKeys, formatFriendlyDate, todayDateKey } from "../../shared/date";
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

  const today = useMemo(() => todayDateKey(), []);

  const allDates = useMemo(() => {
    const { rangeStart, rangeEnd } = buildPresetRange(90);
    return enumerateDateKeys(rangeStart, rangeEnd).reverse(); // newest first
  }, []);

  const checkinDateSet = useMemo(
    () => new Set(checkins.map((c) => c.date)),
    [checkins],
  );

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

  function calcSleepDuration(bedTime: string, wakeTime: string): string {
    const [bedH, bedM] = bedTime.split(":").map(Number);
    const [wakeH, wakeM] = wakeTime.split(":").map(Number);
    let bedMinutes = bedH * 60 + bedM;
    let wakeMinutes = wakeH * 60 + wakeM;
    if (wakeMinutes <= bedMinutes) wakeMinutes += 24 * 60; // crosses midnight
    const total = wakeMinutes - bedMinutes;
    const h = Math.floor(total / 60);
    const m = total % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
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

      {checkins.length === 0 && allDates.every((d) => d === today) ? (
        <p className="text-sm text-zinc-500">No check-ins found in the last 90 days.</p>
      ) : (
        <div className="grid gap-3">
          {allDates.map((dateKey) => {
            if (!checkinDateSet.has(dateKey)) {
              if (dateKey === today) return null;
              return (
                <div key={dateKey} className="flex justify-between items-center p-4 rounded-xl bg-white/40 border border-dashed border-zinc-200">
                  <div>
                    <p className="font-medium text-zinc-500 m-0">{formatFriendlyDate(dateKey)}</p>
                    <p className="text-xs text-zinc-400 m-0">No check-in recorded</p>
                  </div>
                  <Link
                    to={`/app/today?date=${dateKey}`}
                    className="inline-flex items-center rounded-full border border-zinc-200 bg-white/60 px-4 py-2 text-sm text-zinc-600 hover:-translate-y-px transition-all"
                  >
                    Add check-in
                  </Link>
                </div>
              );
            }

            const entry = checkins.find((c) => c.date === dateKey)!;
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

                    {(entry.bedTime || entry.wakeTime || entry.riseTime) && (
                      <div className="flex flex-wrap gap-3">
                        {entry.bedTime && (
                          <div className="rounded-xl border border-zinc-200 bg-white/80 px-3 py-2">
                            <p className="text-xs text-zinc-500 m-0">Went to bed</p>
                            <p className="text-sm font-semibold m-0">{entry.bedTime}</p>
                          </div>
                        )}
                        {entry.wakeTime && (
                          <div className="rounded-xl border border-zinc-200 bg-white/80 px-3 py-2">
                            <p className="text-xs text-zinc-500 m-0">Woke up</p>
                            <p className="text-sm font-semibold m-0">{entry.wakeTime}</p>
                          </div>
                        )}
                        {entry.riseTime && (
                          <div className="rounded-xl border border-zinc-200 bg-white/80 px-3 py-2">
                            <p className="text-xs text-zinc-500 m-0">Got up</p>
                            <p className="text-sm font-semibold m-0">{entry.riseTime}</p>
                          </div>
                        )}
                        {entry.bedTime && entry.wakeTime && (
                          <div className="rounded-xl border border-zinc-200 bg-amber-50 px-3 py-2">
                            <p className="text-xs text-zinc-500 m-0">Sleep duration</p>
                            <p className="text-sm font-semibold m-0">{calcSleepDuration(entry.bedTime, entry.wakeTime)}</p>
                          </div>
                        )}
                      </div>
                    )}

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
