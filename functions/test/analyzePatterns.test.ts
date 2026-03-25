import { HttpsError } from "firebase-functions/v2/https";
import { describe, expect, it, vi } from "vitest";
import { analyzePatternsCore } from "../src/index";
import type { AnalysisSourceBundle } from "../../shared/types";

function buildBundle(checkinCount: number): AnalysisSourceBundle {
  return {
    rangeStart: "2026-03-01",
    rangeEnd: "2026-03-07",
    checkins: Array.from({ length: checkinCount }, (_, index) => ({
      id: `${index + 1}`,
      date: `2026-03-0${index + 1}`,
      anxietyLevel: 6,
      mood: "tense",
      energy: 3,
      sleepQuality: 3,
      symptoms: ["Restlessness"],
      medicationStatuses: [],
    })),
    triggers: [],
    medications: [],
  };
}

describe("analyzePatternsCore", () => {
  it("rejects ranges without enough check-ins", async () => {
    await expect(
      analyzePatternsCore(
        {
          uid: "user-1",
          rangeStart: "2026-03-01",
          rangeEnd: "2026-03-07",
        },
        {
          loadSourceBundle: vi.fn().mockResolvedValue(buildBundle(4)),
        },
      ),
    ).rejects.toMatchObject({
      code: "failed-precondition",
    });
  });

  it("returns a cached analysis without generating a new one", async () => {
    const cached = {
      id: "cached-run",
      rangeStart: "2026-03-01",
      rangeEnd: "2026-03-07",
      sourceCounts: { checkins: 5, triggers: 0, activeMedicationItems: 0 },
      sourceFingerprint: "fingerprint",
      promptVersion: "v1",
      model: "claude-sonnet-4-20250514",
      cached: true,
      analysis: {
        overview: "Overview",
        patterns: ["Pattern"],
        triggerObservations: ["Trigger"],
        sleepEnergyLinks: ["Sleep"],
        medicationConsistency: ["Consistency"],
        discussionPoints: ["Point A", "Point B"],
      },
    };

    const generateAnalysis = vi.fn();

    const result = await analyzePatternsCore(
      {
        uid: "user-1",
        rangeStart: "2026-03-01",
        rangeEnd: "2026-03-07",
      },
      {
        loadSourceBundle: vi.fn().mockResolvedValue(buildBundle(5)),
        createFingerprint: vi.fn().mockReturnValue("fingerprint"),
        findCachedAnalysis: vi.fn().mockResolvedValue(cached),
        generateAnalysis,
      },
    );

    expect(result).toBe(cached);
    expect(generateAnalysis).not.toHaveBeenCalled();
  });

  it("persists a fresh analysis when no cache exists", async () => {
    const saveAnalysisRun = vi.fn().mockResolvedValue({
      id: "fresh-run",
      rangeStart: "2026-03-01",
      rangeEnd: "2026-03-07",
      sourceCounts: { checkins: 5, triggers: 0, activeMedicationItems: 0 },
      sourceFingerprint: "fingerprint",
      promptVersion: "v1",
      model: "claude-sonnet-4-20250514",
      cached: false,
      analysis: {
        overview: "Overview",
        patterns: ["Pattern"],
        triggerObservations: ["Trigger"],
        sleepEnergyLinks: ["Sleep"],
        medicationConsistency: ["Consistency"],
        discussionPoints: ["Point A", "Point B"],
      },
    });

    const result = await analyzePatternsCore(
      {
        uid: "user-1",
        rangeStart: "2026-03-01",
        rangeEnd: "2026-03-07",
      },
      {
        loadSourceBundle: vi.fn().mockResolvedValue(buildBundle(5)),
        createFingerprint: vi.fn().mockReturnValue("fingerprint"),
        findCachedAnalysis: vi.fn().mockResolvedValue(null),
        generateAnalysis: vi.fn().mockResolvedValue({
          overview: "Overview",
          patterns: ["Pattern"],
          triggerObservations: ["Trigger"],
          sleepEnergyLinks: ["Sleep"],
          medicationConsistency: ["Consistency"],
          discussionPoints: ["Point A", "Point B"],
        }),
        saveAnalysisRun,
      },
    );

    expect(saveAnalysisRun).toHaveBeenCalledTimes(1);
    expect(result.id).toBe("fresh-run");
  });
});
