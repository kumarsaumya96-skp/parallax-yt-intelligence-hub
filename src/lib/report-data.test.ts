import { describe, expect, it } from "vitest";
import { getReportData } from "@/lib/report-data";

describe("report selection", () => {
  it("scopes all selected report data to one brand", () => {
    const report = getReportData("brand-1", "28d");
    expect(report.brand.id).toBe("brand-1");
    expect(report.topVideos.every((video) => video.brandId === "brand-1")).toBe(true);
    expect(report.opportunities.every((item) => item.brandId === "brand-1")).toBe(true);
    expect(report.metrics).toHaveLength(28);
  });

  it("uses the selected custom date span in generated report data", () => {
    const report = getReportData("brand-1", "custom", {
      startDate: "2026-08-20",
      endDate: "2026-08-25",
    });
    expect(report.metrics).toHaveLength(6);
    expect(report.period).toContain("Aug 20, 2026");
    expect(report.period).toContain("Aug 25, 2026");
  });
});
