import { readRuntimeState, writeRuntimeState } from "../src/lib/runtime-store";
import { getMailProvider, type MailAttachment } from "../src/lib/providers/mail";
import { nextScheduleRun, type RepeatUnit, type ReportFrequency } from "../src/lib/schedule";

const appUrl = process.env.APP_URL ?? "http://localhost:3000";

async function runDueJobs() {
  const state = await readRuntimeState();
  const now = new Date();
  let changed = false;
  for (const schedule of state.schedules) {
    if (
      !schedule.active ||
      typeof schedule.nextRun !== "string" ||
      new Date(schedule.nextRun) > now
    )
      continue;
    const brandId = String(schedule.brandId ?? "brand-1");
    try {
      const formats = Array.isArray(schedule.formats) ? schedule.formats : ["Excel", "PDF"];
      const attachments: MailAttachment[] = [];
      for (const format of formats) {
        const endpoint = format === "Excel" ? "excel" : "pdf";
        const artifactUrl = new URL(`/api/reports/${endpoint}`, appUrl);
        artifactUrl.searchParams.set("brandId", brandId);
        for (const field of [
          "sections",
          "selectedMetrics",
          "dateRange",
          "comparison",
          "startDate",
          "endDate",
        ] as const) {
          const value = schedule[field];
          const queryName =
            field === "selectedMetrics"
              ? "metrics"
              : field === "dateRange"
                ? "range"
                : field === "comparison"
                  ? "compare"
                  : field;
          if (Array.isArray(value)) artifactUrl.searchParams.set(queryName, value.join(","));
          else if (typeof value === "string") artifactUrl.searchParams.set(queryName, value);
        }
        const response = await fetch(artifactUrl);
        if (!response.ok) throw new Error(`${format} generation failed (${response.status})`);
        attachments.push({
          filename: `youtube-report.${endpoint === "excel" ? "xlsx" : "pdf"}`,
          content: new Uint8Array(await response.arrayBuffer()),
          contentType:
            format === "Excel"
              ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              : "application/pdf",
        });
      }
      const provider = getMailProvider();
      const recipients = Array.isArray(schedule.recipients)
        ? schedule.recipients
            .map(String)
            .map((value) => value.trim())
            .filter(Boolean)
        : String(schedule.recipients ?? "")
            .split(/[,;\n]/)
            .map((value) => value.trim())
            .filter(Boolean);
      if (recipients.length === 0) throw new Error("No schedule recipients are configured");
      const delivery = await provider.send({
        to: recipients,
        subject:
          typeof schedule.subject === "string"
            ? schedule.subject
            : String(schedule.reportName ?? "YouTube Performance Report"),
        text:
          typeof schedule.message === "string"
            ? schedule.message
            : "Your scheduled YouTube performance report is attached.",
        attachments,
      });
      state.deliveryLogs.push({
        id: crypto.randomUUID(),
        scheduleId: schedule.id,
        brandId,
        state: provider.name === "Local preview" ? "previewed" : "sent",
        provider: provider.name,
        messageId: delivery.id,
        recipients,
        attemptedAt: now.toISOString(),
      });
      const frequency = String(schedule.frequency ?? "Monthly") as ReportFrequency;
      const repeatEvery = Number(schedule.repeatEvery ?? 1);
      const repeatUnit = String(schedule.repeatUnit ?? "Months") as RepeatUnit;
      schedule.lastRun = now.toISOString();
      schedule.nextRun = nextScheduleRun(now, frequency, repeatEvery, repeatUnit).toISOString();
      changed = true;
      console.log(`[worker] generated due report for ${brandId}`);
    } catch (error) {
      state.deliveryLogs.push({
        id: crypto.randomUUID(),
        scheduleId: schedule.id,
        brandId,
        state: "failed",
        provider: "preview",
        error: error instanceof Error ? error.message : String(error),
        attemptedAt: now.toISOString(),
      });
      changed = true;
      console.error(`[worker] schedule failed for ${brandId}`, error);
    }
  }
  if (changed) await writeRuntimeState(state);
}

console.log(
  `[worker] Parallax scheduler started; app=${appUrl}. Jobs run only while this process and machine are on.`,
);
await runDueJobs();
setInterval(() => void runDueJobs(), 60_000);
