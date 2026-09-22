import { describe, expect, it } from "vitest";
import {
  buildContentSuggestions,
  discoverKeywords,
  extractKeywordPhrases,
  inferKeywordIntent,
  opportunityScore,
  ownedCoverage,
} from "@/lib/ai-visibility";
import { brands, videos } from "@/lib/demo-data";
import type { AiVisibilitySurfaceResult } from "@/lib/types";

const brand = brands[0];
const brandVideos = videos.filter((video) => video.brandId === brand.id);

function surface(status: AiVisibilitySurfaceResult["status"]): AiVisibilitySurfaceResult {
  return {
    surface: "YouTube Search",
    status,
    detail: "Test evidence",
    citations: [],
  };
}

describe("AI visibility keyword discovery", () => {
  it("keeps explicit seed terms ahead of metadata candidates", () => {
    const rows = discoverKeywords(
      brand,
      brandVideos,
      ["Personal Loan Eligibility", "Credit Score Tips"],
      5,
    );
    expect(rows[0]).toEqual({ keyword: "personal loan eligibility", source: "Seed" });
    expect(rows[1]).toEqual({ keyword: "credit score tips", source: "Seed" });
  });

  it("extracts recurring two- and three-word phrases", () => {
    const phrases = extractKeywordPhrases([
      "credit score improvement tips",
      "credit score improvement guide",
      "fast credit score improvement",
    ]);
    expect(phrases[0]).toBe("credit score");
    expect(phrases).toContain("credit score improvement");
  });

  it("classifies how-to intent before the broader question pattern", () => {
    expect(inferKeywordIntent("how to improve a credit score")).toBe("How-to");
    expect(inferKeywordIntent("why does credit score change")).toBe("Question");
    expect(inferKeywordIntent("credit card vs personal loan")).toBe("Comparison");
  });

  it("counts only videos whose metadata covers every meaningful term", () => {
    expect(ownedCoverage("BFSI Long-form", brandVideos)).toBeGreaterThan(0);
    expect(ownedCoverage("quantum gardening", brandVideos)).toBe(0);
  });
});

describe("AI visibility recommendations", () => {
  it("scores an uncited coverage gap above an already cited topic", () => {
    const gap = opportunityScore(0, [surface("not-cited")]);
    const visible = opportunityScore(2, [surface("cited")]);
    expect(gap).toBeGreaterThan(visible);
  });

  it("creates editorial briefs with an explicit LLM-readiness checklist", () => {
    const suggestions = buildContentSuggestions(brand, [
      {
        keyword: "personal loan eligibility",
        intent: "Exploration",
        ownedCoverage: 0,
        opportunityScore: 88,
        surfaces: [surface("not-cited")],
      },
    ]);
    expect(suggestions[0].primaryKeyword).toBe("personal loan eligibility");
    expect(suggestions[0].llmReadiness.length).toBeGreaterThanOrEqual(4);
    expect(suggestions[0].angle).toContain("coverage gap");
  });
});
