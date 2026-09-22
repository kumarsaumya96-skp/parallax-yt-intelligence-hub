import { describe, expect, it } from "vitest";
import { calculateDiagnostic, calculateOpportunityScore } from "@/lib/scoring";
import { videos } from "@/lib/demo-data";

describe("opportunity scoring", () => {
  it("re-normalizes remaining weights when a provider is unavailable", () => {
    const score = calculateOpportunityScore([
      { label: "Search", value: null, weight: 30, evidence: "unavailable" },
      { label: "Competitor", value: 0.8, weight: 25, evidence: "available" },
      { label: "Coverage", value: 0.6, weight: 20, evidence: "available" },
    ]);
    expect(score).toBe(71);
  });

  it("returns zero when no evidence provider is available", () => {
    expect(calculateOpportunityScore([{ label: "Search", value: null, weight: 30, evidence: "unavailable" }])).toBe(0);
  });
});

describe("diagnostic rules", () => {
  it("stores the rule and evidence behind a label", () => {
    const candidate = { ...videos[0], first7Views: videos[0].typicalMedian * 2 };
    const diagnostic = calculateDiagnostic(candidate);
    expect(diagnostic.label).toBe("Breakout");
    expect(diagnostic.rule).toContain("1.5x");
    expect(diagnostic.evidence.length).toBeGreaterThan(0);
  });

  it("withholds overconfident labels for small samples", () => {
    const candidate = { ...videos[0], views: 100, typicalMedian: 200 };
    expect(calculateDiagnostic(candidate).sampleSufficient).toBe(false);
  });
});
