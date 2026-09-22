import { describe, expect, it } from "vitest";
import { frequencyLabel, nextScheduleRun } from "@/lib/schedule";

describe("report schedule frequency", () => {
  const start = new Date("2026-09-10T09:30:00.000Z");

  it("keeps weekly and monthly presets", () => {
    expect(nextScheduleRun(start, "Weekly").toISOString()).toBe("2026-09-17T09:30:00.000Z");
    expect(nextScheduleRun(start, "Monthly").toISOString()).toBe("2026-10-10T09:30:00.000Z");
  });

  it("supports custom day, week and month intervals", () => {
    expect(nextScheduleRun(start, "Custom", 3, "Days").toISOString()).toBe(
      "2026-09-13T09:30:00.000Z",
    );
    expect(nextScheduleRun(start, "Custom", 2, "Weeks").toISOString()).toBe(
      "2026-09-24T09:30:00.000Z",
    );
    expect(nextScheduleRun(start, "Custom", 2, "Months").toISOString()).toBe(
      "2026-11-10T09:30:00.000Z",
    );
  });

  it("formats custom recurrence clearly", () => {
    expect(frequencyLabel("Custom", 1, "Weeks")).toBe("Every 1 week");
    expect(frequencyLabel("Custom", 3, "Days")).toBe("Every 3 days");
  });
});
