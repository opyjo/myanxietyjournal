import type { DocumentData, QueryDocumentSnapshot, Timestamp } from "firebase/firestore";
import type {
  AnalysisRun,
  DailyCheckin,
  MedicationItem,
  MedicationStatus,
  TriggerLog,
} from "../../shared/types";

function toIsoString(value: unknown) {
  if (!value) {
    return undefined;
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "object" && value !== null && "toDate" in value) {
    return (value as Timestamp).toDate().toISOString();
  }

  return undefined;
}

function sanitizeMedicationStatuses(value: unknown): MedicationStatus[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    .map((item) => {
      const kind: MedicationStatus["kind"] =
        item.kind === "supplement" ? "supplement" : "medication";
      const status: MedicationStatus["status"] =
        item.status === "taken" || item.status === "skipped" || item.status === "not_logged"
          ? item.status
          : "not_logged";

      return {
        medicationId: String(item.medicationId ?? ""),
        name: String(item.name ?? ""),
        kind,
        dosageLabel: item.dosageLabel ? String(item.dosageLabel) : undefined,
        status,
        note: item.note ? String(item.note) : undefined,
      };
    })
    .filter((item) => item.medicationId && item.name);
}

export function mapDailyCheckinDoc(
  snapshot: QueryDocumentSnapshot<DocumentData>,
): DailyCheckin {
  const data = snapshot.data();
  return {
    id: snapshot.id,
    date: String(data.date ?? snapshot.id),
    anxietyLevel: Number(data.anxietyLevel ?? 5),
    mood: data.mood ?? "okay",
    energy: Number(data.energy ?? 3),
    sleepQuality: Number(data.sleepQuality ?? 3),
    symptoms: Array.isArray(data.symptoms) ? data.symptoms.map(String) : [],
    symptomNote: data.symptomNote ? String(data.symptomNote) : undefined,
    note: data.note ? String(data.note) : undefined,
    medicationStatuses: sanitizeMedicationStatuses(data.medicationStatuses),
    createdAt: toIsoString(data.createdAt),
    updatedAt: toIsoString(data.updatedAt),
  };
}

export function mapTriggerLogDoc(snapshot: QueryDocumentSnapshot<DocumentData>): TriggerLog {
  const data = snapshot.data();
  return {
    id: snapshot.id,
    occurredAt: String(data.occurredAt ?? new Date().toISOString()),
    occurredOn: String(data.occurredOn ?? ""),
    stressTags: Array.isArray(data.stressTags) ? data.stressTags.map(String) : [],
    consumedTags: Array.isArray(data.consumedTags) ? data.consumedTags.map(String) : [],
    note: data.note ? String(data.note) : undefined,
    createdAt: toIsoString(data.createdAt),
    updatedAt: toIsoString(data.updatedAt),
  };
}

export function mapMedicationItemDoc(
  snapshot: QueryDocumentSnapshot<DocumentData>,
): MedicationItem {
  const data = snapshot.data();
  return {
    id: snapshot.id,
    name: String(data.name ?? ""),
    kind: data.kind === "supplement" ? "supplement" : "medication",
    dosageLabel: data.dosageLabel ? String(data.dosageLabel) : undefined,
    active: Boolean(data.active ?? true),
    createdAt: toIsoString(data.createdAt),
    updatedAt: toIsoString(data.updatedAt),
  };
}

export function mapAnalysisRunDoc(snapshot: QueryDocumentSnapshot<DocumentData>): AnalysisRun {
  const data = snapshot.data();
  return {
    id: snapshot.id,
    rangeStart: String(data.rangeStart ?? ""),
    rangeEnd: String(data.rangeEnd ?? ""),
    sourceCounts: {
      checkins: Number(data.sourceCounts?.checkins ?? 0),
      triggers: Number(data.sourceCounts?.triggers ?? 0),
      activeMedicationItems: Number(data.sourceCounts?.activeMedicationItems ?? 0),
    },
    sourceFingerprint: String(data.sourceFingerprint ?? ""),
    promptVersion: String(data.promptVersion ?? ""),
    model: String(data.model ?? ""),
    createdAt: toIsoString(data.createdAt),
    analysis: {
      overview: String(data.analysis?.overview ?? ""),
      patterns: Array.isArray(data.analysis?.patterns)
        ? data.analysis.patterns.map(String)
        : [],
      triggerObservations: Array.isArray(data.analysis?.triggerObservations)
        ? data.analysis.triggerObservations.map(String)
        : [],
      sleepEnergyLinks: Array.isArray(data.analysis?.sleepEnergyLinks)
        ? data.analysis.sleepEnergyLinks.map(String)
        : [],
      medicationConsistency: Array.isArray(data.analysis?.medicationConsistency)
        ? data.analysis.medicationConsistency.map(String)
        : [],
      discussionPoints: Array.isArray(data.analysis?.discussionPoints)
        ? data.analysis.discussionPoints.map(String)
        : [],
    },
  };
}
