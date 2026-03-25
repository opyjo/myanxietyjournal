import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  consumedItemOptions,
  stressEventOptions,
} from "../../shared/constants";
import {
  formatFriendlyDateTime,
  toLocalDateTimeInputValue,
} from "../../shared/date";
import { triggerLogSchema } from "../../shared/validation";
import type { TriggerLog } from "../../shared/types";
import Card from "../components/Card";
import ChipGroup from "../components/ChipGroup";
import { useAuth } from "../hooks/useAuth";
import {
  deleteTriggerLog,
  listRecentTriggerLogs,
  saveTriggerLog,
} from "../lib/firestore";
import styles from "./Page.module.css";
import ui from "../components/ui.module.css";

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
    if (!user) {
      return;
    }

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
    if (!user) {
      return;
    }

    await saveTriggerLog(user.uid, formValues, editingLog?.id);
    setMessage(editingLog ? "Trigger log updated." : "Trigger log saved.");
    setEditingLog(null);
    reset({ ...defaultValues, occurredAtInput: toLocalDateTimeInputValue() });
    await refresh();
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <p className={styles.eyebrow}>Triggers</p>
        <h2 className={styles.title}>Capture what happened around the spike</h2>
        <p className={styles.subtitle}>
          Free text is welcome, but quick tags make patterns easier to review later.
        </p>
      </div>

      <div className={styles.twoColumn}>
        <form onSubmit={handleSubmit(onSubmit)}>
          <Card
            title={editingLog ? "Edit trigger log" : "New trigger log"}
            subtitle="What happened, what you consumed, and any notes that matter."
          >
            <label className={ui.inputLabel}>
              <span>When did this happen?</span>
              <input
                className={ui.input}
                type="datetime-local"
                value={values.occurredAtInput}
                onChange={(event) => setValue("occurredAtInput", event.target.value)}
              />
            </label>
            <div className={ui.fieldBlock}>
              <div className={ui.fieldHeader}>
                <label className={ui.fieldLabel}>Stress events</label>
              </div>
              <ChipGroup
                items={stressEventOptions}
                selectedValues={values.stressTags}
                onToggle={(value) =>
                  setValue("stressTags", toggleSelection(values.stressTags, value))
                }
              />
            </div>
            <div className={ui.fieldBlock}>
              <div className={ui.fieldHeader}>
                <label className={ui.fieldLabel}>What was consumed?</label>
              </div>
              <ChipGroup
                items={consumedItemOptions}
                selectedValues={values.consumedTags}
                onToggle={(value) =>
                  setValue("consumedTags", toggleSelection(values.consumedTags, value))
                }
              />
            </div>
            <label className={ui.inputLabel}>
              <span>Notes</span>
              <textarea
                className={ui.textarea}
                value={values.note || ""}
                onChange={(event) => setValue("note", event.target.value)}
                placeholder="What stood out? What did you notice in your body or thoughts?"
              />
            </label>
            {message ? <div className={styles.success}>{message}</div> : null}
            {formState.errors.root?.message ? (
              <div className={styles.alert}>{formState.errors.root.message}</div>
            ) : null}
            <div className={styles.inlineActions}>
              <button className={ui.primaryButton} type="submit" disabled={formState.isSubmitting}>
                {formState.isSubmitting
                  ? "Saving..."
                  : editingLog
                    ? "Update trigger log"
                    : "Save trigger log"}
              </button>
              {editingLog ? (
                <button
                  className={ui.secondaryButton}
                  type="button"
                  onClick={() => {
                    setEditingLog(null);
                    reset({ ...defaultValues, occurredAtInput: toLocalDateTimeInputValue() });
                  }}
                >
                  Cancel edit
                </button>
              ) : null}
            </div>
          </Card>
        </form>

        <Card title="Recent logs" subtitle="Your latest 20 entries.">
          {logs.length === 0 ? (
            <p className={styles.smallNote}>
              No triggers logged yet. Start with a rough note or a couple of tags.
            </p>
          ) : (
            <div className={styles.list}>
              {logs.map((log) => (
                <article key={log.id} className={styles.listItem}>
                  <div className={styles.listMeta}>
                    <span>{formatFriendlyDateTime(log.occurredAt)}</span>
                  </div>
                  <div className={styles.tagRow}>
                    {log.stressTags.map((tag) => (
                      <span key={`${log.id}-stress-${tag}`} className={styles.tag}>
                        {tag}
                      </span>
                    ))}
                    {log.consumedTags.map((tag) => (
                      <span key={`${log.id}-consume-${tag}`} className={styles.tag}>
                        {tag}
                      </span>
                    ))}
                  </div>
                  {log.note ? <p className={styles.smallNote}>{log.note}</p> : null}
                  <div className={styles.inlineActions}>
                    <button
                      className={ui.secondaryButton}
                      type="button"
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
                    </button>
                    <button
                      className={ui.ghostButton}
                      type="button"
                      onClick={async () => {
                        if (!user) {
                          return;
                        }
                        await deleteTriggerLog(user.uid, log.id);
                        setMessage("Trigger log deleted.");
                        await refresh();
                      }}
                    >
                      Delete
                    </button>
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
