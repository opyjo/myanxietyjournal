import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  documentId,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import type { Unsubscribe } from "firebase/firestore";
import { db } from "./firebase";
import {
  mapAnalysisRunDoc,
  mapDailyCheckinDoc,
  mapHabitStreakDoc,
  mapHabitUrgeDoc,
  mapMedicationItemDoc,
  mapTriggerLogDoc,
} from "./mappers";
import { diffDaysInclusive, localDateTimeToIso, toDateKey, todayDateKey } from "../../shared/date";
import type {
  AnalysisRun,
  DailyCheckin,
  HabitStreak,
  HabitUrge,
  MedicationItem,
  TriggerLog,
} from "../../shared/types";

function requireDb() {
  if (!db) {
    throw new Error("Firebase is not configured.");
  }

  return db;
}

export function watchDailyCheckin(
  uid: string,
  date: string,
  onChange: (value: DailyCheckin | null) => void,
) {
  const database = requireDb();
  const checkinRef = doc(database, "users", uid, "dailyCheckins", date);
  return onSnapshot(checkinRef, (snapshot) => {
    if (!snapshot.exists()) {
      onChange(null);
      return;
    }

    onChange(mapDailyCheckinDoc(snapshot as never));
  });
}

export function watchMedications(
  uid: string,
  onChange: (value: MedicationItem[]) => void,
): Unsubscribe {
  const database = requireDb();
  const medicationsRef = query(
    collection(database, "users", uid, "medications"),
    orderBy("name", "asc"),
  );

  return onSnapshot(medicationsRef, (snapshot) => {
    onChange(snapshot.docs.map(mapMedicationItemDoc));
  });
}

export async function getMedications(uid: string): Promise<MedicationItem[]> {
  const database = requireDb();
  const snapshot = await getDocs(
    query(collection(database, "users", uid, "medications"), orderBy("name", "asc")),
  );
  return snapshot.docs.map(mapMedicationItemDoc);
}

export async function listRecentTriggerLogs(uid: string) {
  const database = requireDb();
  const logsRef = query(
    collection(database, "users", uid, "triggerLogs"),
    orderBy("occurredAt", "desc"),
    limit(20),
  );
  const snapshot = await getDocs(logsRef);
  return snapshot.docs.map(mapTriggerLogDoc);
}

function stripUndefined<T>(obj: T): T {
  if (typeof obj !== "object" || obj === null) return obj;
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined),
  ) as T;
}

export async function saveDailyCheckin(
  uid: string,
  payload: Omit<DailyCheckin, "id" | "createdAt" | "updatedAt">,
) {
  const database = requireDb();
  const ref = doc(database, "users", uid, "dailyCheckins", payload.date);
  const existing = await getDoc(ref);
  await setDoc(
    ref,
    {
      ...stripUndefined(payload),
      medicationStatuses: payload.medicationStatuses.map(stripUndefined),
      createdAt: existing.exists() ? existing.data().createdAt ?? serverTimestamp() : serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function saveMedicationItem(
  uid: string,
  payload: Omit<MedicationItem, "id" | "createdAt" | "updatedAt">,
  medicationId?: string,
) {
  const database = requireDb();
  const ref = medicationId
    ? doc(database, "users", uid, "medications", medicationId)
    : doc(collection(database, "users", uid, "medications"));
  const existing = medicationId ? await getDoc(ref) : null;
  await setDoc(
    ref,
    {
      ...payload,
      createdAt: existing?.exists() ? existing.data().createdAt ?? serverTimestamp() : serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function setMedicationActive(uid: string, medicationId: string, active: boolean) {
  const database = requireDb();
  const ref = doc(database, "users", uid, "medications", medicationId);
  await updateDoc(ref, { active, updatedAt: serverTimestamp() });
}

export async function saveTriggerLog(
  uid: string,
  payload: {
    occurredAtInput: string;
    stressTags: string[];
    consumedTags: string[];
    note?: string;
  },
  triggerId?: string,
) {
  const database = requireDb();
  const occurredAt = localDateTimeToIso(payload.occurredAtInput);
  const occurredOn = toDateKey(new Date(payload.occurredAtInput));

  if (triggerId) {
    const ref = doc(database, "users", uid, "triggerLogs", triggerId);
    const existing = await getDoc(ref);
    await setDoc(
      ref,
      {
        occurredAt,
        occurredOn,
        stressTags: payload.stressTags,
        consumedTags: payload.consumedTags,
        note: payload.note?.trim() || "",
        createdAt: existing.exists() ? existing.data().createdAt ?? serverTimestamp() : serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
    return;
  }

  await addDoc(collection(database, "users", uid, "triggerLogs"), {
    occurredAt,
    occurredOn,
    stressTags: payload.stressTags,
    consumedTags: payload.consumedTags,
    note: payload.note?.trim() || "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function deleteTriggerLog(uid: string, triggerId: string) {
  const database = requireDb();
  await deleteDoc(doc(database, "users", uid, "triggerLogs", triggerId));
}

export async function getRangeCheckins(
  uid: string,
  rangeStart: string,
  rangeEnd: string,
) {
  const database = requireDb();
  const snapshot = await getDocs(
    query(
      collection(database, "users", uid, "dailyCheckins"),
      where(documentId(), ">=", rangeStart),
      where(documentId(), "<=", rangeEnd),
    ),
  );

  return snapshot.docs.map(mapDailyCheckinDoc).sort((left, right) => left.date.localeCompare(right.date));
}

export async function getRangeTriggerLogs(
  uid: string,
  rangeStart: string,
  rangeEnd: string,
) {
  const database = requireDb();
  const snapshot = await getDocs(
    query(
      collection(database, "users", uid, "triggerLogs"),
      where("occurredOn", ">=", rangeStart),
      where("occurredOn", "<=", rangeEnd),
    ),
  );

  return snapshot.docs
    .map(mapTriggerLogDoc)
    .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));
}

export async function getLatestAnalysisRun(
  uid: string,
  rangeStart: string,
  rangeEnd: string,
): Promise<AnalysisRun | null> {
  const database = requireDb();
  const snapshot = await getDocs(
    query(
      collection(database, "users", uid, "analysisRuns"),
      where("rangeStart", "==", rangeStart),
      where("rangeEnd", "==", rangeEnd),
      orderBy("createdAt", "desc"),
      limit(1),
    ),
  );

  return snapshot.empty ? null : mapAnalysisRunDoc(snapshot.docs[0]);
}

export async function getRangeSnapshot(uid: string, rangeStart: string, rangeEnd: string) {
  const [checkins, triggers, latestAnalysis] = await Promise.all([
    getRangeCheckins(uid, rangeStart, rangeEnd),
    getRangeTriggerLogs(uid, rangeStart, rangeEnd),
    getLatestAnalysisRun(uid, rangeStart, rangeEnd),
  ]);

  return { checkins, triggers, latestAnalysis };
}

// ── Habit Freedom Tracker ──────────────────────────────────────

export async function getHabitStreak(uid: string): Promise<HabitStreak | null> {
  const database = requireDb();
  const snap = await getDoc(doc(database, "users", uid, "habitStreaks", "current"));
  if (!snap.exists()) return null;
  return mapHabitStreakDoc(snap.data() as Record<string, unknown>);
}

export async function saveHabitStreak(
  uid: string,
  payload: Omit<HabitStreak, "createdAt" | "updatedAt">,
) {
  const database = requireDb();
  const ref = doc(database, "users", uid, "habitStreaks", "current");
  const existing = await getDoc(ref);
  await setDoc(ref, {
    ...payload,
    createdAt: existing.exists() ? existing.data().createdAt ?? serverTimestamp() : serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function listRecentHabitUrges(uid: string): Promise<HabitUrge[]> {
  const database = requireDb();
  const snapshot = await getDocs(
    query(
      collection(database, "users", uid, "habitUrges"),
      orderBy("occurredAt", "desc"),
      limit(20),
    ),
  );
  return snapshot.docs.map(mapHabitUrgeDoc);
}

export async function saveHabitUrge(
  uid: string,
  payload: {
    occurredAtInput: string;
    intensity: number;
    triggerTags: string[];
    emotionTags: string[];
    actedOn: boolean;
    copingStrategy?: string;
    note?: string;
  },
  urgeId?: string,
) {
  const database = requireDb();
  const occurredAt = localDateTimeToIso(payload.occurredAtInput);
  const occurredOn = toDateKey(new Date(payload.occurredAtInput));

  const data = {
    occurredAt,
    occurredOn,
    intensity: payload.intensity,
    triggerTags: payload.triggerTags,
    emotionTags: payload.emotionTags,
    actedOn: payload.actedOn,
    copingStrategy: payload.copingStrategy?.trim() || "",
    note: payload.note?.trim() || "",
    updatedAt: serverTimestamp(),
  };

  if (urgeId) {
    const ref = doc(database, "users", uid, "habitUrges", urgeId);
    const existing = await getDoc(ref);
    await setDoc(ref, {
      ...data,
      createdAt: existing.exists() ? existing.data().createdAt ?? serverTimestamp() : serverTimestamp(),
    }, { merge: true });
  } else {
    await addDoc(collection(database, "users", uid, "habitUrges"), {
      ...data,
      createdAt: serverTimestamp(),
    });
  }

  // Update streak if relapse
  if (payload.actedOn) {
    const streak = await getHabitStreak(uid);
    if (streak) {
      const today = todayDateKey();
      const currentDays = diffDaysInclusive(streak.currentStreakStart, today);
      const newLongest = Math.max(streak.longestStreak, currentDays);
      await saveHabitStreak(uid, {
        currentStreakStart: today,
        lastRelapseDate: occurredOn,
        longestStreak: newLongest,
      });
    }
  }
}

export async function deleteHabitUrge(uid: string, urgeId: string) {
  const database = requireDb();

  // Check if deleting a relapse — need to recalculate streak
  const urgeSnap = await getDoc(doc(database, "users", uid, "habitUrges", urgeId));
  const wasRelapse = urgeSnap.exists() && urgeSnap.data().actedOn === true;

  await deleteDoc(doc(database, "users", uid, "habitUrges", urgeId));

  if (wasRelapse) {
    // Find most recent remaining relapse to recalculate streak start
    const relapseSnap = await getDocs(
      query(
        collection(database, "users", uid, "habitUrges"),
        where("actedOn", "==", true),
        orderBy("occurredAt", "desc"),
        limit(1),
      ),
    );

    const streak = await getHabitStreak(uid);
    if (!streak) return;

    if (relapseSnap.empty) {
      // No remaining relapses — restore original streak start (keep as is since we don't know original)
      // Best we can do: keep currentStreakStart as-is if no relapses remain
    } else {
      const lastRelapse = mapHabitUrgeDoc(relapseSnap.docs[0]);
      await saveHabitStreak(uid, {
        currentStreakStart: lastRelapse.occurredOn,
        lastRelapseDate: lastRelapse.occurredOn,
        longestStreak: streak.longestStreak,
      });
    }
  }
}

