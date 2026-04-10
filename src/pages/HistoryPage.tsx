import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { moodOptions } from "../../shared/constants";
import { buildPresetRange, enumerateDateKeys, formatFriendlyDate, shiftDateKey, todayDateKey } from "../../shared/date";
import type { DailyCheckin, TriggerLog } from "../../shared/types";
import Card from "../components/Card";
import { useAuth } from "../hooks/useAuth";
import { getRangeCheckins, getRangeTriggerLogs } from "../lib/firestore";

export default function HistoryPage() {
  const { user } = useAuth();
  const [checkins, setCheckins] = useState<DailyCheckin[]>([]);
  const [triggers, setTriggers] = useState<TriggerLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [expandedDate, setExpandedDate] = useState<string | null>(null);

  const today = useMemo(() => todayDateKey(), []);

  const allDates = useMemo(() => {
    const rangeStart = shiftDateKey(today, -89);
    return enumerateDateKeys(rangeStart, today).reverse(); // newest first
  }, [today]);

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
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load history:", err);
        setLoadError(err instanceof Error ? err.message : "Failed to load history. Please try again.");
        setLoading(false);
      });
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

  if (loadError) {
    return (
      <div className="grid gap-5">
        <div className="grid gap-1.5 py-1">
          <p className="text-xs uppercase tracking-widest text-zinc-400">History</p>
          <h2 className="text-3xl font-bold tracking-tight m-0">Past check-ins</h2>
        </div>
        <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 p-4 text-sm">
          {loadError}
        </div>
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
                className="grid gap-3 p-5 rounded-xl bg-white/60 border border-zinc-200 cursor-pointer hover:border-zinc-300 transition-colors"
                onClick={() => handleExpand(entry.date)}
              >
                {/* Summary header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="font-semibold text-zinc-800 m-0">{formatFriendlyDate(entry.date)}</p>
                      <p className="text-sm text-zinc-500 m-0 mt-0.5">{moodLabel(entry.mood)}</p>
                    </div>
                    <Link
                      to={`/app/today?date=${entry.date}`}
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center rounded-full bg-gradient-to-br from-[#b97344] to-[#9b5f38] px-3 py-1 text-xs font-semibold text-white shadow-sm hover:shadow-md hover:-translate-y-px transition-all"
                    >
                      Edit
                    </Link>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <p className="text-xs text-zinc-400 m-0">Anxiety</p>
                      <p className={`text-lg font-bold m-0 leading-none ${entry.anxietyLevel >= 7 ? "text-red-500" : entry.anxietyLevel >= 4 ? "text-amber-500" : "text-green-600"}`}>
                        {entry.anxietyLevel}<span className="text-xs font-normal text-zinc-400">/10</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-zinc-400 m-0">Energy</p>
                      <p className="text-lg font-bold m-0 leading-none text-zinc-700">
                        {entry.energy}<span className="text-xs font-normal text-zinc-400">/5</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-zinc-400 m-0">Sleep</p>
                      <p className="text-lg font-bold m-0 leading-none text-zinc-700">
                        {entry.sleepQuality}<span className="text-xs font-normal text-zinc-400">/5</span>
                      </p>
                    </div>
                    {entry.motivation != null && (
                      <div className="text-right">
                        <p className="text-xs text-zinc-400 m-0">Motivation</p>
                        <p className="text-lg font-bold m-0 leading-none text-zinc-700">
                          {entry.motivation}<span className="text-xs font-normal text-zinc-400">/5</span>
                        </p>
                      </div>
                    )}
                    {entry.anxietyWaking != null && (
                      <div className="text-right">
                        <p className="text-xs text-zinc-400 m-0">Waking</p>
                        <p className={`text-lg font-bold m-0 leading-none ${entry.anxietyWaking >= 7 ? "text-red-500" : entry.anxietyWaking >= 4 ? "text-amber-500" : "text-green-600"}`}>
                          {entry.anxietyWaking}<span className="text-xs font-normal text-zinc-400">/10</span>
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Sleep duration inline */}
                {entry.bedTime && entry.wakeTime && (
                  <p className="text-xs text-zinc-400 m-0">
                    Slept {calcSleepDuration(entry.bedTime, entry.wakeTime)} &middot; bed {entry.bedTime}{entry.wakeTime ? ` · up ${entry.wakeTime}` : ""}
                  </p>
                )}

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
                    {dayTriggers.length > 0 && (
                      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-zinc-100 text-zinc-600">
                        {dayTriggers.length} trigger{dayTriggers.length > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                )}

                {entry.note && (
                  <p className="text-sm text-zinc-500 m-0 leading-relaxed">
                    {isExpanded
                      ? entry.note
                      : entry.note.slice(0, 160) + (entry.note.length > 160 ? "…" : "")}
                  </p>
                )}

                {/* Expanded view */}
                {isExpanded && (
                  <>
                    {entry.gratitude && (
                      <p className="text-sm text-zinc-600 m-0">
                        <span className="font-medium">Grateful for:</span> {entry.gratitude}
                      </p>
                    )}

                    {entry.riseTime && (
                      <div className="flex flex-wrap gap-3">
                        <div className="rounded-xl border border-zinc-200 bg-white/80 px-3 py-2">
                          <p className="text-xs text-zinc-500 m-0">Got up</p>
                          <p className="text-sm font-semibold m-0">{entry.riseTime}</p>
                        </div>
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
