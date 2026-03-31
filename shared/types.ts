export type Mood =
  | "calm"
  | "okay"
  | "tense"
  | "overwhelmed"
  | "low"
  | "hopeful";

export type MedicationKind = "medication" | "supplement";
export type MedicationStatusValue = "taken" | "skipped" | "not_logged";

export interface MedicationItem {
  id: string;
  name: string;
  kind: MedicationKind;
  dosageLabel?: string;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface MedicationStatus {
  medicationId: string;
  name: string;
  kind: MedicationKind;
  dosageLabel?: string;
  status: MedicationStatusValue;
  note?: string;
}

export interface DailyCheckin {
  id: string;
  date: string;
  anxietyLevel: number;
  mood: Mood;
  energy: number;
  sleepQuality: number;
  symptoms: string[];
  symptomNote?: string;
  bedTime?: string;
  wakeTime?: string;
  riseTime?: string;
  note?: string;
  medicationStatuses: MedicationStatus[];
  createdAt?: string;
  updatedAt?: string;
}

export interface TriggerLog {
  id: string;
  occurredAt: string;
  occurredOn: string;
  stressTags: string[];
  consumedTags: string[];
  note?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AnalysisResult {
  overview: string;
  patterns: string[];
  triggerObservations: string[];
  sleepEnergyLinks: string[];
  medicationConsistency: string[];
  reflectionPoints: string[];
}

export interface AnalysisRun {
  id: string;
  rangeStart: string;
  rangeEnd: string;
  sourceCounts: {
    checkins: number;
    triggers: number;
    activeMedicationItems: number;
  };
  sourceFingerprint: string;
  promptVersion: string;
  model: string;
  cached?: boolean;
  createdAt?: string;
  analysis: AnalysisResult;
}

export interface DailyReflection {
  date: string;
  text: string;
  checkinFingerprint: string;
  createdAt?: string;
}

export interface JournalSummary {
  rangeStart: string;
  rangeEnd: string;
  generatedAt: string;
  stats: {
    checkinCount: number;
    avgAnxiety: number | null;
    commonSymptoms: string[];
    commonTriggers: string[];
    medicationAdherence: {
      taken: number;
      skipped: number;
      notLogged: number;
    };
  };
  text: string;
}

export interface AnalysisSourceBundle {
  rangeStart: string;
  rangeEnd: string;
  checkins: DailyCheckin[];
  triggers: TriggerLog[];
  medications: MedicationItem[];
}
