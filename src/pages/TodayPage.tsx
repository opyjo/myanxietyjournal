import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useSearchParams } from "react-router-dom";
import { z } from "zod";
import {
  medicationStatusOptions,
  moodOptions,
  symptomOptions,
} from "../../shared/constants";
import { formatFriendlyDate, shiftDateKey, todayDateKey } from "../../shared/date";
import { dailyCheckinSchema } from "../../shared/validation";
import type { DailyCheckin, MedicationItem } from "../../shared/types";
import Card from "../components/Card";
import ChipGroup from "../components/ChipGroup";
import ScaleInput from "../components/ScaleInput";
import { Button } from "../components/ui/button";
import { useAuth } from "../hooks/useAuth";
import { buildDefaultCheckinForm, buildMedicationSnapshot } from "../lib/checkin";
import { generateDailyReflection } from "../lib/ai";
import { saveDailyCheckin, watchDailyCheckin, watchMedications } from "../lib/firestore";
import { cn } from "../lib/utils";

type CheckinFormValues = z.infer<typeof dailyCheckinSchema>;

export default function TodayPage() {
  const { user } = useAuth();
  const today = useMemo(() => todayDateKey(), []);
  const [searchParams] = useSearchParams();

  const initialDate = useMemo(() => {
    const param = searchParams.get("date");
    if (!param) return today;
    const minDate = shiftDateKey(today, -90);
    if (/^\d{4}-\d{2}-\d{2}$/.test(param) && param <= today && param >= minDate)
      return param;
    return today;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // read once on mount

  const [selectedDate, setSelectedDate] = useState<string>(initialDate);
  const isPastDate = selectedDate < today;

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
    if (!user) return;
    setExistingCheckin(null);
    const unsubscribeMedications = watchMedications(user.uid, setMedications);
    const unsubscribeCheckin = watchDailyCheckin(user.uid, selectedDate, setExistingCheckin);
    return () => {
      unsubscribeMedications();
      unsubscribeCheckin();
    };
  }, [selectedDate, user]);

  // Clear reflection when date changes
  useEffect(() => {
    setReflection(null);
    setReflectionLoading(false);
  }, [selectedDate]);

  // Only fetch reflection for today
  useEffect(() => {
    if (!user || !existingCheckin || selectedDate !== today) return;
    let cancelled = false;
    setReflectionLoading(true);
    generateDailyReflection(user.uid, today)
      .then((result) => {
        if (!cancelled) setReflection(result.text);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setReflectionLoading(false);
      });
    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingCheckin?.updatedAt, selectedDate, today, user]);

  useEffect(() => {
    const medicationStatuses = buildMedicationSnapshot(
      medications,
      existingCheckin?.medicationStatuses,
    );
    if (existingCheckin) {
      reset({ ...existingCheckin, medicationStatuses });
      return;
    }
    reset(buildDefaultCheckinForm(selectedDate, medications));
  }, [existingCheckin, medications, reset, selectedDate]);

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
      setSaveState(
        isPastDate
          ? `Saved check-in for ${formatFriendlyDate(selectedDate)}.`
          : "Saved. You can come back and adjust this check-in any time today.",
      );
      if (!isPastDate) {
        setReflectionLoading(true);
        generateDailyReflection(user.uid, today)
          .then((result) => setReflection(result.text))
          .catch(() => {})
          .finally(() => setReflectionLoading(false));
      }
    } catch (error) {
      console.error("Save check-in failed:", error);
      setSaveError(
        error instanceof Error
          ? error.message
          : "Something went wrong saving your check-in. Please try again.",
      );
    }
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-1 py-1">
        <p className="text-xs uppercase tracking-widest text-zinc-400">
          {isPastDate ? "Past check-in" : "Today"}
        </p>
        <h2 className="text-2xl font-bold tracking-tight m-0">
          {isPastDate ? `Check-in for ${formatFriendlyDate(selectedDate)}` : "A short check-in for right now"}
        </h2>
        <p className="text-zinc-500 max-w-xl m-0 text-sm">
          Keep it light. A few taps are enough. You can always add detail later.
        </p>
        <div className="flex items-center gap-3 flex-wrap mt-2">
          <label className="grid gap-1">
            <span className="text-xs text-zinc-500">Date</span>
            <input
              type="date"
              className="rounded-lg border border-zinc-200 bg-white/80 px-3 py-2 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-[#b97344]/40"
              value={selectedDate}
              min={shiftDateKey(today, -90)}
              max={today}
              onChange={(e) => {
                const val = e.target.value;
                if (val && val <= today && val >= shiftDateKey(today, -90))
                  setSelectedDate(val);
              }}
            />
          </label>
          {isPastDate && (
            <button
              type="button"
              className="text-sm text-[#b97344] underline underline-offset-2"
              onClick={() => setSelectedDate(today)}
            >
              Back to today
            </button>
          )}
        </div>
      </div>

      {isPastDate && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 text-sm">
          Filling in a check-in for <strong>{formatFriendlyDate(selectedDate)}</strong>.
          This will be saved to that date in your history.
        </div>
      )}

      <form className="grid gap-3" onSubmit={handleSubmit(onSubmit, onValidationError)}>
        <Card title="How today feels" subtitle="Tap the number that fits best.">
          <ScaleInput
            label="Anxiety level"
            helper="1 = very low, 10 = very high"
            min={1}
            max={10}
            value={formValues.anxietyLevel}
            onChange={(value) => setValue("anxietyLevel", value)}
          />
          <div className="grid gap-1.5">
            <div className="flex justify-between items-center gap-4">
              <span className="text-sm font-semibold text-zinc-800">Mood</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {moodOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setValue("mood", option.value)}
                  className={cn(
                    "inline-flex items-center rounded-full px-3 py-1 text-sm font-medium border transition-all hover:-translate-y-px cursor-pointer",
                    formValues.mood === option.value
                      ? "bg-gradient-to-br from-[#b97344] to-[#9b5f38] text-white border-transparent shadow-md"
                      : "bg-white/70 border-zinc-200 text-zinc-800",
                  )}
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
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1.5">
              <span className="text-sm font-medium text-zinc-700">Add another symptom</span>
              <input
                className="flex w-full rounded-xl border border-zinc-200 bg-white/80 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b97344]/40"
                value={customSymptom}
                onChange={(event) => setCustomSymptom(event.target.value)}
                placeholder="e.g. jaw tension"
              />
            </label>
            <div className="flex items-end">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  const value = customSymptom.trim();
                  if (!value) return;
                  setValue("symptoms", toggleSelection(formValues.symptoms, value));
                  setCustomSymptom("");
                }}
              >
                Add symptom
              </Button>
            </div>
          </div>
          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-zinc-700">Physical symptom notes</span>
            <textarea
              className="flex min-h-[5rem] w-full rounded-xl border border-zinc-200 bg-white/80 px-3 py-2 text-sm placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b97344]/40 resize-vertical"
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
            <p className="text-sm text-zinc-500 m-0">
              No active medications or supplements yet. Add them in Settings to track
              them here.
            </p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {formValues.medicationStatuses.map((status, index) => (
                <div
                  key={status.medicationId}
                  className="grid gap-2 p-3 rounded-xl bg-white/60 border border-zinc-200 flex-1 min-w-[220px]"
                >
                  <div>
                    <strong>{status.name}</strong>
                    <div className="flex flex-wrap gap-2 text-sm text-zinc-500 mt-0.5">
                      <span>{status.kind}</span>
                      {status.dosageLabel ? <span>{status.dosageLabel}</span> : null}
                    </div>
                  </div>
                  <select
                    value={formValues.medicationStatuses[index]?.status}
                    onChange={(event) =>
                      setValue(
                        `medicationStatuses.${index}.status`,
                        event.target.value as "taken" | "skipped" | "not_logged",
                      )
                    }
                    className="w-full rounded-lg border border-zinc-200 bg-white/80 px-3 py-2 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-[#b97344]/40 cursor-pointer"
                  >
                    {medicationStatusOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <label className="grid gap-1.5">
                    <span className="text-sm font-medium text-zinc-700">Optional note</span>
                    <input
                      className="flex w-full rounded-xl border border-zinc-200 bg-white/80 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b97344]/40"
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
          <div className="grid gap-1.5">
            <span className="text-sm font-medium text-zinc-700">Sleep times</span>
            <div className="flex flex-wrap gap-3">
              <label className="grid gap-1">
                <span className="text-xs text-zinc-500">Went to bed</span>
                <input
                  type="time"
                  className="rounded-lg border border-zinc-200 bg-white/80 px-3 py-2 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-[#b97344]/40"
                  value={formValues.bedTime || ""}
                  onChange={(event) => setValue("bedTime", event.target.value)}
                />
              </label>
              <label className="grid gap-1">
                <span className="text-xs text-zinc-500">Woke up</span>
                <input
                  type="time"
                  className="rounded-lg border border-zinc-200 bg-white/80 px-3 py-2 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-[#b97344]/40"
                  value={formValues.wakeTime || ""}
                  onChange={(event) => setValue("wakeTime", event.target.value)}
                />
              </label>
              <label className="grid gap-1">
                <span className="text-xs text-zinc-500">Got up from bed</span>
                <input
                  type="time"
                  className="rounded-lg border border-zinc-200 bg-white/80 px-3 py-2 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-[#b97344]/40"
                  value={formValues.riseTime || ""}
                  onChange={(event) => setValue("riseTime", event.target.value)}
                />
              </label>
            </div>
          </div>
          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-zinc-700">Notes</span>
            <textarea
              className="flex min-h-[5rem] w-full rounded-xl border border-zinc-200 bg-white/80 px-3 py-2 text-sm placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b97344]/40 resize-vertical"
              value={formValues.note || ""}
              onChange={(event) => setValue("note", event.target.value)}
              placeholder="What helped, what felt hard, anything you want to remember"
            />
          </label>
          {errors.root?.message ? (
            <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 p-3 text-sm">
              {errors.root.message}
            </div>
          ) : null}
          {saveError ? (
            <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 p-3 text-sm">
              {saveError}
            </div>
          ) : null}
          {saveState ? (
            <div className="rounded-xl bg-green-50 border border-green-200 text-green-700 p-3 text-sm">
              {saveState}
            </div>
          ) : null}
          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? "Saving..."
                : isPastDate
                  ? `Save check-in for ${formatFriendlyDate(selectedDate)}`
                  : "Save today's check-in"}
            </Button>
          </div>
        </Card>
      </form>

      {(reflectionLoading || reflection) ? (
        <div className="grid gap-3">
          <Card title="Your daily reflection" subtitle="A quick thought based on today's check-in.">
            {reflectionLoading && !reflection ? (
              <p className="text-sm text-zinc-500 m-0">Thinking...</p>
            ) : (
              <p className="m-0">{reflection}</p>
            )}
          </Card>
        </div>
      ) : null}
    </div>
  );
}
