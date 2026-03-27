import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import InsightsPage from "./InsightsPage";

const firestoreMocks = vi.hoisted(() => ({
  callAnalyzePatterns: vi.fn(),
  getRangeSnapshot: vi.fn(),
}));

vi.mock("../hooks/useAuth", () => ({
  useAuth: () => ({
    user: { uid: "user-1" },
  }),
}));

vi.mock("../lib/disclosure", () => ({
  acceptAnalysisDisclosure: vi.fn(),
  hasAcceptedAnalysisDisclosure: vi.fn(() => true),
}));

vi.mock("../lib/firestore", () => firestoreMocks);

describe("InsightsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows an error when range data fails to load", async () => {
    firestoreMocks.getRangeSnapshot.mockRejectedValue(new Error("Could not load insights."));
    render(<InsightsPage />);

    expect(await screen.findByText("Could not load insights.")).toBeInTheDocument();
  });

  it("runs analysis when enough check-ins exist", async () => {
    const user = userEvent.setup();

    firestoreMocks.getRangeSnapshot.mockResolvedValue({
      checkins: Array.from({ length: 5 }, (_, index) => ({
        id: `${index}`,
        date: `2026-03-0${index + 1}`,
        anxietyLevel: 6,
        mood: "tense",
        energy: 3,
        sleepQuality: 3,
        symptoms: ["Restlessness"],
        medicationStatuses: [],
      })),
      triggers: [],
      latestAnalysis: null,
    });

    firestoreMocks.callAnalyzePatterns.mockResolvedValue({
      id: "analysis-1",
      rangeStart: "2026-02-24",
      rangeEnd: "2026-03-25",
      sourceCounts: { checkins: 5, triggers: 0, activeMedicationItems: 0 },
      sourceFingerprint: "abc",
      promptVersion: "test",
      model: "claude-sonnet-4-20250514",
      analysis: {
        overview: "Overview",
        patterns: ["Pattern"],
        triggerObservations: ["Trigger"],
        sleepEnergyLinks: ["Sleep"],
        medicationConsistency: ["Consistency"],
        reflectionPoints: ["Point A", "Point B"],
      },
    });

    render(<InsightsPage />);

    await user.click(await screen.findByRole("button", { name: "Generate insights" }));

    await waitFor(() => expect(firestoreMocks.callAnalyzePatterns).toHaveBeenCalledTimes(1));
  });
});
