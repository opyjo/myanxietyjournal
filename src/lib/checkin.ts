import type { MedicationItem, MedicationStatus } from "../../shared/types";

export function buildMedicationSnapshot(
  medications: MedicationItem[],
  existingStatuses: MedicationStatus[] = [],
) {
  const statusByMedicationId = new Map(
    existingStatuses.map((item) => [item.medicationId, item]),
  );

  return medications
    .filter((item) => item.active)
    .map<MedicationStatus>((item) => {
      const existing = statusByMedicationId.get(item.id);
      return {
        medicationId: item.id,
        name: item.name,
        kind: item.kind,
        dosageLabel: item.dosageLabel,
        status: existing?.status ?? "not_logged",
        note: existing?.note,
      };
    });
}

export function buildDefaultCheckinForm(date: string, medications: MedicationItem[]) {
  return {
    date,
    anxietyLevel: 5,
    mood: "okay" as const,
    energy: 3,
    sleepQuality: 3,
    symptoms: [] as string[],
    symptomNote: "",
    bedTime: "",
    wakeTime: "",
    riseTime: "",
    note: "",
    medicationStatuses: buildMedicationSnapshot(medications),
  };
}
