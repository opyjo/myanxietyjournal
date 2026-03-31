import Anthropic from "@anthropic-ai/sdk";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import {
  ANALYSIS_MODEL,
  ANALYSIS_PROMPT_VERSION,
  MIN_ANALYSIS_CHECKINS,
  REFLECTION_MODEL,
} from "../../shared/constants";
import { buildAnalysisPrompt, parseAnalysisJson } from "../../shared/analysis";
import { buildReflectionPrompt } from "../../shared/reflection";
import type { AnalysisRun } from "../../shared/types";
import { db } from "./firebase";
import { mapAnalysisRunDoc, mapDailyCheckinDoc } from "./mappers";
import { getRangeCheckins, getRangeTriggerLogs, getMedications } from "./firestore";

function requireDb() {
  if (!db) throw new Error("Firebase is not configured.");
  return db;
}

async function sha256(data: string): Promise<string> {
  const encoded = new TextEncoder().encode(data);
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function getAnthropicClient() {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Anthropic API key not configured. Add VITE_ANTHROPIC_API_KEY to your .env.local.",
    );
  }
  return new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
}

export async function generateDailyReflection(
  uid: string,
  date: string,
): Promise<{ text: string; cached: boolean }> {
  const database = requireDb();

  const checkinSnap = await getDoc(doc(database, "users", uid, "dailyCheckins", date));
  if (!checkinSnap.exists()) throw new Error("No check-in found for this date.");
  const checkin = mapDailyCheckinDoc(checkinSnap as never);

  const checkinFingerprint = await sha256(JSON.stringify(checkin));

  const reflectionRef = doc(database, "users", uid, "dailyReflections", date);
  const existingSnap = await getDoc(reflectionRef);
  if (existingSnap.exists() && existingSnap.data().checkinFingerprint === checkinFingerprint) {
    return { text: String(existingSnap.data().text), cached: true };
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
    .filter((item): item is Anthropic.TextBlock => item.type === "text")
    .map((item) => item.text)
    .join("\n")
    .trim();

  await setDoc(reflectionRef, { text, checkinFingerprint, createdAt: serverTimestamp() });

  return { text, cached: false };
}

export async function analyzePatterns(
  uid: string,
  rangeStart: string,
  rangeEnd: string,
): Promise<AnalysisRun> {
  const database = requireDb();

  const [checkins, triggers, medications] = await Promise.all([
    getRangeCheckins(uid, rangeStart, rangeEnd),
    getRangeTriggerLogs(uid, rangeStart, rangeEnd),
    getMedications(uid),
  ]);

  if (checkins.length < MIN_ANALYSIS_CHECKINS) {
    throw new Error(`At least ${MIN_ANALYSIS_CHECKINS} check-ins are required.`);
  }

  const sourceBundle = { rangeStart, rangeEnd, checkins, triggers, medications };
  const sourceFingerprint = await sha256(JSON.stringify(sourceBundle));

  const cachedSnap = await getDocs(
    query(
      collection(database, "users", uid, "analysisRuns"),
      where("rangeStart", "==", rangeStart),
      where("rangeEnd", "==", rangeEnd),
      where("sourceFingerprint", "==", sourceFingerprint),
      orderBy("createdAt", "desc"),
      limit(1),
    ),
  );
  if (!cachedSnap.empty) {
    return { ...mapAnalysisRunDoc(cachedSnap.docs[0]), cached: true };
  }

  const client = getAnthropicClient();
  const prompt = buildAnalysisPrompt(sourceBundle);
  const response = await client.messages.create({
    model: ANALYSIS_MODEL,
    max_tokens: 1400,
    system: prompt.system,
    messages: [{ role: "user", content: prompt.user }],
  });

  const responseText = response.content
    .filter((item): item is Anthropic.TextBlock => item.type === "text")
    .map((item) => item.text)
    .join("\n");

  const analysis = parseAnalysisJson(responseText);

  const payload = {
    rangeStart,
    rangeEnd,
    sourceCounts: {
      checkins: checkins.length,
      triggers: triggers.length,
      activeMedicationItems: medications.filter((m) => m.active).length,
    },
    sourceFingerprint,
    promptVersion: ANALYSIS_PROMPT_VERSION,
    model: ANALYSIS_MODEL,
    analysis,
    createdAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(database, "users", uid, "analysisRuns"), payload);

  return {
    id: docRef.id,
    rangeStart,
    rangeEnd,
    sourceCounts: payload.sourceCounts,
    sourceFingerprint,
    promptVersion: ANALYSIS_PROMPT_VERSION,
    model: ANALYSIS_MODEL,
    cached: false,
    createdAt: new Date().toISOString(),
    analysis,
  };
}
