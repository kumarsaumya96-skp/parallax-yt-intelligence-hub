"use client";

import Link from "next/link";
import { useState } from "react";
import { CalendarClock, CalendarPlus, Download, FilePlus2, Send, UsersRound } from "lucide-react";
import { useAppContext } from "@/components/app-context";
import { Badge, Button, Card, EmptyState, SectionHeader, inputClass } from "@/components/ui";
import { frequencyLabel, type RepeatUnit, type ReportFrequency } from "@/lib/schedule";

function parseRecipients(value: string) {
  return [
    ...new Set(
      value
        .split(/[,;\n]/)
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ];
}

function tomorrowAtNine() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(9, 0, 0, 0);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function savedFrequencyLabel(item: Record<string, unknown>) {
  const frequency =
    item.frequency === "Weekly" || item.frequency === "Monthly" || item.frequency === "Custom"
      ? item.frequency
      : "Monthly";
  const repeatUnit =
    item.repeatUnit === "Days" || item.repeatUnit === "Weeks" || item.repeatUnit === "Months"
      ? item.repeatUnit
      : "Months";
  return frequencyLabel(frequency, Number(item.repeatEvery ?? 1), repeatUnit);
}

export default function ReportsPage() {
  const {
    brandId,
    brands,
    reportTemplates,
    schedules,
    deliveryLogs,
    dateRange,
    customDateRange,
    comparison,
    reloadWorkspace,
  } = useAppContext();
  const brand = brands.find((item) => item.id === brandId);
  const template = reportTemplates.find((item) => String(item.brandId) === brandId);
  const templateName = String(
    template?.name ?? template?.reportName ?? "YouTube Performance Report",
  );
  const formats = Array.isArray(template?.formats)
    ? template.formats.map(String).filter((item) => item === "Excel" || item === "PDF")
    : ["Excel", "PDF"];
  const sections = Array.isArray(template?.sections)
    ? template.sections.map(String)
    : ["Executive Summary", "Channel Overview", "Top Videos", "Recommendations"];
  const selectedMetrics = Array.isArray(template?.selectedMetrics)
    ? template.selectedMetrics.map(String)
    : ["Views", "Watch time", "Net subscribers", "Average view duration", "Engagement"];
  const brandDeliveries = deliveryLogs.filter((item) => String(item.brandId) === brandId);
  const brandSchedules = schedules.filter((item) => String(item.brandId) === brandId);

  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [recipients, setRecipients] = useState("");
  const [frequency, setFrequency] = useState<ReportFrequency>("Monthly");
  const [repeatEvery, setRepeatEvery] = useState(2);
  const [repeatUnit, setRepeatUnit] = useState<RepeatUnit>("Weeks");
  const [nextRun, setNextRun] = useState("");
  const [scheduleFormats, setScheduleFormats] = useState<string[]>([]);
  const [scheduling, setScheduling] = useState(false);
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState("");

  function openScheduler() {
    setScheduleOpen(true);
    setStatus("");
    if (!nextRun) setNextRun(tomorrowAtNine());
    if (scheduleFormats.length === 0) setScheduleFormats(formats);
  }

  function reportPayload() {
    return {
      brandId,
      reportName: templateName,
      recipients: parseRecipients(recipients),
      formats: scheduleFormats,
      sections,
      selectedMetrics,
      dateRange,
      comparison,
      ...(dateRange === "custom" ? customDateRange : {}),
    };
  }

  function schedulePayload() {
    return {
      ...reportPayload(),
      frequency,
      ...(frequency === "Custom" ? { repeatEvery, repeatUnit } : {}),
      nextRun: new Date(nextRun).toISOString(),
    };
  }

  async function createSchedule() {
    setScheduling(true);
    setStatus("");
    try {
      const recipientList = parseRecipients(recipients);
      if (recipientList.length === 0) throw new Error("Add at least one recipient email.");
      if (!nextRun) throw new Error("Choose the first delivery date and time.");
      if (scheduleFormats.length === 0) throw new Error("Choose Excel, PDF or both.");
      const response = await fetch("/api/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(schedulePayload()),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "The report could not be scheduled.");
      setStatus(
        "Report scheduled for " +
          recipientList.length +
          " recipient" +
          (recipientList.length === 1 ? "." : "s."),
      );
      await reloadWorkspace();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "The report could not be scheduled.");
    } finally {
      setScheduling(false);
    }
  }

  async function sendTest() {
    setSending(true);
    setStatus("");
    try {
      const recipientList = parseRecipients(recipients);
      if (recipientList.length === 0) throw new Error("Add at least one recipient email.");
      const payload = reportPayload();
      const response = await fetch("/api/mail/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          range: payload.dateRange,
          compare: payload.comparison,
          metrics: payload.selectedMetrics,
        }),
      });
      const result = (await response.json()) as { error?: string; provider?: string };
      if (!response.ok) throw new Error(result.error ?? "Test delivery failed");
      setStatus(
        result.provider === "Local preview"
          ? "Test prepared and logged in preview mode."
          : "Test email sent through SMTP.",
      );
      await reloadWorkspace();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Test delivery failed");
    } finally {
      setSending(false);
    }
  }

  const reportQuery = new URLSearchParams({
    brandId,
    range: dateRange,
    compare: comparison,
    sections: sections.join(","),
    metrics: selectedMetrics.join(","),
    ...(dateRange === "custom" ? customDateRange : {}),
  }).toString();

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex gap-2">
            {brand?.source === "demo" && <Badge tone="accent">Demo report data</Badge>}
          </div>
          <h1 className="page-title mt-4">Reports</h1>
          <p className="page-subtitle">
            Build, schedule and deliver Parallax reports to the people who need them.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={openScheduler} disabled={!brand}>
            <CalendarPlus size={16} /> Schedule report
          </Button>
          <Link
            href={"/reports/new?brand=" + brandId}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[var(--border-strong)] bg-white px-4 text-sm font-semibold"
          >
            <FilePlus2 size={16} /> Build report
          </Link>
        </div>
      </div>

      <div className="grid-auto-cards">
        <Card className="p-5">
          <p className="text-sm text-[var(--muted)]">Saved templates</p>
          <p className="mt-3 text-3xl font-black">{reportTemplates.length}</p>
          <p className="mt-1 text-xs text-[var(--muted)]">Across this workspace</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-[var(--muted)]">Scheduled</p>
          <p className="mt-3 text-3xl font-black">
            {schedules.filter((item) => Boolean(item.active)).length}
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">Active local jobs</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-[var(--muted)]">Delivery attempts</p>
          <p className="mt-3 text-3xl font-black">{deliveryLogs.length}</p>
          <p className="mt-1 text-xs text-[var(--muted)]">Logged by the provider</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-[var(--muted)]">Selected brand</p>
          <p className="mt-3 truncate text-xl font-black">{brand?.name ?? "—"}</p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            {brand?.source === "demo" ? "Fictional presentation data" : "Live workspace"}
          </p>
        </Card>
      </div>

      {scheduleOpen && brand && (
        <Card className="border-violet-200 p-5 lg:p-6">
          <SectionHeader
            eyebrow="Delivery"
            title="Schedule a report for multiple recipients"
            description="Enter up to 20 email addresses separated by commas, semicolons or new lines."
            action={
              <button
                className="text-sm font-semibold text-[var(--muted)]"
                onClick={() => setScheduleOpen(false)}
              >
                Close
              </button>
            }
          />
          <div className="mt-5 grid gap-4 lg:grid-cols-[1.3fr_0.7fr_0.8fr]">
            <label className="block text-sm font-semibold">
              Recipients
              <textarea
                className="mt-2 min-h-28 w-full rounded-xl border border-[var(--border-strong)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-violet-100"
                value={recipients}
                onChange={(event) => setRecipients(event.target.value)}
                placeholder={"client@example.com\nteam@example.com"}
              />
            </label>
            <div className="space-y-4">
              <label className="block text-sm font-semibold">
                Frequency
                <select
                  className={inputClass + " mt-2 w-full"}
                  value={frequency}
                  onChange={(event) => setFrequency(event.target.value as ReportFrequency)}
                >
                  <option>Weekly</option>
                  <option>Monthly</option>
                  <option>Custom</option>
                </select>
              </label>
              {frequency === "Custom" && (
                <div className="rounded-xl border border-violet-200 bg-violet-50/60 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--accent)]">
                    Custom recurrence
                  </p>
                  <div className="mt-2 grid grid-cols-[0.7fr_1.3fr] gap-2">
                    <label className="text-xs font-semibold text-[var(--muted)]">
                      Repeat every
                      <input
                        type="number"
                        min={1}
                        max={365}
                        className={inputClass + " mt-1 w-full"}
                        value={repeatEvery}
                        onChange={(event) =>
                          setRepeatEvery(
                            Math.max(1, Math.min(365, Number(event.target.value) || 1)),
                          )
                        }
                      />
                    </label>
                    <label className="text-xs font-semibold text-[var(--muted)]">
                      Interval
                      <select
                        className={inputClass + " mt-1 w-full"}
                        value={repeatUnit}
                        onChange={(event) => setRepeatUnit(event.target.value as RepeatUnit)}
                      >
                        <option>Days</option>
                        <option>Weeks</option>
                        <option>Months</option>
                      </select>
                    </label>
                  </div>
                  <p className="mt-2 text-xs text-[var(--muted)]">
                    {frequencyLabel("Custom", repeatEvery, repeatUnit)} after each delivery.
                  </p>
                </div>
              )}
              <label className="block text-sm font-semibold">
                First delivery
                <input
                  type="datetime-local"
                  className={inputClass + " mt-2 w-full"}
                  value={nextRun}
                  onChange={(event) => setNextRun(event.target.value)}
                />
              </label>
            </div>
            <div>
              <p className="text-sm font-semibold">Attachments</p>
              <div className="mt-2 space-y-2">
                {["Excel", "PDF"].map((format) => (
                  <label
                    key={format}
                    className="flex h-10 items-center gap-2 rounded-xl border border-[var(--border)] px-3 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={scheduleFormats.includes(format)}
                      onChange={() =>
                        setScheduleFormats((current) =>
                          current.includes(format)
                            ? current.filter((item) => item !== format)
                            : [...current, format],
                        )
                      }
                    />
                    {format}
                  </label>
                ))}
              </div>
              <p className="mt-3 text-xs leading-5 text-[var(--muted)]">
                Range:{" "}
                {dateRange === "custom"
                  ? customDateRange.startDate + " to " + customDateRange.endDate
                  : dateRange}
              </p>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-[var(--border)] pt-4">
            <Button
              onClick={createSchedule}
              disabled={scheduling || sending || !recipients.trim() || !nextRun}
            >
              <CalendarPlus size={16} /> {scheduling ? "Scheduling…" : "Schedule report"}
            </Button>
            <Button
              variant="secondary"
              onClick={sendTest}
              disabled={sending || scheduling || !recipients.trim()}
            >
              <Send size={16} /> {sending ? "Preparing…" : "Send test first"}
            </Button>
            <span className="text-xs text-[var(--muted)]">
              {parseRecipients(recipients).length}/20 recipients
            </span>
            {status && (
              <span className="text-sm font-semibold text-[var(--accent)]" role="status">
                {status}
              </span>
            )}
          </div>
        </Card>
      )}

      {!brand ? (
        <EmptyState title="Select a brand" description="Choose a brand before building a report." />
      ) : (
        <Card className="p-5">
          <SectionHeader
            title={brand.name + " report template"}
            description="Selected account template and delivery configuration."
            action={
              <Badge tone={template ? "positive" : "warning"}>
                {template ? "Ready" : "Default"}
              </Badge>
            }
          />
          <div className="mt-5 grid gap-4 md:grid-cols-4">
            <div>
              <p className="text-xs text-[var(--muted)]">Template</p>
              <p className="mt-1 text-sm font-semibold">{templateName}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--muted)]">Report range</p>
              <p className="mt-1 text-sm font-semibold">
                {dateRange === "custom"
                  ? customDateRange.startDate + " – " + customDateRange.endDate
                  : dateRange}
              </p>
            </div>
            <div>
              <p className="text-xs text-[var(--muted)]">Formats</p>
              <p className="mt-1 text-sm font-semibold">{formats.join(" + ")}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--muted)]">Active schedules</p>
              <p className="mt-1 text-sm font-semibold">
                {brandSchedules.filter((item) => Boolean(item.active)).length}
              </p>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-[var(--border)] pt-4">
            <Link
              href={"/reports/new?brand=" + brand.id}
              className="inline-flex h-10 items-center justify-center rounded-xl bg-[var(--accent)] px-4 text-sm font-semibold text-white"
            >
              Edit template
            </Link>
            <a href={"/api/reports/excel?" + reportQuery}>
              <Button variant="secondary">
                <Download size={16} /> Excel
              </Button>
            </a>
            <a href={"/api/reports/pdf?" + reportQuery}>
              <Button variant="secondary">
                <Download size={16} /> PDF
              </Button>
            </a>
            <Button variant="ghost" onClick={openScheduler}>
              <CalendarPlus size={16} /> Schedule for recipients
            </Button>
          </div>
        </Card>
      )}

      {brandSchedules.length > 0 && (
        <section className="space-y-4">
          <SectionHeader title="Scheduled reports" />
          <div className="grid gap-3 lg:grid-cols-2">
            {brandSchedules.map((item) => {
              const scheduleRecipients = Array.isArray(item.recipients)
                ? item.recipients.map(String)
                : String(item.recipients ?? "")
                    .split(/[,;\n]/)
                    .filter(Boolean);
              return (
                <Card className="p-5" key={String(item.id)}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{String(item.reportName ?? templateName)}</p>
                      <p className="mt-1 text-sm text-[var(--muted)]">
                        {savedFrequencyLabel(item)} · {String(item.nextRun ?? "Pending")}
                      </p>
                    </div>
                    <Badge tone={Boolean(item.active) ? "positive" : "neutral"}>
                      {Boolean(item.active) ? "Active" : "Paused"}
                    </Badge>
                  </div>
                  <div className="mt-4 flex items-center gap-2 text-sm text-[var(--muted)]">
                    <UsersRound size={16} />
                    {scheduleRecipients.length} recipient
                    {scheduleRecipients.length === 1 ? "" : "s"}
                  </div>
                  <p className="mt-2 truncate text-xs text-[var(--muted)]">
                    {scheduleRecipients.join(", ")}
                  </p>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      <section className="space-y-4">
        <SectionHeader title="Recent delivery activity" />
        {brandDeliveries.length === 0 ? (
          <EmptyState
            title="No report deliveries yet"
            description="Download a report or send a test to begin the delivery history."
          />
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-left text-sm">
                <thead className="bg-[var(--surface)] text-xs uppercase tracking-wide text-[var(--muted)]">
                  <tr>
                    <th className="px-5 py-3">Provider</th>
                    <th className="px-5 py-3">State</th>
                    <th className="px-5 py-3">Recipients</th>
                    <th className="px-5 py-3">Attempted</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {brandDeliveries.map((item) => (
                    <tr key={String(item.id)}>
                      <td className="px-5 py-4 font-semibold">
                        {String(item.provider ?? "Local")}
                      </td>
                      <td className="px-5 py-4">
                        <Badge tone={String(item.state) === "failed" ? "critical" : "positive"}>
                          {String(item.state ?? "prepared")}
                        </Badge>
                      </td>
                      <td className="px-5 py-4 text-[var(--muted)]">
                        {Array.isArray(item.recipients) ? item.recipients.join(", ") : "—"}
                      </td>
                      <td className="px-5 py-4 text-[var(--muted)]">
                        {String(item.attemptedAt ?? "—")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </section>

      <Card className="flex flex-wrap items-center gap-4 border-amber-200 bg-amber-50/50 p-5">
        <CalendarClock className="text-amber-700" />
        <div className="flex-1">
          <p className="font-semibold">Keep Parallax running for scheduled delivery</p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            The one-click launcher starts the scheduler automatically. If you start with{" "}
            <code>npm run dev</code>, also run <code>npm run worker</code> in another terminal.
          </p>
        </div>
      </Card>
    </div>
  );
}
