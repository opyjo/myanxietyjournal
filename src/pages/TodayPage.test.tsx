import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TodayPage from "./TodayPage";

const authMocks = vi.hoisted(() => ({
  state: {
    user: { uid: "user-1" },
  },
}));

const firestoreMocks = vi.hoisted(() => ({
  saveDailyCheckin: vi.fn(),
  watchDailyCheckin: vi.fn(),
  watchMedications: vi.fn(),
}));

vi.mock("../hooks/useAuth", () => ({
  useAuth: () => authMocks.state,
}));

vi.mock("../lib/firestore", () => firestoreMocks);

describe("TodayPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    firestoreMocks.watchMedications.mockImplementation((_uid, onChange) => {
      onChange([
        {
          id: "med-1",
          name: "Sertraline",
          kind: "medication",
          dosageLabel: "50 mg",
          active: true,
        },
      ]);
      return vi.fn();
    });
    firestoreMocks.watchDailyCheckin.mockImplementation((_uid, _date, onChange) => {
      onChange(null);
      return vi.fn();
    });
  });

  it("renders medication tracking controls for active items", async () => {
    render(
      <MemoryRouter initialEntries={["/app/today"]}>
        <TodayPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Sertraline")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Taken" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Skipped" })).toBeInTheDocument();
  });
});
