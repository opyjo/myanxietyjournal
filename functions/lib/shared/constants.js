export const APP_NAME = "Anxiety Journal";
export const ANALYSIS_MODEL = "claude-sonnet-4-20250514";
export const ANALYSIS_PROMPT_VERSION = "2026-03-25.v1";
export const MIN_ANALYSIS_CHECKINS = 5;
export const MAX_ANALYSIS_RANGE_DAYS = 90;
export const DEFAULT_RANGE_PRESET = 30;
export const moodOptions = [
    { value: "calm", label: "Calm", tone: "sage" },
    { value: "okay", label: "Okay", tone: "sand" },
    { value: "tense", label: "Tense", tone: "amber" },
    { value: "overwhelmed", label: "Overwhelmed", tone: "rose" },
    { value: "low", label: "Low", tone: "slate" },
    { value: "hopeful", label: "Hopeful", tone: "sky" },
];
export const symptomOptions = [
    "Restlessness",
    "Racing thoughts",
    "Chest tightness",
    "Sweating",
    "Headache",
    "Nausea",
    "Stomach discomfort",
    "Trouble focusing",
    "Irritability",
    "Shortness of breath",
];
export const stressEventOptions = [
    "Work pressure",
    "Conflict",
    "Social situation",
    "Health worry",
    "Money stress",
    "Family demand",
    "Travel",
    "Change in routine",
    "Bad news",
    "No clear trigger",
];
export const consumedItemOptions = [
    "Coffee",
    "Energy drink",
    "Alcohol",
    "Cannabis",
    "Nicotine",
    "High sugar",
    "Skipped meal",
    "Extra screen time",
];
export const medicationKindOptions = [
    { value: "medication", label: "Medication" },
    { value: "supplement", label: "Supplement" },
];
export const medicationStatusOptions = [
    { value: "taken", label: "Taken" },
    { value: "skipped", label: "Skipped" },
    { value: "not_logged", label: "Not logged" },
];
export const rangePresetOptions = [
    { days: 7, label: "7 days" },
    { days: 14, label: "14 days" },
    { days: 30, label: "30 days" },
];
export const crisisSupportCopy = "This is a supportive wellness tool, not emergency support or medical advice. If you feel unsafe or may harm yourself, contact local emergency services or a crisis line right away.";
export const clinicianNoteDisclaimer = "Prepared from self-reported entries. Use this as a conversation starter with your doctor or therapist, not a diagnosis.";
