import { z } from "zod";
import {
  ANALYSIS_MODEL,
  ANALYSIS_PROMPT_VERSION,
  MIN_ANALYSIS_CHECKINS,
} from "./constants";
import type { AnalysisSourceBundle } from "./types";

export const analysisResultSchema = z.object({
  overview: z.string().trim().min(1).max(1200),
  patterns: z.array(z.string().trim().min(1).max(300)).min(1).max(6),
  triggerObservations: z.array(z.string().trim().min(1).max(300)).min(1).max(6),
  sleepEnergyLinks: z.array(z.string().trim().min(1).max(300)).min(1).max(6),
  medicationConsistency: z.array(z.string().trim().min(1).max(300)).min(1).max(6),
  discussionPoints: z.array(z.string().trim().min(1).max(300)).min(2).max(8),
});

export function sanitizeSourceBundle(bundle: AnalysisSourceBundle) {
  return {
    ...bundle,
    checkins: bundle.checkins.map((checkin) => ({
      date: checkin.date,
      anxietyLevel: checkin.anxietyLevel,
      mood: checkin.mood,
      energy: checkin.energy,
      sleepQuality: checkin.sleepQuality,
      symptoms: checkin.symptoms,
      symptomNote: checkin.symptomNote || undefined,
      note: checkin.note || undefined,
      medicationStatuses: checkin.medicationStatuses.map((status) => ({
        name: status.name,
        kind: status.kind,
        dosageLabel: status.dosageLabel || undefined,
        status: status.status,
        note: status.note || undefined,
      })),
    })),
    triggers: bundle.triggers.map((trigger) => ({
      occurredAt: trigger.occurredAt,
      occurredOn: trigger.occurredOn,
      stressTags: trigger.stressTags,
      consumedTags: trigger.consumedTags,
      note: trigger.note || undefined,
    })),
    medications: bundle.medications.map((item) => ({
      name: item.name,
      kind: item.kind,
      dosageLabel: item.dosageLabel || undefined,
      active: item.active,
    })),
  };
}

export function buildAnalysisPrompt(bundle: AnalysisSourceBundle) {
  const sanitized = sanitizeSourceBundle(bundle);

  if (sanitized.checkins.length < MIN_ANALYSIS_CHECKINS) {
    throw new Error(`At least ${MIN_ANALYSIS_CHECKINS} check-ins are required.`);
  }

  const system = [
    "You are an assistant that summarizes wellness journaling data for a user preparing to talk with a doctor or therapist.",
    "Never diagnose, predict emergencies, instruct medication changes, or claim causality without support in the data.",
    "Use tentative language such as 'may', 'seems', or 'could be worth discussing'.",
    "Return JSON only that matches the requested schema.",
  ].join(" ");

  const user = JSON.stringify(
    {
      task: "Analyze patterns across anxiety journal entries.",
      constraints: {
        noDiagnosis: true,
        noEmergencyGuidance: true,
        noMedicationChangeAdvice: true,
        outputLanguage: "English",
        schema: {
          overview: "string",
          patterns: "string[]",
          triggerObservations: "string[]",
          sleepEnergyLinks: "string[]",
          medicationConsistency: "string[]",
          discussionPoints: "string[]",
        },
      },
      metadata: {
        rangeStart: sanitized.rangeStart,
        rangeEnd: sanitized.rangeEnd,
        model: ANALYSIS_MODEL,
        promptVersion: ANALYSIS_PROMPT_VERSION,
      },
      source: sanitized,
    },
    null,
    2,
  );

  return { system, user };
}

export function parseAnalysisJson(rawText: string) {
  const trimmed = rawText.trim();
  const jsonBlockMatch = trimmed.match(/```json\s*([\s\S]*?)```/i);
  const candidate = jsonBlockMatch ? jsonBlockMatch[1] : trimmed;
  return analysisResultSchema.parse(JSON.parse(candidate));
}
