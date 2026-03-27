import { describe, expect, it, vi } from "vitest";
import { buildSummary } from "./summary";

describe("buildSummary", () => {
  it("creates a text summary from entries and triggers", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-25T12:00:00.000Z"));

    const result = buildSummary({
      rangeStart: "2026-03-01",
      rangeEnd: "2026-03-07",
      checkins: [
        {
          id: "2026-03-01",
          date: "2026-03-01",
          anxietyLevel: 7,
          mood: "tense",
          energy: 2,
          sleepQuality: 2,
          symptoms: ["Restlessness", "Headache"],
          note: "Hard week at work",
          medicationStatuses: [
            {
              medicationId: "med-1",
              name: "Sertraline",
              kind: "medication",
              status: "taken",
            },
          ],
        },
      ],
      triggers: [
        {
          id: "trigger-1",
          occurredAt: "2026-03-02T18:00:00.000Z",
          occurredOn: "2026-03-02",
          stressTags: ["Work pressure"],
          consumedTags: ["Coffee"],
          note: "Late afternoon crash",
        },
      ],
      analysis: null,
    });

    expect(result.stats.avgAnxiety).toBe(7);
    expect(result.text).toContain("Journal Summary");
    expect(result.text).toContain("Work pressure");

    vi.useRealTimers();
  });
});
