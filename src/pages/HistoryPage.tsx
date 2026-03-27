import { useCallback, useEffect, useMemo, useState } from "react";
import { moodOptions } from "../../shared/constants";
import { buildPresetRange, formatFriendlyDate } from "../../shared/date";
import type { DailyCheckin, TriggerLog } from "../../shared/types";
import Card from "../components/Card";
import { useAuth } from "../hooks/useAuth";
import {
  getRangeCheckins,
  getRangeTriggerLogs,
} from "../lib/firestore";
import styles from "./Page.module.css";

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
      <div className={styles.page}>
        <div className={styles.pageHeader}>
          <p className={styles.eyebrow}>History</p>
          <h2 className={styles.title}>Past check-ins</h2>
        </div>
        <p className={styles.smallNote}>Loading...</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <p className={styles.eyebrow}>History</p>
        <h2 className={styles.title}>Past check-ins</h2>
        <p className={styles.subtitle}>
          Browse your journal entries from the last 90 days.
        </p>
      </div>

      {checkins.length === 0 ? (
        <p className={styles.smallNote}>No check-ins found in the last 90 days.</p>
      ) : (
        <div className={styles.list}>
          {checkins.map((entry) => {
            const isExpanded = expandedDate === entry.date;
            const dayTriggers = triggersByDate[entry.date] ?? [];

            return (
              <div
                key={entry.date}
                className={styles.listItem}
                style={{ cursor: "pointer" }}
                onClick={() => handleExpand(entry.date)}
              >
                {/* Collapsed view — always visible */}
                <div>
                  <strong>{formatFriendlyDate(entry.date)}</strong>
                  <div className={styles.listMeta}>
                    <span>{moodLabel(entry.mood)}</span>
                    <span>Anxiety {entry.anxietyLevel}/10</span>
                  </div>
                </div>

                {entry.symptoms.length > 0 && (
                  <div className={styles.tagRow}>
                    {entry.symptoms.map((s) => (
                      <span key={s} className={styles.tag}>{s}</span>
                    ))}
                  </div>
                )}

                {entry.note && (
                  <p className={styles.smallNote}>
                    {isExpanded ? entry.note : entry.note.slice(0, 120) + (entry.note.length > 120 ? "..." : "")}
                  </p>
                )}

                {/* Expanded view */}
                {isExpanded && (
                  <>
                    <div className={styles.metricGrid}>
                      <div className={styles.metricCard}>
                        <p className={styles.metricLabel}>Energy</p>
                        <p className={styles.metricValue}>{entry.energy}/5</p>
                      </div>
                      <div className={styles.metricCard}>
                        <p className={styles.metricLabel}>Sleep quality</p>
                        <p className={styles.metricValue}>{entry.sleepQuality}/5</p>
                      </div>
                      <div className={styles.metricCard}>
                        <p className={styles.metricLabel}>Anxiety</p>
                        <p className={styles.metricValue}>{entry.anxietyLevel}/10</p>
                      </div>
                    </div>

                    {entry.symptomNote && (
                      <p className={styles.smallNote}>{entry.symptomNote}</p>
                    )}

                    {entry.medicationStatuses.length > 0 && (
                      <Card title="Medications">
                        <div className={styles.list}>
                          {entry.medicationStatuses.map((med) => (
                            <div key={med.medicationId} className={styles.listItem}>
                              <div>
                                <strong>{med.name}</strong>
                                <div className={styles.listMeta}>
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
                            <div className={styles.tagRow}>
                              {trig.stressTags.map((t) => (
                                <span key={t} className={styles.tag}>{t}</span>
                              ))}
                              {trig.consumedTags.map((t) => (
                                <span key={t} className={styles.tag}>{t}</span>
                              ))}
                            </div>
                            {trig.note && (
                              <p className={styles.smallNote}>{trig.note}</p>
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
