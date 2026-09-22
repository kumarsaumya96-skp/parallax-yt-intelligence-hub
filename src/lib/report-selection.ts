import type { ComparisonKey, CustomDateRange, DateRangeKey } from "@/lib/types";

export const workbookSheetOrder = [
  "Executive Summary",
  "Channel Overview",
  "Video Performance",
  "Traffic Sources",
  "Search Queries",
  "Audience",
  "Competitors",
  "Strategy Opportunities",
  "Raw Data",
] as const;

const contentSections = new Set([
  "Content Performance",
  "Top Videos",
  "Bottom / Underperforming Videos",
  "Shorts Performance",
  "Long-form Performance",
  "Video Diagnostics",
]);

const validRanges = new Set<DateRangeKey>([
  "today",
  "yesterday",
  "7d",
  "28d",
  "this-month",
  "last-month",
  "quarter",
  "year",
  "365d",
  "custom",
]);

const comparisonLabels: Record<ComparisonKey, string> = {
  previous: "Previous period",
  "previous-month": "Previous month",
  "previous-year": "Previous year",
  custom: "Custom comparison",
  none: "No comparison",
};

export function parseCsvSelection(params: URLSearchParams, name: string) {
  if (!params.has(name)) return null;
  return (params.get(name) ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

export function parseReportRange(value: string | null): DateRangeKey {
  return value && validRanges.has(value as DateRangeKey) ? (value as DateRangeKey) : "28d";
}

export function parseComparison(value: string | null): ComparisonKey {
  return value && value in comparisonLabels ? (value as ComparisonKey) : "previous";
}

export function parseCustomDateRange(params: URLSearchParams): CustomDateRange | undefined {
  const startDate = params.get("startDate") ?? "";
  const endDate = params.get("endDate") ?? "";
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(startDate) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(endDate) ||
    startDate > endDate
  ) {
    return undefined;
  }
  return { startDate, endDate };
}

export function comparisonLabel(value: ComparisonKey) {
  return comparisonLabels[value];
}

export function workbookSheetsForSections(sections: string[] | null) {
  if (sections === null) return [...workbookSheetOrder];

  const selected = new Set<string>();
  for (const section of sections) {
    if (section === "Executive Summary") selected.add("Executive Summary");
    if (section === "Channel Overview") selected.add("Channel Overview");
    if (contentSections.has(section)) selected.add("Video Performance");
    if (section === "Traffic Sources") selected.add("Traffic Sources");
    if (section === "Search Queries") selected.add("Search Queries");
    if (section === "Audience") selected.add("Audience");
    if (section === "Competitor Analysis") selected.add("Competitors");
    if (section === "Strategy Opportunities" || section === "Recommendations")
      selected.add("Strategy Opportunities");
  }

  return workbookSheetOrder.filter((name) => selected.has(name));
}

export type PdfPageKind = "executive" | "content" | "strategy";

export function pdfPagesForSections(sections: string[] | null): PdfPageKind[] {
  if (sections === null) return ["executive", "content", "strategy"];

  const selected = new Set<PdfPageKind>();
  for (const section of sections) {
    if (section === "Executive Summary" || section === "Channel Overview")
      selected.add("executive");
    if (
      contentSections.has(section) ||
      section === "Traffic Sources" ||
      section === "Search Queries" ||
      section === "Audience"
    )
      selected.add("content");
    if (
      section === "Competitor Analysis" ||
      section === "Strategy Opportunities" ||
      section === "Recommendations"
    )
      selected.add("strategy");
  }
  return ["executive", "content", "strategy"].filter((kind): kind is PdfPageKind =>
    selected.has(kind as PdfPageKind),
  );
}
