import { z } from "zod";
import { MAX_ANALYSIS_RANGE_DAYS } from "./constants";
import { clampRange } from "./date";
export const medicationStatusSchema = z.object({
    medicationId: z.string().min(1),
    name: z.string().min(1),
    kind: z.enum(["medication", "supplement"]),
    dosageLabel: z.string().trim().max(80).optional().or(z.literal("")),
    status: z.enum(["taken", "skipped", "not_logged"]),
    note: z.string().trim().max(240).optional().or(z.literal("")),
});
export const dailyCheckinSchema = z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    anxietyLevel: z.number().int().min(1).max(10),
    mood: z.enum(["calm", "okay", "tense", "overwhelmed", "low", "hopeful"]),
    energy: z.number().int().min(1).max(5),
    sleepQuality: z.number().int().min(1).max(5),
    anxietyWaking: z.number().int().min(1).max(10).optional(),
    motivation: z.number().int().min(1).max(5).optional(),
    gratitude: z.string().trim().max(200).optional().or(z.literal("")),
    symptoms: z.array(z.string().trim().min(1)).max(12),
    symptomNote: z.string().trim().max(1500).optional().or(z.literal("")),
    bedTime: z.string().regex(/^\d{2}:\d{2}$/).optional().or(z.literal("")),
    wakeTime: z.string().regex(/^\d{2}:\d{2}$/).optional().or(z.literal("")),
    riseTime: z.string().regex(/^\d{2}:\d{2}$/).optional().or(z.literal("")),
    note: z.string().trim().max(600).optional().or(z.literal("")),
    medicationStatuses: z.array(medicationStatusSchema).max(30),
});
export const triggerLogSchema = z.object({
    occurredAtInput: z.string().min(1),
    stressTags: z.array(z.string().trim().min(1)).max(10),
    consumedTags: z.array(z.string().trim().min(1)).max(10),
    note: z.string().trim().max(600).optional().or(z.literal("")),
});
export const medicationItemSchema = z.object({
    name: z.string().trim().min(1).max(80),
    kind: z.enum(["medication", "supplement"]),
    dosageLabel: z.string().trim().max(80).optional().or(z.literal("")),
    active: z.boolean(),
});
export const analysisRangeSchema = z
    .object({
    rangeStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    rangeEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})
    .superRefine((value, context) => {
    try {
        clampRange(value.rangeStart, value.rangeEnd);
    }
    catch (error) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            message: error instanceof Error ? error.message : "Invalid date range.",
        });
    }
});
export const analysisDisclosureSchema = z.object({
    accepted: z.literal(true),
});
export function ensureRangeWithinLimit(rangeStart, rangeEnd) {
    const { days } = clampRange(rangeStart, rangeEnd);
    if (days > MAX_ANALYSIS_RANGE_DAYS) {
        throw new Error(`Range cannot exceed ${MAX_ANALYSIS_RANGE_DAYS} days.`);
    }
    return days;
}
