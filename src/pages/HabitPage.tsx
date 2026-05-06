import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { urgeEmotionOptions, urgeTriggerOptions } from "../../shared/constants";
import {
  diffDaysInclusive,
  formatFriendlyDate,
  formatFriendlyDateTime,
  toLocalDateTimeInputValue,
  todayDateKey,
} from "../../shared/date";
import { habitUrgeSchema } from "../../shared/validation";
import type { HabitStreak, HabitUrge } from "../../shared/types";
import Card from "../components/Card";
import ChipGroup from "../components/ChipGroup";
import ScaleInput from "../components/ScaleInput";
import { Button } from "../components/ui/button";
import { useAuth } from "../hooks/useAuth";
import {
  deleteHabitUrge,
  getHabitStreak,
  listRecentHabitUrges,
  saveHabitStreak,
  saveHabitUrge,
} from "../lib/firestore";
import { cn } from "../lib/utils";

type HabitFormValues = z.infer<typeof habitUrgeSchema>;

const defaultValues: HabitFormValues = {
  occurredAtInput: toLocalDateTimeInputValue(),
  intensity: 5,
  triggerTags: [],
  emotionTags: [],
  actedOn: false,
  copingStrategy: "",
  note: "",
};

export default function HabitPage() {
  const { user } = useAuth();
  const [streak, setStreak] = useState<HabitStreak | null>(null);
  const [streakLoaded, setStreakLoaded] = useState(false);
  const [urges, setUrges] = useState<HabitUrge[]>([]);
  const [editingUrge, setEditingUrge] = useState<HabitUrge | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(todayDateKey());

  const { handleSubmit, watch, reset, setValue, formState } = useForm<HabitFormValues>({
    resolver: zodResolver(habitUrgeSchema),
    defaultValues,
  });

  const values = watch();

  async function refresh() {
    if (!user) return;
    const [s, u] = await Promise.all([
      getHabitStreak(user.uid),
      listRecentHabitUrges(user.uid),
    ]);
    setStreak(s);
    setStreakLoaded(true);
    setUrges(u);
  }

  useEffect(() => {
    void refresh();
  }, [user]);

  function toggleSelection(list: string[], value: string) {
    return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
  }

  async function onSubmit(formValues: HabitFormValues) {
    if (!user) return;
    await saveHabitUrge(user.uid, formValues, editingUrge?.id);
    setMessage(editingUrge ? "Urge log updated." : "Urge logged.");
    setEditingUrge(null);
    reset({ ...defaultValues, occurredAtInput: toLocalDateTimeInputValue() });
    await refresh();
  }

  async function handleStartTracking() {
    if (!user) return;
    await saveHabitStreak(user.uid, {
      currentStreakStart: startDate,
      longestStreak: 0,
    });
    await refresh();
  }

  const streakDays =
    streak && streak.currentStreakStart
      ? diffDaysInclusive(streak.currentStreakStart, todayDateKey())
      : 0;

  return (
    <div className="grid gap-5">
      <div className="grid gap-1.5 py-1">
        <p className="text-xs uppercase tracking-widest text-zinc-400">Freedom</p>
        <h2 className="text-3xl font-bold tracking-tight m-0">Break free, one day at a time</h2>
        <p className="text-zinc-500 max-w-xl m-0">
          Track urges, log what helps you resist, and watch your streak grow.
        </p>
      </div>

      {/* Streak Hero Banner */}
      {!streakLoaded ? null : !streak ? (
        <Card title="Start tracking your streak" subtitle="Choose the date your current streak began.">
          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-zinc-700">Streak start date</span>
            <input
              className="flex w-full rounded-xl border border-zinc-200 bg-white/80 px-3.5 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b97344]/40"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </label>
          <Button type="button" onClick={handleStartTracking}>
            Start tracking
          </Button>
        </Card>
      ) : (
        <div className="rounded-2xl bg-gradient-to-br from-[#b97344] to-[#9b5f38] p-6 text-white shadow-lg">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-5xl font-extrabold tracking-tight m-0">
                {streakDays} {streakDays === 1 ? "day" : "days"} free
              </p>
              <p className="text-white/70 text-sm mt-1 m-0">
                Streak started {formatFriendlyDate(streak.currentStreakStart)}
              </p>
            </div>
            <span className="inline-flex items-center rounded-full bg-white/20 px-3 py-1 text-sm font-medium">
              Personal best: {streak.longestStreak} {streak.longestStreak === 1 ? "day" : "days"}
            </span>
          </div>
        </div>
      )}

      {/* Two-column grid */}
      <div className="grid md:grid-cols-2 gap-4 items-start">
        <form onSubmit={handleSubmit(onSubmit)}>
          <Card
            title={editingUrge ? "Edit urge log" : "Log an urge"}
            subtitle="Record what happened — resisted or not."
          >
            <label className="grid gap-1.5">
              <span className="text-sm font-medium text-zinc-700">When?</span>
              <input
                className="flex w-full rounded-xl border border-zinc-200 bg-white/80 px-3.5 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b97344]/40"
                type="datetime-local"
                value={values.occurredAtInput}
                onChange={(e) => setValue("occurredAtInput", e.target.value)}
              />
            </label>

            <ScaleInput
              label="Intensity"
              helper="1 = mild, 10 = overwhelming"
              min={1}
              max={10}
              value={values.intensity}
              onChange={(v) => setValue("intensity", v)}
            />

            <div className="grid gap-2.5">
              <span className="text-sm font-semibold text-zinc-800">Triggers</span>
              <ChipGroup
                items={urgeTriggerOptions}
                selectedValues={values.triggerTags}
                onToggle={(v) => setValue("triggerTags", toggleSelection(values.triggerTags, v))}
              />
            </div>

            <div className="grid gap-2.5">
              <span className="text-sm font-semibold text-zinc-800">Emotions</span>
              <ChipGroup
                items={urgeEmotionOptions}
                selectedValues={values.emotionTags}
                onToggle={(v) => setValue("emotionTags", toggleSelection(values.emotionTags, v))}
              />
            </div>

            <div className="grid gap-2.5">
              <span className="text-sm font-semibold text-zinc-800">Did you act on it?</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setValue("actedOn", false)}
                  className={cn(
                    "flex-1 inline-flex justify-center items-center min-h-[2.75rem] rounded-xl text-sm font-semibold border transition-all cursor-pointer",
                    !values.actedOn
                      ? "bg-green-600 text-white border-transparent shadow-md"
                      : "bg-white/70 border-zinc-200 text-zinc-800",
                  )}
                >
                  Resisted
                </button>
                <button
                  type="button"
                  onClick={() => setValue("actedOn", true)}
                  className={cn(
                    "flex-1 inline-flex justify-center items-center min-h-[2.75rem] rounded-xl text-sm font-semibold border transition-all cursor-pointer",
                    values.actedOn
                      ? "bg-red-600 text-white border-transparent shadow-md"
                      : "bg-white/70 border-zinc-200 text-zinc-800",
                  )}
                >
                  Acted on it
                </button>
              </div>
            </div>

            {!values.actedOn && (
              <label className="grid gap-1.5">
                <span className="text-sm font-medium text-zinc-700">What helped you resist?</span>
                <input
                  className="flex w-full rounded-xl border border-zinc-200 bg-white/80 px-3.5 py-2.5 text-sm placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b97344]/40"
                  type="text"
                  value={values.copingStrategy || ""}
                  onChange={(e) => setValue("copingStrategy", e.target.value)}
                  placeholder="e.g. went for a walk, called a friend"
                />
              </label>
            )}

            <label className="grid gap-1.5">
              <span className="text-sm font-medium text-zinc-700">Notes</span>
              <textarea
                className="flex min-h-[6rem] w-full rounded-xl border border-zinc-200 bg-white/80 px-3.5 py-2.5 text-sm placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b97344]/40 resize-vertical"
                value={values.note || ""}
                onChange={(e) => setValue("note", e.target.value)}
                placeholder="Anything else on your mind?"
                maxLength={600}
              />
              <span className="text-xs text-zinc-400 text-right">
                {(values.note || "").length}/600
              </span>
            </label>

            {message ? (
              <div className="rounded-xl bg-green-50 border border-green-200 text-green-700 p-3 text-sm">
                {message}
              </div>
            ) : null}
            {formState.errors.root?.message ? (
              <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 p-3 text-sm">
                {formState.errors.root.message}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <Button type="submit" disabled={formState.isSubmitting}>
                {formState.isSubmitting
                  ? "Saving..."
                  : editingUrge
                    ? "Update urge log"
                    : "Save urge log"}
              </Button>
              {editingUrge ? (
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => {
                    setEditingUrge(null);
                    reset({ ...defaultValues, occurredAtInput: toLocalDateTimeInputValue() });
                  }}
                >
                  Cancel edit
                </Button>
              ) : null}
            </div>
          </Card>
        </form>

        <Card title="Recent urge log" subtitle="Your latest 20 entries.">
          {urges.length === 0 ? (
            <p className="text-sm text-zinc-500 m-0">
              No urges logged yet. Start tracking when you feel one coming on.
            </p>
          ) : (
            <div className="grid gap-3">
              {urges.map((urge) => (
                <article
                  key={urge.id}
                  className="grid gap-2 p-4 rounded-xl bg-white/60 border border-zinc-200"
                >
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="text-zinc-500">
                      {formatFriendlyDateTime(urge.occurredAt)}
                    </span>
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold",
                        urge.intensity >= 8
                          ? "bg-red-100 text-red-700"
                          : urge.intensity >= 5
                            ? "bg-amber-100 text-amber-700"
                            : "bg-zinc-100 text-zinc-600",
                      )}
                    >
                      {urge.intensity}/10
                    </span>
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
                        urge.actedOn
                          ? "bg-red-100 text-red-700"
                          : "bg-green-100 text-green-700",
                      )}
                    >
                      {urge.actedOn ? "Relapse" : "Resisted"}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {urge.triggerTags.map((tag) => (
                      <span
                        key={`${urge.id}-t-${tag}`}
                        className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-amber-100 text-amber-800"
                      >
                        {tag}
                      </span>
                    ))}
                    {urge.emotionTags.map((tag) => (
                      <span
                        key={`${urge.id}-e-${tag}`}
                        className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-sky-100 text-sky-800"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  {urge.copingStrategy ? (
                    <p className="text-sm text-green-700 m-0">
                      <span className="font-medium">Coping:</span> {urge.copingStrategy}
                    </p>
                  ) : null}
                  {urge.note ? <p className="text-sm text-zinc-500 m-0">{urge.note}</p> : null}
                  <div className="flex flex-wrap gap-3">
                    <Button
                      variant="secondary"
                      type="button"
                      size="sm"
                      onClick={() => {
                        setEditingUrge(urge);
                        reset({
                          occurredAtInput: toLocalDateTimeInputValue(new Date(urge.occurredAt)),
                          intensity: urge.intensity,
                          triggerTags: urge.triggerTags,
                          emotionTags: urge.emotionTags,
                          actedOn: urge.actedOn,
                          copingStrategy: urge.copingStrategy || "",
                          note: urge.note || "",
                        });
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      type="button"
                      size="sm"
                      onClick={async () => {
                        if (!user) return;
                        await deleteHabitUrge(user.uid, urge.id);
                        setMessage("Urge log deleted.");
                        await refresh();
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
