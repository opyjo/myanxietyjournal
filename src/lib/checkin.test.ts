import { describe, expect, it } from "vitest";
import { buildMedicationSnapshot } from "./checkin";

describe("buildMedicationSnapshot", () => {
  it("preserves existing statuses for active medications", () => {
    const result = buildMedicationSnapshot(
      [
        { id: "med-1", name: "Sertraline", kind: "medication", active: true },
        { id: "med-2", name: "Magnesium", kind: "supplement", active: true },
      ],
      [
        {
          medicationId: "med-1",
          name: "Sertraline",
          kind: "medication",
          status: "taken",
        },
      ],
    );

    expect(result).toEqual([
      {
        medicationId: "med-1",
        name: "Sertraline",
        kind: "medication",
        dosageLabel: undefined,
        status: "taken",
        note: undefined,
      },
      {
        medicationId: "med-2",
        name: "Magnesium",
        kind: "supplement",
        dosageLabel: undefined,
        status: "not_logged",
        note: undefined,
      },
    ]);
  });
});
