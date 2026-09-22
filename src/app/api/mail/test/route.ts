import { NextResponse } from "next/server";
import { z } from "zod";
import { getMailProvider, type MailAttachment } from "@/lib/providers/mail";
import { getWorkspaceReportData } from "@/lib/report-data";
import { parseReportRange } from "@/lib/report-selection";
import { appendRuntimeItem } from "@/lib/runtime-store";

const payloadSchema = z.object({
  brandId: z.string().min(1).max(80),
  reportName: z.string().trim().min(1).max(160),
  recipients: z.array(z.email()).min(1).max(20),
  cc: z.array(z.email()).max(20).optional(),
  formats: z
    .array(z.enum(["Excel", "PDF"]))
    .min(1)
    .max(2),
  sections: z.array(z.string().max(80)).max(20).optional(),
  metrics: z.array(z.string().max(80)).max(20).optional(),
  range: z.string().max(40).optional(),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  compare: z.string().max(40).optional(),
  message: z.string().max(4000).optional(),
});

export async function POST(request: Request) {
  const result = payloadSchema.safeParse(await request.json());
  if (!result.success)
    return NextResponse.json(
      { error: "Invalid send-test payload", issues: result.error.issues },
      { status: 400 },
    );

  const payload = result.data;
  const provider = getMailProvider();
  const customRange =
    payload.startDate && payload.endDate
      ? { startDate: payload.startDate, endDate: payload.endDate }
      : undefined;
  const report = await getWorkspaceReportData(
    payload.brandId,
    parseReportRange(payload.range ?? null),
    customRange,
  );

  try {
    const attachments: MailAttachment[] = [];
    for (const format of payload.formats) {
      const endpoint = format === "Excel" ? "excel" : "pdf";
      const artifactUrl = new URL(`/api/reports/${endpoint}`, request.url);
      artifactUrl.searchParams.set("brandId", payload.brandId);
      if (payload.sections) artifactUrl.searchParams.set("sections", payload.sections.join(","));
      if (payload.metrics) artifactUrl.searchParams.set("metrics", payload.metrics.join(","));
      if (payload.range) artifactUrl.searchParams.set("range", payload.range);
      if (payload.startDate) artifactUrl.searchParams.set("startDate", payload.startDate);
      if (payload.endDate) artifactUrl.searchParams.set("endDate", payload.endDate);
      if (payload.compare) artifactUrl.searchParams.set("compare", payload.compare);
      const response = await fetch(artifactUrl, { cache: "no-store" });
      if (!response.ok) throw new Error(`${format} generation failed (${response.status})`);
      attachments.push({
        filename: `${report.brand.name.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}-youtube-report.${endpoint === "excel" ? "xlsx" : "pdf"}`,
        content: new Uint8Array(await response.arrayBuffer()),
        contentType:
          format === "Excel"
            ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            : "application/pdf",
      });
    }

    const delivery = await provider.send({
      to: payload.recipients,
      cc: payload.cc,
      subject: `[TEST] ${payload.reportName} - ${report.brand.name}`,
      text:
        payload.message ??
        `Test delivery for ${report.brand.name}. Report period: ${report.period}.`,
      attachments,
    });
    await appendRuntimeItem("deliveryLogs", {
      id: crypto.randomUUID(),
      brandId: payload.brandId,
      state: provider.name === "Local preview" ? "previewed" : "sent",
      provider: provider.name,
      messageId: delivery.id,
      recipients: payload.recipients,
      attemptedAt: new Date().toISOString(),
    });
    return NextResponse.json({
      ok: true,
      provider: provider.name,
      id: delivery.id,
      preview: delivery.preview,
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    await appendRuntimeItem("deliveryLogs", {
      id: crypto.randomUUID(),
      brandId: payload.brandId,
      state: "failed",
      provider: provider.name,
      error: detail,
      attemptedAt: new Date().toISOString(),
    });
    return NextResponse.json({ error: detail }, { status: 500 });
  }
}
