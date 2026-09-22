"use client";

import { useMemo, useState } from "react";
import {
  Check,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Download,
  GripVertical,
  Save,
  Send,
  Sparkles,
} from "lucide-react";
import { useAppContext } from "@/components/app-context";
import { Badge, Button, Card, inputClass } from "@/components/ui";
import { frequencyLabel, type RepeatUnit, type ReportFrequency } from "@/lib/schedule";
import type { ComparisonKey, DateRangeKey } from "@/lib/types";

const steps = ["Details", "Metrics", "Sections", "Insights", "Branding", "Export"];
const metrics = [
  "Views",
  "Watch time",
  "Net subscribers",
  "Average view duration",
  "Engagement",
  "Traffic sources",
  "Search queries",
  "Audience",
];
const allSections = [
  "Executive Summary",
  "Channel Overview",
  "Content Performance",
  "Top Videos",
  "Bottom / Underperforming Videos",
  "Shorts Performance",
  "Long-form Performance",
  "Traffic Sources",
  "Search Queries",
  "Audience",
  "Video Diagnostics",
  "Competitor Analysis",
  "Strategy Opportunities",
  "Recommendations",
];

export default function ReportBuilderPage() {
  const {
    brandId,
    brands,
    comparison,
    dateRange,
    customDateRange,
    setComparison,
    setDateRange,
    setCustomDateRange,
    reloadWorkspace,
  } = useAppContext();
  const [step, setStep] = useState(0);
  const [reportName, setReportName] = useState("Monthly YouTube Performance");
  const [selectedMetrics, setSelectedMetrics] = useState(metrics.slice(0, 6));
  const [sections, setSections] = useState(
    allSections.filter((_, index) => [0, 1, 2, 3, 7, 8, 11, 12, 13].includes(index)),
  );
  const [aiEnabled, setAiEnabled] = useState(true);
  const [style, setStyle] = useState("Executive");
  const [insight, setInsight] = useState(
    "Views softened versus the previous period while YouTube Search remained resilient. Lower Browse exposure likely contributed. Restore long-form cadence and extend the strongest decision-focused topic.",
  );
  const [approved, setApproved] = useState(false);
  const [formats, setFormats] = useState(["Excel", "PDF"]);
  const [recipients, setRecipients] = useState("");
  const [frequency, setFrequency] = useState<ReportFrequency>("Monthly");
  const [repeatEvery, setRepeatEvery] = useState(2);
  const [repeatUnit, setRepeatUnit] = useState<RepeatUnit>("Weeks");
  const [nextRun, setNextRun] = useState("");
  const [saved, setSaved] = useState(false);
  const [sending, setSending] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [sendStatus, setSendStatus] = useState("");
  const brand = brands.find((item) => item.id === brandId);
  const activeBrand = brand ?? {
    id: brandId,
    name: "Selected brand",
    accent: "#6d4aff",
    initials: "BR",
  };
  const toggle = (list: string[], setList: (items: string[]) => void, item: string) =>
    setList(list.includes(item) ? list.filter((value) => value !== item) : [...list, item]);
  const query = useMemo(
    () =>
      new URLSearchParams({
        brandId,
        sections: sections.join(","),
        metrics: selectedMetrics.join(","),
        range: dateRange,
        compare: comparison,
        ...(dateRange === "custom" ? customDateRange : {}),
      }).toString(),
    [brandId, comparison, customDateRange, dateRange, sections, selectedMetrics],
  );

  async function saveTemplate() {
    await fetch("/api/state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        collection: "reportTemplates",
        item: {
          brandId,
          reportName,
          selectedMetrics,
          sections,
          dateRange,
          ...(dateRange === "custom" ? customDateRange : {}),
          comparison,
          aiEnabled,
          style,
          formats,
          frequency,
          ...(frequency === "Custom" ? { repeatEvery, repeatUnit } : {}),
        },
      }),
    });
    setSaved(true);
  }

  async function saveSchedule() {
    setScheduling(true);
    setSendStatus("");
    try {
      const recipientList = [
        ...new Set(
          recipients
            .split(/[,;\n]/)
            .map((value) => value.trim())
            .filter(Boolean),
        ),
      ];
      if (recipientList.length === 0) throw new Error("Add at least one recipient email.");
      if (!nextRun) throw new Error("Choose the first delivery date and time.");
      const response = await fetch("/api/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandId,
          reportName,
          frequency,
          ...(frequency === "Custom" ? { repeatEvery, repeatUnit } : {}),
          recipients: recipientList,
          formats,
          sections,
          selectedMetrics,
          dateRange,
          comparison,
          ...(dateRange === "custom" ? customDateRange : {}),
          nextRun: new Date(nextRun).toISOString(),
        }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "The report could not be scheduled.");
      await reloadWorkspace();
      setSaved(true);
      setSendStatus(
        "Report scheduled for " +
          recipientList.length +
          " recipient" +
          (recipientList.length === 1 ? "." : "s."),
      );
    } catch (error) {
      setSendStatus(error instanceof Error ? error.message : "The report could not be scheduled.");
    } finally {
      setScheduling(false);
    }
  }

  async function sendTest() {
    setSending(true);
    setSendStatus("");
    try {
      const response = await fetch("/api/mail/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandId,
          reportName,
          recipients: recipients
            .split(/[,;\n]/)
            .map((value) => value.trim())
            .filter(Boolean),
          formats,
          sections,
          metrics: selectedMetrics,
          range: dateRange,
          compare: comparison,
          ...(dateRange === "custom" ? customDateRange : {}),
        }),
      });
      const result = (await response.json()) as { error?: string; provider?: string };
      if (!response.ok) throw new Error(result.error ?? "Test delivery failed");
      setSendStatus(
        result.provider === "Local preview"
          ? "Test prepared in local preview mode and logged."
          : "Test email sent through SMTP.",
      );
    } catch (error) {
      setSendStatus(error instanceof Error ? error.message : "Test delivery failed");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Badge tone="accent">Report builder</Badge>
        <h1 className="page-title mt-4">Build a client report</h1>
        <p className="page-subtitle">
          Choose the story, review commentary, preview the result and produce real Excel/PDF
          artifacts.
        </p>
      </div>
      <div className="grid grid-cols-3 gap-2 md:grid-cols-6">
        {steps.map((label, index) => (
          <button
            key={label}
            onClick={() => setStep(index)}
            className={`rounded-xl border px-3 py-3 text-left text-xs font-semibold ${index === step ? "border-violet-300 bg-[var(--accent-soft)] text-[var(--accent)]" : index < step ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-[var(--border)] bg-white text-[var(--muted)]"}`}
          >
            <span className="mr-2">{index < step ? "✓" : index + 1}</span>
            {label}
          </button>
        ))}
      </div>
      <Card className="min-h-[490px] p-5 lg:p-7">
        {step === 0 && (
          <div className="max-w-2xl space-y-5">
            <h2 className="text-xl font-bold">Report details</h2>
            <label className="block text-sm font-semibold">
              Brand / channel
              <select className={`${inputClass} mt-2 w-full`} value={activeBrand.id} disabled>
                <option>{activeBrand.name}</option>
              </select>
            </label>
            <label className="block text-sm font-semibold">
              Report name
              <input
                className={`${inputClass} mt-2 w-full`}
                value={reportName}
                onChange={(event) => setReportName(event.target.value)}
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-semibold">
                Date range
                <select
                  className={`${inputClass} mt-2 w-full`}
                  value={dateRange}
                  onChange={(event) => setDateRange(event.target.value as DateRangeKey)}
                >
                  <option value="7d">Last 7 days</option>
                  <option value="28d">Last 28 days</option>
                  <option value="last-month">Last month</option>
                  <option value="quarter">This quarter</option>
                  <option value="365d">Last 365 days</option>
                  <option value="custom">Custom range</option>
                </select>
              </label>
              <label className="block text-sm font-semibold">
                Comparison
                <select
                  className={`${inputClass} mt-2 w-full`}
                  value={comparison}
                  onChange={(event) => setComparison(event.target.value as ComparisonKey)}
                >
                  <option value="previous">Previous period</option>
                  <option value="previous-month">Previous month</option>
                  <option value="previous-year">Previous year</option>
                  <option value="none">No comparison</option>
                </select>
              </label>
            </div>
            {dateRange === "custom" && (
              <div className="rounded-2xl border border-violet-200 bg-violet-50/40 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <CalendarDays size={17} className="text-[var(--accent)]" />
                  Custom report period
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="block text-sm font-semibold">
                    Start date
                    <input
                      type="date"
                      className={inputClass + " mt-2 w-full"}
                      value={customDateRange.startDate}
                      max={customDateRange.endDate || undefined}
                      onChange={(event) =>
                        setCustomDateRange({
                          ...customDateRange,
                          startDate: event.target.value,
                        })
                      }
                    />
                  </label>
                  <label className="block text-sm font-semibold">
                    End date
                    <input
                      type="date"
                      className={inputClass + " mt-2 w-full"}
                      value={customDateRange.endDate}
                      min={customDateRange.startDate || undefined}
                      onChange={(event) =>
                        setCustomDateRange({
                          ...customDateRange,
                          endDate: event.target.value,
                        })
                      }
                    />
                  </label>
                </div>
              </div>
            )}
          </div>
        )}
        {step === 1 && (
          <div>
            <h2 className="text-xl font-bold">Select metrics</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Only selected, available metrics are included. Suppressed data is labeled rather than
              estimated.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {metrics.map((metric) => (
                <button
                  key={metric}
                  onClick={() => toggle(selectedMetrics, setSelectedMetrics, metric)}
                  className={`flex items-center justify-between rounded-xl border p-4 text-left text-sm font-semibold ${selectedMetrics.includes(metric) ? "border-violet-300 bg-[var(--accent-soft)]" : "border-[var(--border)]"}`}
                >
                  <span>{metric}</span>
                  {selectedMetrics.includes(metric) && (
                    <Check size={16} className="text-[var(--accent)]" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
        {step === 2 && (
          <div>
            <h2 className="text-xl font-bold">Select and order sections</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Included sections appear first. Use arrows to adjust the narrative order.
            </p>
            <div className="mt-5 grid gap-5 lg:grid-cols-2">
              <div className="space-y-2">
                {sections.map((section, index) => (
                  <div
                    key={section}
                    className="flex items-center gap-3 rounded-xl border border-[var(--border)] p-3"
                  >
                    <GripVertical size={16} className="text-[var(--muted)]" />
                    <span className="flex-1 text-sm font-semibold">{section}</span>
                    <button
                      disabled={index === 0}
                      onClick={() =>
                        setSections((current) => {
                          const next = [...current];
                          [next[index - 1], next[index]] = [next[index], next[index - 1]];
                          return next;
                        })
                      }
                      className="px-2 text-xs disabled:opacity-30"
                    >
                      ↑
                    </button>
                    <button
                      disabled={index === sections.length - 1}
                      onClick={() =>
                        setSections((current) => {
                          const next = [...current];
                          [next[index], next[index + 1]] = [next[index + 1], next[index]];
                          return next;
                        })
                      }
                      className="px-2 text-xs disabled:opacity-30"
                    >
                      ↓
                    </button>
                    <button
                      onClick={() =>
                        setSections((current) => current.filter((item) => item !== section))
                      }
                      className="px-2 text-xs text-red-600"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--muted)]">
                  Available sections
                </p>
                <div className="flex flex-wrap gap-2">
                  {allSections
                    .filter((item) => !sections.includes(item))
                    .map((section) => (
                      <button
                        onClick={() => setSections((current) => [...current, section])}
                        key={section}
                        className="rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-semibold hover:border-violet-200"
                      >
                        + {section}
                      </button>
                    ))}
                </div>
              </div>
            </div>
          </div>
        )}
        {step === 3 && (
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold">AI commentary</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  Structured evidence in, editable commentary out. Human approval is required.
                </p>
              </div>
              <label className="flex items-center gap-2 text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={aiEnabled}
                  onChange={(event) => setAiEnabled(event.target.checked)}
                  className="size-4 accent-violet-600"
                />{" "}
                Include AI commentary
              </label>
            </div>
            <div className="mt-5 flex gap-2">
              {["Executive", "Detailed", "Concise"].map((item) => (
                <button
                  onClick={() => setStyle(item)}
                  key={item}
                  className={`rounded-lg px-3 py-2 text-xs font-semibold ${style === item ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "bg-[var(--surface)] text-[var(--muted)]"}`}
                >
                  {item}
                </button>
              ))}
            </div>
            <div className="mt-5 rounded-xl border border-[var(--border)] p-4">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-[var(--accent)]" />
                <p className="text-sm font-semibold">Executive Summary</p>
                <Badge tone="neutral">Mock provider</Badge>
                {approved && <Badge tone="positive">Approved</Badge>}
              </div>
              <textarea
                value={insight}
                onChange={(event) => {
                  setInsight(event.target.value);
                  setApproved(false);
                }}
                className="mt-4 min-h-36 w-full resize-y rounded-xl bg-[var(--surface)] p-4 text-sm leading-7 outline-none"
              />
              <div className="mt-3 flex gap-2">
                <Button onClick={() => setApproved(true)}>
                  <Check size={16} /> Approve
                </Button>
                <Button variant="secondary">Regenerate</Button>
              </div>
            </div>
          </div>
        )}
        {step === 4 && (
          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <h2 className="text-xl font-bold">Branding</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Parallax branding remains restrained so client content leads.
              </p>
              <div className="mt-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
                <div
                  className="grid size-14 place-items-center rounded-xl text-lg font-black text-white"
                  style={{ background: activeBrand.accent }}
                >
                  {activeBrand.initials}
                </div>
                <p className="mt-6 text-2xl font-bold">{activeBrand.name}</p>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  YouTube Performance & Strategy Report
                </p>
                <p className="mt-8 text-xs font-bold uppercase tracking-widest text-[var(--accent)]">
                  Parallax — YouTube Intelligence Hub
                </p>
              </div>
            </div>
            <div className="space-y-4">
              <label className="block text-sm font-semibold">
                Client logo
                <input
                  type="file"
                  className="mt-2 block w-full rounded-xl border border-dashed border-[var(--border-strong)] p-5 text-sm"
                />
              </label>
              <label className="block text-sm font-semibold">
                Cover title
                <input
                  className={`${inputClass} mt-2 w-full`}
                  defaultValue="YouTube Performance & Strategy Report"
                />
              </label>
              <label className="block text-sm font-semibold">
                Footer
                <input
                  className={`${inputClass} mt-2 w-full`}
                  defaultValue="Parallax — YouTube Intelligence Hub · Confidential"
                />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" defaultChecked className="size-4 accent-violet-600" />{" "}
                Include Parallax branding
              </label>
            </div>
          </div>
        )}
        {step === 5 && (
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold">Preview & export</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  Generate, download, send or schedule the reviewed report.
                </p>
              </div>
              <Badge tone={approved || !aiEnabled ? "positive" : "warning"}>
                {approved || !aiEnabled ? "Ready" : "Insight approval recommended"}
              </Badge>
            </div>
            <div className="mt-6 grid gap-4 lg:grid-cols-[1.3fr_1fr]">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
                <div className="aspect-[1/1.15] rounded-xl bg-white p-7 shadow-sm">
                  <div className="h-2 w-16 rounded-full bg-[var(--accent)]" />
                  <p className="mt-8 text-2xl font-bold">{activeBrand.name}</p>
                  <p className="mt-1 text-sm text-[var(--muted)]">{reportName}</p>
                  <div className="mt-8 grid grid-cols-2 gap-3">
                    {selectedMetrics.slice(0, 4).map((metric, index) => (
                      <div className="rounded-lg bg-[var(--surface)] p-3" key={metric}>
                        <p className="text-[9px] text-[var(--muted)]">{metric}</p>
                        <p className="mt-1 text-sm font-bold">
                          {["134K", "6.2K h", "+412", "3:18"][index]}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-7 h-24 rounded-lg bg-gradient-to-b from-violet-50 to-transparent" />
                </div>
              </div>
              <div className="space-y-4">
                <Card className="p-4">
                  <p className="text-sm font-semibold">Formats</p>
                  <div className="mt-3 flex gap-2">
                    {["Excel", "PDF"].map((format) => (
                      <button
                        onClick={() => toggle(formats, setFormats, format)}
                        key={format}
                        className={`rounded-lg px-3 py-2 text-xs font-semibold ${formats.includes(format) ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "bg-[var(--surface)]"}`}
                      >
                        {formats.includes(format) && "✓ "}
                        {format}
                      </button>
                    ))}
                  </div>
                </Card>
                <Card className="p-4">
                  <p className="text-sm font-semibold">Delivery</p>
                  <textarea
                    value={recipients}
                    onChange={(event) => setRecipients(event.target.value)}
                    className="mt-3 min-h-24 w-full rounded-xl border border-[var(--border-strong)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-violet-100"
                    aria-label="Recipients"
                    placeholder={"client@example.com\nteam@example.com"}
                  />
                  <p className="mt-2 text-xs text-[var(--muted)]">
                    Separate up to 20 recipients with commas, semicolons or new lines.
                  </p>
                  <select
                    value={frequency}
                    onChange={(event) => setFrequency(event.target.value as ReportFrequency)}
                    aria-label="Report frequency"
                    className={`${inputClass} mt-3 w-full`}
                  >
                    <option>Weekly</option>
                    <option>Monthly</option>
                    <option>Custom</option>
                  </select>
                  {frequency === "Custom" && (
                    <div className="mt-3 rounded-xl border border-violet-200 bg-violet-50/60 p-3">
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
                            value={repeatEvery}
                            onChange={(event) =>
                              setRepeatEvery(
                                Math.max(1, Math.min(365, Number(event.target.value) || 1)),
                              )
                            }
                            className={`${inputClass} mt-1 w-full`}
                          />
                        </label>
                        <label className="text-xs font-semibold text-[var(--muted)]">
                          Interval
                          <select
                            value={repeatUnit}
                            onChange={(event) => setRepeatUnit(event.target.value as RepeatUnit)}
                            className={`${inputClass} mt-1 w-full`}
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
                  <input
                    type="datetime-local"
                    value={nextRun}
                    onChange={(event) => setNextRun(event.target.value)}
                    className={`${inputClass} mt-3 w-full`}
                    aria-label="First scheduled delivery"
                  />
                  <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
                    Schedules run only while the local worker and computer remain on.
                  </p>
                  {sendStatus && (
                    <p className="mt-2 text-xs font-semibold text-[var(--accent)]" role="status">
                      {sendStatus}
                    </p>
                  )}
                </Card>
                <div className="grid gap-2">
                  {formats.includes("Excel") && (
                    <a href={`/api/reports/excel?${query}`}>
                      <Button className="w-full">
                        <Download size={16} /> Download Excel
                      </Button>
                    </a>
                  )}
                  {formats.includes("PDF") && (
                    <a href={`/api/reports/pdf?${query}`}>
                      <Button variant="secondary" className="w-full">
                        <Download size={16} /> Download PDF
                      </Button>
                    </a>
                  )}
                  <Button
                    variant="secondary"
                    onClick={sendTest}
                    disabled={sending || formats.length === 0}
                  >
                    <Send size={16} /> {sending ? "Preparing test..." : "Send test"}
                  </Button>
                  <Button
                    onClick={saveSchedule}
                    disabled={scheduling || formats.length === 0 || !recipients.trim() || !nextRun}
                  >
                    <Save size={16} /> {scheduling ? "Scheduling..." : "Schedule report"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>
      <div className="flex items-center justify-between">
        <Button
          variant="secondary"
          disabled={step === 0}
          onClick={() => setStep((value) => Math.max(0, value - 1))}
        >
          <ChevronLeft size={16} /> Back
        </Button>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={saveTemplate}>
            <Save size={16} /> {saved ? "Saved" : "Save template"}
          </Button>
          {step < steps.length - 1 && (
            <Button onClick={() => setStep((value) => Math.min(steps.length - 1, value + 1))}>
              Continue <ChevronRight size={16} />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
