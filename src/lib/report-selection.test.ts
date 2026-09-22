import { describe, expect, it } from "vitest";
import {
  parseCsvSelection,
  parseCustomDateRange,
  parseReportRange,
  pdfPagesForSections,
  workbookSheetsForSections,
} from "@/lib/report-selection";

describe("report export selection", () => {
  it("keeps every workbook sheet when the sections query is omitted", () => {
    expect(workbookSheetsForSections(null)).toHaveLength(9);
  });

  it("maps selected report sections to the corresponding workbook sheets", () => {
    expect(
      workbookSheetsForSections(["Executive Summary", "Top Videos", "Recommendations"]),
    ).toEqual(["Executive Summary", "Video Performance", "Strategy Opportunities"]);
  });

  it("maps custom selections to PDF page groups", () => {
    expect(pdfPagesForSections(["Top Videos", "Competitor Analysis"])).toEqual([
      "content",
      "strategy",
    ]);
  });

  it("distinguishes omitted and intentionally empty query selections", () => {
    expect(parseCsvSelection(new URLSearchParams(), "sections")).toBeNull();
    expect(parseCsvSelection(new URLSearchParams("sections="), "sections")).toEqual([]);
  });

  it("rejects unsupported ranges", () => {
    expect(parseReportRange("7d")).toBe("7d");
    expect(parseReportRange("not-a-range")).toBe("28d");
  });

  it("parses a complete custom report range", () => {
    expect(
      parseCustomDateRange(new URLSearchParams("startDate=2026-08-20&endDate=2026-08-25")),
    ).toEqual({ startDate: "2026-08-20", endDate: "2026-08-25" });
  });
});
