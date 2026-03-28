import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { medicationItemSchema } from "../../shared/validation";
import { medicationKindOptions } from "../../shared/constants";
import type { MedicationItem } from "../../shared/types";
import Card from "../components/Card";
import { Button } from "../components/ui/button";
import { useAuth } from "../hooks/useAuth";
import { saveMedicationItem, setMedicationActive, watchMedications } from "../lib/firestore";
import { cn } from "../lib/utils";

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
    if (!user) return;
    return watchMedications(user.uid, setItems);
  }, [user]);

  async function onSubmit(formValues: MedicationFormValues) {
    if (!user) return;
    await saveMedicationItem(user.uid, formValues, editing?.id);
    setMessage(editing ? "Item updated." : "Item added.");
    setEditing(null);
    reset(defaultValues);
  }

  return (
    <div className="grid gap-5">
      <div className="grid gap-1.5 py-1">
        <p className="text-xs uppercase tracking-widest text-zinc-400">Settings</p>
        <h2 className="text-3xl font-bold tracking-tight m-0">
          Medication and supplement tracker
        </h2>
        <p className="text-zinc-500 max-w-xl m-0">
          Define your reusable items once, then log taken, skipped, or not logged from the daily
          check-in.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4 items-start">
        <form onSubmit={handleSubmit(onSubmit)}>
          <Card
            title={editing ? "Edit item" : "Add item"}
            subtitle="Keep this light. Name and dosage label are enough for v1."
          >
            <label className="grid gap-1.5">
              <span className="text-sm font-medium text-zinc-700">Name</span>
              <input
                className="flex w-full rounded-xl border border-zinc-200 bg-white/80 px-3.5 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b97344]/40"
                value={values.name}
                onChange={(event) => setValue("name", event.target.value)}
                placeholder="e.g. Sertraline"
              />
            </label>
            <div className="grid gap-2.5">
              <span className="text-sm font-semibold text-zinc-800">Type</span>
              <div className="flex flex-wrap gap-2">
                {medicationKindOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setValue("kind", option.value)}
                    className={cn(
                      "inline-flex items-center rounded-full px-3.5 py-2 text-sm font-medium border transition-all hover:-translate-y-px cursor-pointer",
                      values.kind === option.value
                        ? "bg-gradient-to-br from-[#b97344] to-[#9b5f38] text-white border-transparent shadow-md"
                        : "bg-white/70 border-zinc-200 text-zinc-800",
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <label className="grid gap-1.5">
              <span className="text-sm font-medium text-zinc-700">Dosage label</span>
              <input
                className="flex w-full rounded-xl border border-zinc-200 bg-white/80 px-3.5 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b97344]/40"
                value={values.dosageLabel || ""}
                onChange={(event) => setValue("dosageLabel", event.target.value)}
                placeholder="e.g. 50 mg morning"
              />
            </label>
            <label className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-white/55 border border-zinc-200">
              <input
                type="checkbox"
                checked={values.active}
                onChange={(event) => setValue("active", event.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium text-zinc-700">Track as active</span>
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
                {formState.isSubmitting ? "Saving..." : editing ? "Update item" : "Add item"}
              </Button>
              {editing ? (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setEditing(null);
                    reset(defaultValues);
                  }}
                >
                  Cancel edit
                </Button>
              ) : null}
            </div>
          </Card>
        </form>

        <Card title="Your items" subtitle="Active items appear on Today.">
          {items.length === 0 ? (
            <p className="text-sm text-zinc-500 m-0">
              No items added yet. Supplements can be tracked here too.
            </p>
          ) : (
            <div className="grid gap-3">
              {items.map((item) => (
                <article
                  key={item.id}
                  className="grid gap-2 p-4 rounded-xl bg-white/60 border border-zinc-200"
                >
                  <div>
                    <strong>{item.name}</strong>
                    <div className="flex flex-wrap gap-2 text-sm text-zinc-500 mt-0.5">
                      <span>{item.kind}</span>
                      {item.dosageLabel ? <span>{item.dosageLabel}</span> : null}
                      <span>{item.active ? "Active" : "Paused"}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
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
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        if (!user) return;
                        await setMedicationActive(user.uid, item.id, !item.active);
                      }}
                    >
                      {item.active ? "Pause" : "Reactivate"}
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
