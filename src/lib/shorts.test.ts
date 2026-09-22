import { describe, expect, it } from "vitest";
import { videos } from "@/lib/demo-data";
import { analyzeShorts, durationPerformance, shortsSummary } from "@/lib/shorts";

describe("Shorts optimization", () => {
  const brandVideos = videos.filter((video) => video.brandId === "brand-1");

  it("scores every Short using available signals", () => {
    const rows = analyzeShorts(brandVideos);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((row) => row.score >= 0 && row.score <= 100)).toBe(true);
    expect(rows.every((row) => row.signals.some((signal) => signal.value !== null))).toBe(true);
  });

  it("builds duration cohorts without losing Shorts", () => {
    const summary = shortsSummary(brandVideos);
    const cohorts = durationPerformance(brandVideos);
    expect(cohorts.reduce((sum, cohort) => sum + cohort.videos, 0)).toBe(summary.count);
    expect(summary.averageViewPercentage).not.toBeNull();
  });
});
