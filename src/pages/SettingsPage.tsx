import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { medicationItemSchema } from "../../shared/validation";
import { medicationKindOptions } from "../../shared/constants";
import type { MedicationItem } from "../../shared/types";
import Card from "../components/Card";
import { useAuth } from "../hooks/useAuth";
import {
  saveMedicationItem,
  setMedicationActive,
  watchMedications,
} from "../lib/firestore";
import styles from "./Page.module.css";
import ui from "../components/ui.module.css";

type MedicationFormValues = z.infer<typeof medicationItemSchema>;

const defaultValues: MedicationFormValues = {
  name: "",
  kind: "medication",
  dosageLabel: "",
  active: true,
};

export default function SettingsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<MedicationItem[]>([]);
  const [editing, setEditing] = useState<MedicationItem | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const { handleSubmit, watch, setValue, reset, formState } = useForm<MedicationFormValues>({
    resolver: zodResolver(medicationItemSchema),
    defaultValues,
  });

  const values = watch();

  useEffect(() => {
    if (!user) {
      return;
    }

    return watchMedications(user.uid, setItems);
  }, [user]);

  async function onSubmit(formValues: MedicationFormValues) {
    if (!user) {
      return;
    }

    await saveMedicationItem(user.uid, formValues, editing?.id);
    setMessage(editing ? "Item updated." : "Item added.");
    setEditing(null);
    reset(defaultValues);
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <p className={styles.eyebrow}>Settings</p>
        <h2 className={styles.title}>Medication and supplement tracker</h2>
        <p className={styles.subtitle}>
          Define your reusable items once, then log taken, skipped, or not logged
          from the daily check-in.
        </p>
      </div>

      <div className={styles.twoColumn}>
        <form onSubmit={handleSubmit(onSubmit)}>
          <Card
            title={editing ? "Edit item" : "Add item"}
            subtitle="Keep this light. Name and dosage label are enough for v1."
          >
            <label className={ui.inputLabel}>
              <span>Name</span>
              <input
                className={ui.input}
                value={values.name}
                onChange={(event) => setValue("name", event.target.value)}
                placeholder="e.g. Sertraline"
              />
            </label>
            <div className={ui.fieldBlock}>
              <div className={ui.fieldHeader}>
                <label className={ui.fieldLabel}>Type</label>
              </div>
              <div className={ui.chipWrap}>
                {medicationKindOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={values.kind === option.value ? ui.chipSelected : ui.chip}
                    onClick={() => setValue("kind", option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <label className={ui.inputLabel}>
              <span>Dosage label</span>
              <input
                className={ui.input}
                value={values.dosageLabel || ""}
                onChange={(event) => setValue("dosageLabel", event.target.value)}
                placeholder="e.g. 50 mg morning"
              />
            </label>
            <label className={ui.toggleRow}>
              <input
                type="checkbox"
                checked={values.active}
                onChange={(event) => setValue("active", event.target.checked)}
              />
              <span>Track as active</span>
            </label>
            {message ? <div className={styles.success}>{message}</div> : null}
            {formState.errors.root?.message ? (
              <div className={styles.alert}>{formState.errors.root.message}</div>
            ) : null}
            <div className={styles.inlineActions}>
              <button className={ui.primaryButton} type="submit" disabled={formState.isSubmitting}>
                {formState.isSubmitting
                  ? "Saving..."
                  : editing
                    ? "Update item"
                    : "Add item"}
              </button>
              {editing ? (
                <button
                  type="button"
                  className={ui.secondaryButton}
                  onClick={() => {
                    setEditing(null);
                    reset(defaultValues);
                  }}
                >
                  Cancel edit
                </button>
              ) : null}
            </div>
          </Card>
        </form>

        <Card title="Your items" subtitle="Active items appear on Today.">
          {items.length === 0 ? (
            <p className={styles.smallNote}>
              No items added yet. Supplements can be tracked here too.
            </p>
          ) : (
            <div className={styles.list}>
              {items.map((item) => (
                <article key={item.id} className={styles.listItem}>
                  <div>
                    <strong>{item.name}</strong>
                    <div className={styles.listMeta}>
                      <span>{item.kind}</span>
                      {item.dosageLabel ? <span>{item.dosageLabel}</span> : null}
                      <span>{item.active ? "Active" : "Paused"}</span>
                    </div>
                  </div>
                  <div className={styles.inlineActions}>
                    <button
                      type="button"
                      className={ui.secondaryButton}
                      onClick={() => {
                        setEditing(item);
                        reset({
                          name: item.name,
                          kind: item.kind,
                          dosageLabel: item.dosageLabel || "",
                          active: item.active,
                        });
                      }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className={ui.ghostButton}
                      onClick={async () => {
                        if (!user) {
                          return;
                        }
                        await setMedicationActive(user.uid, item.id, !item.active);
                      }}
                    >
                      {item.active ? "Pause" : "Reactivate"}
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
