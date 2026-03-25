import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SummaryPage from "./SummaryPage";

const firestoreMocks = vi.hoisted(() => ({
  getRangeSnapshot: vi.fn(),
}));

const clipboardMocks = vi.hoisted(() => ({
  writeText: vi.fn(),
}));

vi.mock("../hooks/useAuth", () => ({
  useAuth: () => ({
    user: { uid: "user-1" },
  }),
}));

vi.mock("../lib/firestore", () => firestoreMocks);

describe("SummaryPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    firestoreMocks.getRangeSnapshot.mockResolvedValue({
      checkins: [
        {
          id: "2026-03-01",
          date: "2026-03-01",
          anxietyLevel: 7,
          mood: "tense",
          energy: 2,
          sleepQuality: 2,
          symptoms: ["Restlessness"],
          medicationStatuses: [],
        },
      ],
      triggers: [],
      latestAnalysis: null,
    });
    clipboardMocks.writeText.mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: clipboardMocks.writeText,
      },
    });
  });

  it("copies the generated clinician note", async () => {
    const user = userEvent.setup();
    render(<SummaryPage />);

    await user.click(await screen.findByRole("button", { name: "Copy text" }));

    expect(await screen.findByText("Summary copied to your clipboard.")).toBeInTheDocument();
  });
});
