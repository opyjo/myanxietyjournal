import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TriggersPage from "./TriggersPage";

const firestoreMocks = vi.hoisted(() => ({
  deleteTriggerLog: vi.fn(),
  listRecentTriggerLogs: vi.fn(),
  saveTriggerLog: vi.fn(),
}));

vi.mock("../hooks/useAuth", () => ({
  useAuth: () => ({
    user: { uid: "user-1" },
  }),
}));

vi.mock("../lib/firestore", () => firestoreMocks);

describe("TriggersPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    firestoreMocks.listRecentTriggerLogs.mockResolvedValue([]);
    firestoreMocks.saveTriggerLog.mockResolvedValue(undefined);
  });

  it("submits a new trigger log", async () => {
    const user = userEvent.setup();
    render(<TriggersPage />);

    await user.click(await screen.findByRole("button", { name: "Save trigger log" }));

    await waitFor(() => expect(firestoreMocks.saveTriggerLog).toHaveBeenCalledTimes(1));
    expect(firestoreMocks.saveTriggerLog.mock.calls[0][0]).toBe("user-1");
  });
});
