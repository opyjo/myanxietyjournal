import type { DailyCheckin } from "./types";

export function buildReflectionPrompt(checkin: DailyCheckin) {
  const system = [
    "You are a warm, supportive companion helping someone reflect on their day.",
    "You are not a therapist or clinician — just a caring presence.",
    "Write 2-4 sentences of plain text.",
    "Be gentle, validating, and concise.",
    "Never diagnose, prescribe, or give medical advice.",
    "Do not use bullet points, headers, or JSON — just a short paragraph.",
  ].join(" ");

  const parts: string[] = [
    `Anxiety level: ${checkin.anxietyLevel}/10`,
    `Mood: ${checkin.mood}`,
    `Energy: ${checkin.energy}/5`,
    `Sleep quality: ${checkin.sleepQuality}/5`,
  ];

  if (checkin.symptoms.length > 0) {
    parts.push(`Symptoms: ${checkin.symptoms.join(", ")}`);
  }

  if (checkin.symptomNote) {
    parts.push(`Symptom note: ${checkin.symptomNote}`);
  }

  if (checkin.note) {
    parts.push(`Note: ${checkin.note}`);
  }

  const medsTaken = checkin.medicationStatuses.filter((m) => m.status === "taken");
  const medsSkipped = checkin.medicationStatuses.filter((m) => m.status === "skipped");

  if (medsTaken.length > 0) {
    parts.push(`Took: ${medsTaken.map((m) => m.name).join(", ")}`);
  }

  if (medsSkipped.length > 0) {
    parts.push(`Skipped: ${medsSkipped.map((m) => m.name).join(", ")}`);
  }

  const user = [
    "Here's how someone is feeling today. Give them a brief, warm reflection.",
    "",
    ...parts,
  ].join("\n");

  return { system, user };
}
