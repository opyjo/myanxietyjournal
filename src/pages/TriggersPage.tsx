import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { consumedItemOptions, stressEventOptions } from "../../shared/constants";
import { formatFriendlyDateTime, toLocalDateTimeInputValue } from "../../shared/date";
import { triggerLogSchema } from "../../shared/validation";
import type { TriggerLog } from "../../shared/types";
import Card from "../components/Card";
import ChipGroup from "../components/ChipGroup";
import { Button } from "../components/ui/button";
import { useAuth } from "../hooks/useAuth";
import { deleteTriggerLog, listRecentTriggerLogs, saveTriggerLog } from "../lib/firestore";

type TriggerFormValues = z.infer<typeof triggerLogSchema>;

const defaultValues: TriggerFormValues = {
  occurredAtInput: toLocalDateTimeInputValue(),
  stressTags: [],
  consumedTags: [],
  note: "",
};

export default function TriggersPage() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<TriggerLog[]>([]);
  const [editingLog, setEditingLog] = useState<TriggerLog | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const { handleSubmit, watch, reset, setValue, formState } = useForm<TriggerFormValues>({
    resolver: zodResolver(triggerLogSchema),
    defaultValues,
  });

  const values = watch();

  async function refresh() {
    if (!user) return;
    const result = await listRecentTriggerLogs(user.uid);
    setLogs(result);
  }

  useEffect(() => {
    void refresh();
  }, [user]);

  function toggleSelection(list: string[], value: string) {
    return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
  }

  async function onSubmit(formValues: TriggerFormValues) {
    if (!user) return;
    await saveTriggerLog(user.uid, formValues, editingLog?.id);
    setMessage(editingLog ? "Trigger log updated." : "Trigger log saved.");
    setEditingLog(null);
    reset({ ...defaultValues, occurredAtInput: toLocalDateTimeInputValue() });
    await refresh();
  }

  return (
    <div className="grid gap-5">
      <div className="grid gap-1.5 py-1">
        <p className="text-xs uppercase tracking-widest text-zinc-400">Triggers</p>
        <h2 className="text-3xl font-bold tracking-tight m-0">
          Capture what happened around the spike
        </h2>
        <p className="text-zinc-500 max-w-xl m-0">
          Free text is welcome, but quick tags make patterns easier to review later.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4 items-start">
        <form onSubmit={handleSubmit(onSubmit)}>
          <Card
            title={editingLog ? "Edit trigger log" : "New trigger log"}
            subtitle="What happened, what you consumed, and any notes that matter."
          >
            <label className="grid gap-1.5">
              <span className="text-sm font-medium text-zinc-700">When did this happen?</span>
              <input
                className="flex w-full rounded-xl border border-zinc-200 bg-white/80 px-3.5 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b97344]/40"
                type="datetime-local"
                value={values.occurredAtInput}
                onChange={(event) => setValue("occurredAtInput", event.target.value)}
              />
            </label>
            <div className="grid gap-2.5">
              <span className="text-sm font-semibold text-zinc-800">Stress events</span>
              <ChipGroup
                items={stressEventOptions}
                selectedValues={values.stressTags}
                onToggle={(value) =>
                  setValue("stressTags", toggleSelection(values.stressTags, value))
                }
              />
            </div>
            <div className="grid gap-2.5">
              <span className="text-sm font-semibold text-zinc-800">What was consumed?</span>
              <ChipGroup
                items={consumedItemOptions}
                selectedValues={values.consumedTags}
                onToggle={(value) =>
                  setValue("consumedTags", toggleSelection(values.consumedTags, value))
                }
              />
            </div>
            <label className="grid gap-1.5">
              <span className="text-sm font-medium text-zinc-700">Notes</span>
              <textarea
                className="flex min-h-[8rem] w-full rounded-xl border border-zinc-200 bg-white/80 px-3.5 py-2.5 text-sm placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b97344]/40 resize-vertical"
                value={values.note || ""}
                onChange={(event) => setValue("note", event.target.value)}
                placeholder="What stood out? What did you notice in your body or thoughts?"
              />
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
                  : editingLog
                    ? "Update trigger log"
                    : "Save trigger log"}
              </Button>
              {editingLog ? (
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => {
                    setEditingLog(null);
                    reset({ ...defaultValues, occurredAtInput: toLocalDateTimeInputValue() });
                  }}
                >
                  Cancel edit
                </Button>
              ) : null}
            </div>
          </Card>
        </form>

        <Card title="Recent logs" subtitle="Your latest 20 entries.">
          {logs.length === 0 ? (
            <p className="text-sm text-zinc-500 m-0">
              No triggers logged yet. Start with a rough note or a couple of tags.
            </p>
          ) : (
            <div className="grid gap-3">
              {logs.map((log) => (
                <article
                  key={log.id}
                  className="grid gap-2 p-4 rounded-xl bg-white/60 border border-zinc-200"
                >
                  <div className="flex flex-wrap gap-2 text-sm text-zinc-500">
                    <span>{formatFriendlyDateTime(log.occurredAt)}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {log.stressTags.map((tag) => (
                      <span
                        key={`${log.id}-stress-${tag}`}
                        className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-amber-100 text-amber-800"
                      >
                        {tag}
                      </span>
                    ))}
                    {log.consumedTags.map((tag) => (
                      <span
                        key={`${log.id}-consume-${tag}`}
                        className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-amber-100 text-amber-800"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  {log.note ? <p className="text-sm text-zinc-500 m-0">{log.note}</p> : null}
                  <div className="flex flex-wrap gap-3">
                    <Button
                      variant="secondary"
                      type="button"
                      size="sm"
                      onClick={() => {
                        setEditingLog(log);
                        reset({
                          occurredAtInput: toLocalDateTimeInputValue(new Date(log.occurredAt)),
                          stressTags: log.stressTags,
                          consumedTags: log.consumedTags,
                          note: log.note || "",
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
                        await deleteTriggerLog(user.uid, log.id);
                        setMessage("Trigger log deleted.");
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
