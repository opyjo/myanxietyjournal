import { describe, expect, it } from "vitest";
import { buildAnalysisPrompt, parseAnalysisJson } from "./analysis";
const sourceBundle = {
    rangeStart: "2026-03-01",
    rangeEnd: "2026-03-05",
    checkins: Array.from({ length: 5 }, (_, index) => ({
        id: `${index + 1}`,
        date: `2026-03-0${index + 1}`,
        anxietyLevel: 5 + index,
        mood: "tense",
        energy: 3,
        sleepQuality: 3,
        symptoms: ["Restlessness"],
        medicationStatuses: [],
    })),
    triggers: [],
    medications: [],
};
describe("analysis helpers", () => {
    it("builds a Claude prompt with the structured source bundle", () => {
        const prompt = buildAnalysisPrompt(sourceBundle);
        expect(prompt.system).toContain("Never diagnose");
        expect(prompt.user).toContain('"rangeStart": "2026-03-01"');
        expect(prompt.user).toContain('"checkins"');
    });
    it("parses fenced JSON responses", () => {
        const result = parseAnalysisJson(`\`\`\`json
{
  "overview": "Pattern summary.",
  "patterns": ["Anxiety tends to rise on busier workdays."],
  "triggerObservations": ["Coffee appears alongside several higher-anxiety days."],
  "sleepEnergyLinks": ["Lower sleep quality often appears with lower energy."],
  "medicationConsistency": ["Medication logging is mostly stable."],
  "discussionPoints": ["Ask whether sleep disruption may be amplifying anxiety.", "Review caffeine timing."]
}
\`\`\``);
        expect(result.overview).toBe("Pattern summary.");
        expect(result.discussionPoints).toHaveLength(2);
    });
});
