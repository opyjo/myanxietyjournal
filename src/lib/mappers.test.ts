import { describe, expect, it } from "vitest";
import { mapDailyCheckinDoc, mapTriggerLogDoc } from "./mappers";

describe("document mappers", () => {
  it("maps a daily check-in snapshot into the shared shape", () => {
    const snapshot = {
      id: "2026-03-25",
      data: () => ({
        date: "2026-03-25",
        anxietyLevel: 7,
        mood: "tense",
        energy: 2,
        sleepQuality: 3,
        symptoms: ["Restlessness"],
        medicationStatuses: [
          {
            medicationId: "med-1",
            name: "Sertraline",
            kind: "medication",
            status: "taken",
          },
        ],
      }),
    } as never;

    expect(mapDailyCheckinDoc(snapshot)).toMatchObject({
      id: "2026-03-25",
      anxietyLevel: 7,
      mood: "tense",
      medicationStatuses: [
        {
          medicationId: "med-1",
          status: "taken",
        },
      ],
    });
  });

  it("maps a trigger snapshot into the shared shape", () => {
    const snapshot = {
      id: "trigger-1",
      data: () => ({
        occurredAt: "2026-03-25T18:30:00.000Z",
        occurredOn: "2026-03-25",
        stressTags: ["Work pressure"],
        consumedTags: ["Coffee"],
        note: "Meeting ran long",
      }),
    } as never;

    expect(mapTriggerLogDoc(snapshot)).toEqual({
      id: "trigger-1",
      occurredAt: "2026-03-25T18:30:00.000Z",
      occurredOn: "2026-03-25",
      stressTags: ["Work pressure"],
      consumedTags: ["Coffee"],
      note: "Meeting ran long",
      createdAt: undefined,
      updatedAt: undefined,
    });
  });
});
