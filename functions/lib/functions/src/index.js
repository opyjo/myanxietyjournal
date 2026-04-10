import Anthropic from "@anthropic-ai/sdk";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { defineSecret } from "firebase-functions/params";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { logger } from "firebase-functions/v2";
import { createHash } from "node:crypto";
import { ANALYSIS_MODEL, ANALYSIS_PROMPT_VERSION, MIN_ANALYSIS_CHECKINS, REFLECTION_MODEL } from "../../shared/constants";
import { buildReflectionPrompt } from "../../shared/reflection";
import { buildAnalysisPrompt, parseAnalysisJson, } from "../../shared/analysis";
import { clampRange } from "../../shared/date";
import { analysisRangeSchema } from "../../shared/validation";
initializeApp();
const firestore = getFirestore();
const anthropicApiKey = defineSecret("ANTHROPIC_API_KEY");
function asString(value) {
    return typeof value === "string" ? value : "";
}
function mapDailyCheckin(id, data) {
    return {
        id,
        date: asString(data.date || id),
        anxietyLevel: Number(data.anxietyLevel ?? 5),
        mood: data.mood ?? "okay",
        energy: Number(data.energy ?? 3),
        sleepQuality: Number(data.sleepQuality ?? 3),
        anxietyWaking: data.anxietyWaking != null ? Number(data.anxietyWaking) : undefined,
        motivation: data.motivation != null ? Number(data.motivation) : undefined,
        gratitude: data.gratitude ? String(data.gratitude) : undefined,
        symptoms: Array.isArray(data.symptoms) ? data.symptoms.map(String) : [],
        symptomNote: data.symptomNote ? String(data.symptomNote) : undefined,
        bedTime: data.bedTime ? String(data.bedTime) : undefined,
        wakeTime: data.wakeTime ? String(data.wakeTime) : undefined,
        riseTime: data.riseTime ? String(data.riseTime) : undefined,
        note: data.note ? String(data.note) : undefined,
        medicationStatuses: Array.isArray(data.medicationStatuses)
            ? data.medicationStatuses.map((item) => ({
                medicationId: String(item.medicationId ?? ""),
                name: String(item.name ?? ""),
                kind: item.kind === "supplement" ? "supplement" : "medication",
                dosageLabel: item.dosageLabel ? String(item.dosageLabel) : undefined,
                status: item.status === "taken" || item.status === "skipped" || item.status === "not_logged"
                    ? item.status
                    : "not_logged",
                note: item.note ? String(item.note) : undefined,
            }))
            : [],
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : undefined,
        updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : undefined,
    };
}
function mapTriggerLog(id, data) {
    return {
        id,
        occurredAt: asString(data.occurredAt),
        occurredOn: asString(data.occurredOn),
        stressTags: Array.isArray(data.stressTags) ? data.stressTags.map(String) : [],
        consumedTags: Array.isArray(data.consumedTags) ? data.consumedTags.map(String) : [],
        note: data.note ? String(data.note) : undefined,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : undefined,
        updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : undefined,
    };
}
function mapMedicationItem(id, data) {
    return {
        id,
        name: asString(data.name),
        kind: data.kind === "supplement" ? "supplement" : "medication",
        dosageLabel: data.dosageLabel ? String(data.dosageLabel) : undefined,
        active: Boolean(data.active ?? true),
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : undefined,
        updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : undefined,
    };
}
function mapAnalysisRun(id, data, cached = false) {
    return {
        id,
        rangeStart: asString(data.rangeStart),
        rangeEnd: asString(data.rangeEnd),
        sourceCounts: {
            checkins: Number(data.sourceCounts?.checkins ?? 0),
            triggers: Number(data.sourceCounts?.triggers ?? 0),
            activeMedicationItems: Number(data.sourceCounts?.activeMedicationItems ?? 0),
        },
        sourceFingerprint: asString(data.sourceFingerprint),
        promptVersion: asString(data.promptVersion),
        model: asString(data.model),
        cached,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : undefined,
        analysis: {
            overview: asString(data.analysis?.overview),
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
            reflectionPoints: Array.isArray(data.analysis?.reflectionPoints)
                ? data.analysis.reflectionPoints.map(String)
                : [],
        },
    };
}
function createFingerprint(bundle) {
    return createHash("sha256").update(JSON.stringify(bundle)).digest("hex");
}
async function loadSourceBundle(uid, rangeStart, rangeEnd) {
    const checkinsQuery = firestore
        .collection("users")
        .doc(uid)
        .collection("dailyCheckins")
        .where("__name__", ">=", rangeStart)
        .where("__name__", "<=", rangeEnd);
    const triggersQuery = firestore
        .collection("users")
        .doc(uid)
        .collection("triggerLogs")
        .where("occurredOn", ">=", rangeStart)
        .where("occurredOn", "<=", rangeEnd);
    const medicationsQuery = firestore
        .collection("users")
        .doc(uid)
        .collection("medications");
    const [checkinsSnapshot, triggersSnapshot, medicationsSnapshot] = await Promise.all([
        checkinsQuery.get(),
        triggersQuery.get(),
        medicationsQuery.get(),
    ]);
    const checkins = checkinsSnapshot.docs
        .map((doc) => mapDailyCheckin(doc.id, doc.data()))
        .sort((left, right) => left.date.localeCompare(right.date));
    const triggers = triggersSnapshot.docs
        .map((doc) => mapTriggerLog(doc.id, doc.data()))
        .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));
    const medications = medicationsSnapshot.docs.map((doc) => mapMedicationItem(doc.id, doc.data()));
    return {
        rangeStart,
        rangeEnd,
        checkins,
        triggers,
        medications,
    };
}
async function findCachedAnalysis(uid, rangeStart, rangeEnd, sourceFingerprint) {
    const snapshot = await firestore
        .collection("users")
        .doc(uid)
        .collection("analysisRuns")
        .where("rangeStart", "==", rangeStart)
        .where("rangeEnd", "==", rangeEnd)
        .where("sourceFingerprint", "==", sourceFingerprint)
        .orderBy("createdAt", "desc")
        .limit(1)
        .get();
    return snapshot.empty ? null : mapAnalysisRun(snapshot.docs[0].id, snapshot.docs[0].data(), true);
}
function getAnthropicClient() {
    const apiKey = anthropicApiKey.value() || process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_KEY;
    if (!apiKey) {
        throw new HttpsError("failed-precondition", "Anthropic API key is not configured for this project.");
    }
    return new Anthropic({ apiKey });
}
async function generateAnalysis(sourceBundle) {
    const client = getAnthropicClient();
    const prompt = buildAnalysisPrompt(sourceBundle);
    const response = await client.messages.create({
        model: ANALYSIS_MODEL,
        max_tokens: 1400,
        system: prompt.system,
        messages: [{ role: "user", content: prompt.user }],
    });
    const responseText = response.content
        .filter((item) => item.type === "text")
        .map((item) => item.text)
        .join("\n");
    return parseAnalysisJson(responseText);
}
async function saveAnalysisRun({ uid, rangeStart, rangeEnd, sourceBundle, sourceFingerprint, analysis, createdAt, }) {
    analysisRangeSchema.parse({ rangeStart, rangeEnd });
    clampRange(rangeStart, rangeEnd);
    const payload = {
        rangeStart,
        rangeEnd,
        sourceCounts: {
            checkins: sourceBundle.checkins.length,
            triggers: sourceBundle.triggers.length,
            activeMedicationItems: sourceBundle.medications.filter((item) => item.active).length,
        },
        sourceFingerprint,
        promptVersion: ANALYSIS_PROMPT_VERSION,
        model: ANALYSIS_MODEL,
        analysis,
        createdAt: Timestamp.fromDate(createdAt),
    };
    const docRef = await firestore
        .collection("users")
        .doc(uid)
        .collection("analysisRuns")
        .add(payload);
    return {
        id: docRef.id,
        rangeStart,
        rangeEnd,
        sourceCounts: payload.sourceCounts,
        sourceFingerprint,
        promptVersion: ANALYSIS_PROMPT_VERSION,
        model: ANALYSIS_MODEL,
        cached: false,
        createdAt: createdAt.toISOString(),
        analysis,
    };
}
export async function analyzePatternsCore({ uid, rangeStart, rangeEnd, }, dependencies = {}) {
    const deps = {
        loadSourceBundle,
        findCachedAnalysis,
        generateAnalysis,
        createFingerprint,
        saveAnalysisRun,
        ...dependencies,
    };
    analysisRangeSchema.parse({ rangeStart, rangeEnd });
    clampRange(rangeStart, rangeEnd);
    const sourceBundle = await deps.loadSourceBundle(uid, rangeStart, rangeEnd);
    if (sourceBundle.checkins.length < MIN_ANALYSIS_CHECKINS) {
        throw new HttpsError("failed-precondition", `At least ${MIN_ANALYSIS_CHECKINS} check-ins are required for analysis.`);
    }
    const sourceFingerprint = deps.createFingerprint(sourceBundle);
    const cached = await deps.findCachedAnalysis(uid, rangeStart, rangeEnd, sourceFingerprint);
    if (cached) {
        return cached;
    }
    const analysis = await deps.generateAnalysis(sourceBundle);
    const createdAt = new Date();
    return deps.saveAnalysisRun({
        uid,
        rangeStart,
        rangeEnd,
        sourceBundle,
        sourceFingerprint,
        analysis,
        createdAt,
    });
}
export const generateDailyReflection = onCall({ secrets: [anthropicApiKey], cors: true }, async (request) => {
    if (!request.auth?.uid) {
        throw new HttpsError("unauthenticated", "You must be signed in.");
    }
    const date = typeof request.data?.date === "string" ? request.data.date : "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        throw new HttpsError("invalid-argument", "A valid date (YYYY-MM-DD) is required.");
    }
    const uid = request.auth.uid;
    try {
        const checkinDoc = await firestore
            .collection("users")
            .doc(uid)
            .collection("dailyCheckins")
            .doc(date)
            .get();
        if (!checkinDoc.exists) {
            throw new HttpsError("not-found", "No check-in found for this date.");
        }
        const checkin = mapDailyCheckin(checkinDoc.id, checkinDoc.data());
        const checkinFingerprint = createHash("sha256")
            .update(JSON.stringify(checkin))
            .digest("hex");
        // Check cache
        const existingDoc = await firestore
            .collection("users")
            .doc(uid)
            .collection("dailyReflections")
            .doc(date)
            .get();
        if (existingDoc.exists && existingDoc.data()?.checkinFingerprint === checkinFingerprint) {
            return { text: existingDoc.data().text, cached: true };
        }
        const client = getAnthropicClient();
        const prompt = buildReflectionPrompt(checkin);
        const response = await client.messages.create({
            model: REFLECTION_MODEL,
            max_tokens: 300,
            system: prompt.system,
            messages: [{ role: "user", content: prompt.user }],
        });
        const text = response.content
            .filter((item) => item.type === "text")
            .map((item) => item.text)
            .join("\n")
            .trim();
        await firestore
            .collection("users")
            .doc(uid)
            .collection("dailyReflections")
            .doc(date)
            .set({
            text,
            checkinFingerprint,
            createdAt: Timestamp.now(),
        });
        return { text, cached: false };
    }
    catch (error) {
        if (error instanceof HttpsError) {
            throw error;
        }
        logger.error("generateDailyReflection failed", error);
        throw new HttpsError("internal", error instanceof Error ? error.message : "Reflection generation failed.");
    }
});
export const analyzePatterns = onCall({ secrets: [anthropicApiKey], cors: true }, async (request) => {
    if (!request.auth?.uid) {
        throw new HttpsError("unauthenticated", "You must be signed in.");
    }
    try {
        const input = analysisRangeSchema.parse(request.data);
        return await analyzePatternsCore({
            uid: request.auth.uid,
            rangeStart: input.rangeStart,
            rangeEnd: input.rangeEnd,
        });
    }
    catch (error) {
        if (error instanceof HttpsError) {
            throw error;
        }
        logger.error("analyzePatterns failed", error);
        throw new HttpsError("internal", error instanceof Error ? error.message : "Pattern analysis failed.");
    }
});
