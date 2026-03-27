import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  medicationStatusOptions,
  moodOptions,
  symptomOptions,
} from "../../shared/constants";
import { todayDateKey } from "../../shared/date";
import { dailyCheckinSchema } from "../../shared/validation";
import type { DailyCheckin, MedicationItem } from "../../shared/types";
import Card from "../components/Card";
import ChipGroup from "../components/ChipGroup";
import ScaleInput from "../components/ScaleInput";
import { useAuth } from "../hooks/useAuth";
import { buildDefaultCheckinForm, buildMedicationSnapshot } from "../lib/checkin";
import { callGenerateDailyReflection, saveDailyCheckin, watchDailyCheckin, watchMedications } from "../lib/firestore";
import styles from "./Page.module.css";
import ui from "../components/ui.module.css";

type CheckinFormValues = z.infer<typeof dailyCheckinSchema>;

export default function TodayPage() {
  const { user } = useAuth();
  const today = useMemo(() => todayDateKey(), []);
  const [medications, setMedications] = useState<MedicationItem[]>([]);
  const [existingCheckin, setExistingCheckin] = useState<DailyCheckin | null>(null);
  const [customSymptom, setCustomSymptom] = useState("");
  const [saveState, setSaveState] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [reflection, setReflection] = useState<string | null>(null);
  const [reflectionLoading, setReflectionLoading] = useState(false);

  const {
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CheckinFormValues>({
    resolver: zodResolver(dailyCheckinSchema),
    defaultValues: buildDefaultCheckinForm(today, []),
  });

  const formValues = watch();

  useEffect(() => {
    if (!user) {
      return;
    }

    const unsubscribeMedications = watchMedications(user.uid, setMedications);
    const unsubscribeCheckin = watchDailyCheckin(user.uid, today, setExistingCheckin);

    return () => {
      unsubscribeMedications();
      unsubscribeCheckin();
    };
  }, [today, user]);

  useEffect(() => {
    if (!user || !existingCheckin) {
      return;
    }

    let cancelled = false;
    setReflectionLoading(true);
    callGenerateDailyReflection(today)
      .then((result) => {
        if (!cancelled) {
          setReflection(result.text);
        }
      })
      .catch(() => {
        // Reflection is a bonus — fail silently
      })
      .finally(() => {
        if (!cancelled) {
          setReflectionLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  // Only load reflection once when existingCheckin first appears
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingCheckin?.updatedAt, today, user]);

  useEffect(() => {
    const medicationStatuses = buildMedicationSnapshot(
      medications,
      existingCheckin?.medicationStatuses,
    );

    if (existingCheckin) {
      reset({
        ...existingCheckin,
        medicationStatuses,
      });
      return;
    }

    reset(buildDefaultCheckinForm(today, medications));
  }, [existingCheckin, medications, reset, today]);

  function toggleSelection(list: string[], value: string) {
    return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
  }

  function onValidationError() {
    setSaveState(null);
    setSaveError("Some fields need attention. Please check the form and try again.");
  }

  async function onSubmit(values: CheckinFormValues) {
    setSaveError(null);

    if (!user) {
      setSaveError("You must be signed in to save.");
      return;
    }

    setSaveState(null);
    try {
      await saveDailyCheckin(user.uid, {
        ...values,
        symptoms: [...new Set(values.symptoms)],
      });
      setSaveState("Saved. You can come back and adjust this check-in any time today.");

      // Generate reflection in background
      setReflectionLoading(true);
      callGenerateDailyReflection(today)
        .then((result) => setReflection(result.text))
        .catch(() => {})
        .finally(() => setReflectionLoading(false));
    } catch (error) {
      console.error("Save check-in failed:", error);
      setSaveError(
        error instanceof Error ? error.message : "Something went wrong saving your check-in. Please try again.",
      );
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <p className={styles.eyebrow}>Today</p>
        <h2 className={styles.title}>A short check-in for right now</h2>
        <p className={styles.subtitle}>
          Keep it light. A few taps are enough. You can always add detail later.
        </p>
      </div>

      <form className={styles.grid} onSubmit={handleSubmit(onSubmit, onValidationError)}>
        <Card title="How today feels" subtitle="Tap the number that fits best.">
          <ScaleInput
            label="Anxiety level"
            helper="1 = very low, 10 = very high"
            min={1}
            max={10}
            value={formValues.anxietyLevel}
            onChange={(value) => setValue("anxietyLevel", value)}
          />
          <div className={ui.fieldBlock}>
            <div className={ui.fieldHeader}>
              <label className={ui.fieldLabel}>Mood</label>
            </div>
            <div className={ui.chipWrap}>
              {moodOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={
                    formValues.mood === option.value ? ui.chipSelected : ui.chip
                  }
                  onClick={() => setValue("mood", option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <ScaleInput
            label="Energy"
            helper="1 = drained, 5 = steady"
            min={1}
            max={5}
            value={formValues.energy}
            onChange={(value) => setValue("energy", value)}
          />
          <ScaleInput
            label="Sleep quality"
            helper="1 = poor, 5 = restful"
            min={1}
            max={5}
            value={formValues.sleepQuality}
            onChange={(value) => setValue("sleepQuality", value)}
          />
        </Card>

        <Card title="Symptoms" subtitle="Choose anything that stood out.">
          <ChipGroup
            items={symptomOptions}
            selectedValues={formValues.symptoms}
            onToggle={(value) =>
              setValue("symptoms", toggleSelection(formValues.symptoms, value))
            }
          />
          <div className={ui.inlineGrid}>
            <label className={ui.inputLabel}>
              <span>Add another symptom</span>
              <input
                className={ui.input}
                value={customSymptom}
                onChange={(event) => setCustomSymptom(event.target.value)}
                placeholder="e.g. jaw tension"
              />
            </label>
            <button
              type="button"
              className={ui.secondaryButton}
              onClick={() => {
                const value = customSymptom.trim();
                if (!value) {
                  return;
                }
                setValue("symptoms", toggleSelection(formValues.symptoms, value));
                setCustomSymptom("");
              }}
            >
              Add symptom
            </button>
          </div>
          <label className={ui.inputLabel}>
            <span>Physical symptom notes</span>
            <textarea
              className={ui.textarea}
              value={formValues.symptomNote || ""}
              onChange={(event) => setValue("symptomNote", event.target.value)}
              placeholder="Anything specific about intensity, timing, or body sensations?"
            />
          </label>
        </Card>

        <Card
          title="Medication or supplement log"
          subtitle="Optional for today. Manage your reusable items in Settings."
        >
          {formValues.medicationStatuses.length === 0 ? (
            <p className={styles.smallNote}>
              No active medications or supplements yet. Add them in Settings to track
              them here.
            </p>
          ) : (
            <div className={styles.list}>
              {formValues.medicationStatuses.map((status, index) => (
                <div key={status.medicationId} className={styles.listItem}>
                  <div>
                    <strong>{status.name}</strong>
                    <div className={styles.listMeta}>
                      <span>{status.kind}</span>
                      {status.dosageLabel ? <span>{status.dosageLabel}</span> : null}
                    </div>
                  </div>
                  <div className={ui.chipWrap}>
                    {medicationStatusOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        className={
                          formValues.medicationStatuses[index]?.status === option.value
                            ? ui.chipSelected
                            : ui.chip
                        }
                        onClick={() =>
                          setValue(`medicationStatuses.${index}.status`, option.value)
                        }
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                  <label className={ui.inputLabel}>
                    <span>Optional note</span>
                    <input
                      className={ui.input}
                      value={formValues.medicationStatuses[index]?.note || ""}
                      onChange={(event) =>
                        setValue(`medicationStatuses.${index}.note`, event.target.value)
                      }
                      placeholder="Timing, missed dose context, side effects"
                    />
                  </label>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Anything else" subtitle="Free text is optional.">
          <label className={ui.inputLabel}>
            <span>Notes</span>
            <textarea
              className={ui.textarea}
              value={formValues.note || ""}
              onChange={(event) => setValue("note", event.target.value)}
              placeholder="What helped, what felt hard, anything you want to remember"
            />
          </label>
          {errors.root?.message ? <div className={styles.alert}>{errors.root.message}</div> : null}
          {saveError ? <div className={styles.alert}>{saveError}</div> : null}
          {saveState ? <div className={styles.success}>{saveState}</div> : null}
          <div className={styles.inlineActions}>
            <button className={ui.primaryButton} type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save today’s check-in"}
            </button>
          </div>
        </Card>
      </form>

      {(reflectionLoading || reflection) ? (
        <div className={styles.grid}>
          <Card title="Your daily reflection" subtitle="A quick thought based on today's check-in.">
            {reflectionLoading && !reflection ? (
              <p className={styles.smallNote}>Thinking...</p>
            ) : (
              <p>{reflection}</p>
            )}
          </Card>
        </div>
      ) : null}
    </div>
  );
}
