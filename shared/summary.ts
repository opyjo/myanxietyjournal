import { clinicianNoteDisclaimer } from "./constants";
import { formatFriendlyDate } from "./date";
import type {
  AnalysisRun,
  ClinicianSummary,
  DailyCheckin,
  TriggerLog,
} from "./types";

function average(numbers: number[]) {
  if (numbers.length === 0) {
    return null;
  }

  return Number(
    (numbers.reduce((sum, value) => sum + value, 0) / numbers.length).toFixed(1),
  );
}

function topItems(values: string[], maxItems = 5) {
  const counts = new Map<string, number>();

  for (const value of values) {
    const key = value.trim();

    if (!key) {
      continue;
    }

    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, maxItems)
    .map(([value]) => value);
}

export function buildClinicianSummary({
  rangeStart,
  rangeEnd,
  checkins,
  triggers,
  analysis,
}: {
  rangeStart: string;
  rangeEnd: string;
  checkins: DailyCheckin[];
  triggers: TriggerLog[];
  analysis?: AnalysisRun | null;
}): ClinicianSummary {
  const avgAnxiety = average(checkins.map((item) => item.anxietyLevel));
  const symptomList = topItems(checkins.flatMap((item) => item.symptoms));
  const triggerList = topItems(
    triggers.flatMap((item) => [...item.stressTags, ...item.consumedTags]),
  );
  const medicationCounts = checkins
    .flatMap((item) => item.medicationStatuses)
    .reduce(
      (totals, item) => {
        if (item.status === "not_logged") {
          totals.notLogged += 1;
          return totals;
        }

        totals[item.status] += 1;
        return totals;
      },
      { taken: 0, skipped: 0, notLogged: 0 },
    );

  const lines = [
    "Pre-Appointment Summary",
    `${formatFriendlyDate(rangeStart)} to ${formatFriendlyDate(rangeEnd)}`,
    "",
    clinicianNoteDisclaimer,
    "",
    `Check-ins completed: ${checkins.length}`,
    `Average anxiety level: ${avgAnxiety ?? "Not enough data"}`,
    `Most common symptoms: ${symptomList.join(", ") || "None logged"}`,
    `Frequent stressors or consumed items: ${triggerList.join(", ") || "None logged"}`,
    `Medication logs: taken ${medicationCounts.taken}, skipped ${medicationCounts.skipped}, not logged ${medicationCounts.notLogged}`,
    "",
    "Recent notes to discuss:",
    ...checkins
      .filter((item) => item.note || item.symptomNote)
      .slice(-3)
      .map(
        (item) =>
          `- ${formatFriendlyDate(item.date)}: ${[item.note, item.symptomNote]
            .filter(Boolean)
            .join(" | ")}`,
      ),
  ];

  if (triggers.length > 0) {
    lines.push(
      "",
      "Recent trigger context:",
      ...triggers
        .slice(0, 3)
        .map((item) => {
          const pieces = [...item.stressTags, ...item.consumedTags];
          const noteText = item.note ? ` | ${item.note}` : "";
          return `- ${formatFriendlyDate(item.occurredOn)}: ${pieces.join(", ") || "General note"}${noteText}`;
        }),
    );
  }

  if (analysis) {
    lines.push(
      "",
      "AI pattern review:",
      `Overview: ${analysis.analysis.overview}`,
      ...analysis.analysis.patterns.slice(0, 3).map((item) => `- ${item}`),
      "",
      "Suggested discussion points:",
      ...analysis.analysis.discussionPoints.slice(0, 4).map((item) => `- ${item}`),
    );
  }

  return {
    rangeStart,
    rangeEnd,
    generatedAt: new Date().toISOString(),
    stats: {
      checkinCount: checkins.length,
      avgAnxiety,
      commonSymptoms: symptomList,
      commonTriggers: triggerList,
      medicationAdherence: medicationCounts,
    },
    text: lines.join("\n"),
  };
}
