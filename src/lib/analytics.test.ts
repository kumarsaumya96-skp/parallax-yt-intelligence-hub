import { describe, expect, it } from "vitest";
import { aggregateMetrics, metricsForRange, percentChange } from "@/lib/analytics";

describe("date comparisons", () => {
  it("returns the selected number of daily rows", () => {
    expect(metricsForRange("channel-1", "7d")).toHaveLength(7);
    expect(metricsForRange("channel-1", "28d")).toHaveLength(28);
  });

  it("filters metrics to an inclusive custom calendar range", () => {
    const rows = metricsForRange("channel-1", "custom", undefined, {
      startDate: "2026-08-20",
      endDate: "2026-08-25",
    });
    expect(rows).toHaveLength(6);
    expect(rows[0]?.date).toBe("2026-08-20");
    expect(rows.at(-1)?.date).toBe("2026-08-25");
  });

  it("aggregates normalized daily rows at query time", () => {
    const result = aggregateMetrics(metricsForRange("channel-1", "7d"));
    expect(result.views).toBeGreaterThan(0);
    expect(result.watchMinutes).toBeGreaterThan(result.views);
  });

  it("handles an empty comparison denominator", () => {
    expect(percentChange(100, 0)).toBe(0);
  });
});
