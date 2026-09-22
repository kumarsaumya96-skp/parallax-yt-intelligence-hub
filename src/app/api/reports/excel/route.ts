import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { getWorkspaceReportData } from "@/lib/report-data";
import {
  comparisonLabel,
  parseComparison,
  parseCsvSelection,
  parseCustomDateRange,
  parseReportRange,
  workbookSheetsForSections,
} from "@/lib/report-selection";

const headerFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF6D4AFF" } } as const;
const headerFont = { bold: true, color: { argb: "FFFFFFFF" } };

function styleTable(sheet: ExcelJS.Worksheet, headerRow = 1, dataRowHeight = 21) {
  const row = sheet.getRow(headerRow);
  row.height = 24;
  row.eachCell((cell) => {
    cell.fill = headerFill;
    cell.font = headerFont;
    cell.alignment = { vertical: "middle" };
  });
  sheet.views = [{ state: "frozen", ySplit: headerRow, showGridLines: false }];
  sheet.autoFilter = {
    from: { row: headerRow, column: 1 },
    to: { row: headerRow, column: Math.max(1, sheet.columnCount) },
  };
  sheet.eachRow((dataRow, rowNumber) => {
    if (rowNumber > headerRow) {
      dataRow.alignment = { vertical: "middle", wrapText: true };
      dataRow.height = dataRowHeight;
      dataRow.eachCell((cell) => {
        cell.border = { bottom: { style: "hair", color: { argb: "FFE8EAF0" } } };
      });
    }
  });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const brandId = url.searchParams.get("brandId") ?? "brand-1";
  const sections = parseCsvSelection(url.searchParams, "sections");
  const selectedMetrics = parseCsvSelection(url.searchParams, "metrics");
  const comparison = parseComparison(url.searchParams.get("compare"));
  const data = await getWorkspaceReportData(
    brandId,
    parseReportRange(url.searchParams.get("range")),
    parseCustomDateRange(url.searchParams),
  );
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Parallax — YouTube Intelligence Hub";
  workbook.created = new Date("2026-09-01");

  const summary = workbook.addWorksheet("Executive Summary");
  summary.columns = [{ width: 25 }, { width: 62 }];
  summary.addRow([
    "Parallax — YouTube Intelligence Hub",
    `${data.brand.name} - YouTube Performance Report`,
  ]);
  summary.addRow(["Report period", data.period]);
  summary.addRow(["Comparison", comparisonLabel(comparison)]);
  summary.addRow(["Approved commentary", data.executiveSummary]);
  summary.views = [{ showGridLines: false }];
  summary.getRow(1).eachCell((cell) => {
    cell.fill = headerFill;
    cell.font = headerFont;
  });
  summary.getRow(4).height = 82;
  summary.getCell("A4").font = { bold: true, color: { argb: "FF172033" } };
  summary.getCell("A4").alignment = { wrapText: true, vertical: "top" };
  summary.getCell("B4").alignment = { wrapText: true, vertical: "top" };

  const overview = workbook.addWorksheet("Channel Overview");
  overview.columns = [
    { header: "Metric", key: "metric", width: 28 },
    { header: "Value", key: "value", width: 22 },
    { header: "Period", key: "period", width: 32 },
  ];
  const overviewRows = [
    { selection: "Views", metric: "Views", value: data.aggregate.views, period: data.period },
    {
      selection: "Watch time",
      metric: "Watch time (hours)",
      value: Math.round(data.aggregate.watchMinutes / 60),
      period: data.period,
    },
    {
      selection: "Net subscribers",
      metric: "Net subscribers",
      value: data.aggregate.netSubscribers,
      period: data.period,
    },
    {
      selection: "Average view duration",
      metric: "Average view duration (seconds)",
      value: Math.round(data.aggregate.avgViewDuration),
      period: data.period,
    },
    {
      selection: "Engagement",
      metric: "Engagement rate",
      value: data.aggregate.engagement,
      period: data.period,
    },
  ];
  overview.addRows(
    overviewRows.filter(
      (row) => selectedMetrics === null || selectedMetrics.includes(row.selection),
    ),
  );
  overview.getColumn("value").numFmt = "#,##0.00";
  styleTable(overview);

  const performance = workbook.addWorksheet("Video Performance");
  performance.columns = [
    { header: "Title", key: "title", width: 54 },
    { header: "Published", key: "published", width: 14 },
    { header: "Format", key: "format", width: 14 },
    { header: "Views", key: "views", width: 14 },
    { header: "Watch time (hours)", key: "watch", width: 20 },
    { header: "Subscribers", key: "subs", width: 14 },
    { header: "Engagement", key: "engagement", width: 14 },
  ];
  performance.addRows(
    data.topVideos.map((video) => ({
      title: video.title,
      published: new Date(video.publishedAt),
      format: video.format,
      views: video.views,
      watch: Math.round(video.watchMinutes / 60),
      subs: video.subscribers,
      engagement: video.engagementRate,
    })),
  );
  performance.getColumn("published").numFmt = "dd-mmm-yyyy";
  performance.getColumn("engagement").numFmt = "0.0%";
  styleTable(performance);

  const traffic = workbook.addWorksheet("Traffic Sources");
  traffic.columns = [
    { header: "Source", key: "source", width: 28 },
    { header: "Share", key: "share", width: 16 },
    { header: "Insight", key: "insight", width: 54 },
  ];
  traffic.addRows(
    data.isDemo
      ? [
          ["Browse", 0.34, "Demo snapshot: largest source"],
          ["YouTube Search", 0.26, "Demo snapshot: resilient evergreen demand"],
          ["Suggested", 0.18, "Demo snapshot"],
          ["Shorts feed", 0.14, "Demo snapshot"],
          ["External", 0.08, "Demo snapshot"],
        ]
      : [["Unavailable", null, "Detailed traffic-source sync required; no values estimated"]],
  );
  traffic.getColumn(2).numFmt = "0%";
  styleTable(traffic);

  const queries = workbook.addWorksheet("Search Queries");
  queries.columns = [
    { header: "Query", key: "query", width: 48 },
    { header: "Views", key: "views", width: 15 },
    { header: "Share", key: "share", width: 15 },
  ];
  queries.addRows(
    data.isDemo
      ? [
          "how to compare interest rates",
          "best savings plan 2026",
          "loan eligibility explained",
          "credit score myths",
          "monthly budget checklist",
        ].map((query, index) => ({ query, views: 4620 - index * 610, share: 0.18 - index * 0.022 }))
      : [{ query: "Unavailable until detailed search-query sync", views: null, share: null }],
  );
  queries.getColumn("share").numFmt = "0.0%";
  styleTable(queries);

  const audience = workbook.addWorksheet("Audience");
  audience.columns = [
    { header: "Dimension", key: "dimension", width: 30 },
    { header: "Segment", key: "segment", width: 30 },
    { header: "Share", key: "share", width: 15 },
    { header: "Availability", key: "availability", width: 26 },
  ];
  audience.addRows(
    data.isDemo
      ? [
          ["Device", "Mobile", 0.71, "Demo-only"],
          ["Geography", "India", 0.84, "Demo-only"],
          ["Subscription", "Non-subscriber", 0.67, "Demo-only"],
          ["Age/Gender", "Suppressed", null, "Privacy threshold"],
        ]
      : [["Audience", "Unavailable", null, "Audience sync required; privacy thresholds may apply"]],
  );
  audience.getColumn(3).numFmt = "0%";
  styleTable(audience);

  const competitorSheet = workbook.addWorksheet("Competitors");
  competitorSheet.columns = [
    { header: "Channel", key: "channel", width: 32 },
    { header: "Subscribers", key: "subscribers", width: 16 },
    { header: "Recent uploads", key: "uploads", width: 16 },
    { header: "Median recent views", key: "views", width: 20 },
    { header: "Shorts share", key: "shorts", width: 14 },
  ];
  competitorSheet.addRows(
    data.competitors.map((item) => ({
      channel: item.name,
      subscribers: item.subscribers,
      uploads: item.recentUploads,
      views: item.medianViews,
      shorts: item.shortsShare,
    })),
  );
  competitorSheet.getColumn("shorts").numFmt = "0%";
  styleTable(competitorSheet);

  const opportunitySheet = workbook.addWorksheet("Strategy Opportunities");
  opportunitySheet.columns = [
    { header: "Opportunity", key: "title", width: 54 },
    { header: "Type", key: "type", width: 18 },
    { header: "Priority", key: "priority", width: 14 },
    { header: "Score", key: "score", width: 12 },
    { header: "Recommended format", key: "format", width: 22 },
    { header: "Why it matters", key: "summary", width: 62 },
  ];
  opportunitySheet.addRows(
    data.opportunities.map((item) => ({
      title: item.title,
      type: item.type,
      priority: item.priority,
      score: item.score,
      format: item.format,
      summary: item.summary,
    })),
  );
  styleTable(opportunitySheet, 1, 48);

  const raw = workbook.addWorksheet("Raw Data");
  raw.columns = [
    { header: "Date", key: "date", width: 15 },
    { header: "Views", key: "views", width: 14 },
    { header: "Watch minutes", key: "watch", width: 18 },
    { header: "Subscribers gained", key: "gained", width: 20 },
    { header: "Subscribers lost", key: "lost", width: 18 },
    { header: "Likes", key: "likes", width: 14 },
    { header: "Comments", key: "comments", width: 14 },
    { header: "Shares", key: "shares", width: 14 },
  ];
  raw.addRows(
    data.metrics.map((metric) => ({
      date: new Date(metric.date),
      views: metric.views,
      watch: metric.watchMinutes,
      gained: metric.subscribersGained,
      lost: metric.subscribersLost,
      likes: metric.likes,
      comments: metric.comments,
      shares: metric.shares,
    })),
  );
  raw.getColumn("date").numFmt = "dd-mmm-yyyy";
  styleTable(raw);

  const includedSheets = new Set<string>(workbookSheetsForSections(sections));
  for (const sheet of [...workbook.worksheets]) {
    if (!includedSheets.has(sheet.name)) workbook.removeWorksheet(sheet.id);
  }

  if (workbook.worksheets.length === 0) {
    const empty = workbook.addWorksheet("Report Selection");
    empty.columns = [{ width: 72 }];
    empty.addRow([
      "No report sections were selected. Return to the report builder and choose at least one section.",
    ]);
    empty.getCell("A1").alignment = { wrapText: true, vertical: "top" };
    empty.getRow(1).height = 48;
    empty.views = [{ showGridLines: false }];
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const safeName = data.brand.name
    .replaceAll(/[^a-zA-Z0-9]+/g, "-")
    .replaceAll(/^-|-$/g, "")
    .toLowerCase();
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${safeName}-youtube-report.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
