import { NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspaceReportData } from "@/lib/report-data";

const requestSchema = z.object({ brandId: z.string().min(1), range: z.string().default("28d") });

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const data = await getWorkspaceReportData(parsed.data.brandId);
  return NextResponse.json({
    provider: process.env.LLM_PROVIDER ?? "mock",
    summary: data.executiveSummary,
    what_changed: [`${data.aggregate.views.toLocaleString()} views recorded in the report period`, `${data.aggregate.netSubscribers.toLocaleString()} net subscribers gained`],
    likely_drivers: data.isDemo ? ["Lower Browse exposure likely contributed", "Search-led evergreen videos partially offset the decline"] : ["Detailed traffic-source evidence is not available; no driver is assigned"],
    positive_signals: data.isDemo ? ["YouTube Search demand remains healthy", "Subscriber conversion is stable"] : data.metrics.length > 0 ? ["Owned daily analytics are available"] : [],
    negative_signals: data.isDemo ? ["A small set of videos carries a high share of views"] : [],
    opportunities: data.opportunities.slice(0, 3).map((item) => item.title),
    recommended_actions: ["Restore one consistent long-form upload per week", "Publish a follow-up to the strongest comparison topic"],
    confidence_notes: ["Causality is not proven; drivers are inferred from supplied metrics", data.isDemo ? "Synthetic demo data is clearly isolated from live data" : "Unavailable dimensions remain withheld"],
    evidence_refs: ["channel_daily_metrics:report_period", "video_performance:top_10", "traffic_source_metrics:report_period"],
  });
}
