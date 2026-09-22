"use client";

import { useMemo, useState } from "react";
import {
  Bot,
  CheckCircle2,
  ChevronDown,
  CirclePlay,
  CircleSlash2,
  ExternalLink,
  FileQuestion,
  LoaderCircle,
  ScanSearch,
  Search,
  Sparkles,
  Target,
} from "lucide-react";
import { useAppContext } from "@/components/app-context";
import { Badge, Button, Card, EmptyState, SectionHeader, inputClass } from "@/components/ui";
import type { AiVisibilityRun, AiVisibilityStatus, AiVisibilitySurface } from "@/lib/types";

const surfaceIcons: Record<AiVisibilitySurface, typeof Search> = {
  "YouTube Search": CirclePlay,
  "Google AI Overview": Search,
  "OpenAI web search": Bot,
  "Gemini grounded search": Sparkles,
};

function statusTone(status: AiVisibilityStatus) {
  if (status === "cited") return "positive" as const;
  if (status === "not-cited") return "warning" as const;
  if (status === "preview") return "accent" as const;
  return "neutral" as const;
}

function statusLabel(status: AiVisibilityStatus) {
  if (status === "cited") return "Visible";
  if (status === "not-cited") return "Not cited";
  if (status === "preview") return "Preview";
  return "Not configured";
}

function splitKeywords(value: string) {
  return [
    ...new Set(
      value
        .split(/[,;\n]/)
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ].slice(0, 12);
}

function formatRunDate(value: string) {
  const date = new Date(value);
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export default function AiVisibilityPage() {
  const { brandId, brands, aiVisibilityRuns, reloadWorkspace } = useAppContext();
  const brand = brands.find((item) => item.id === brandId);
  const savedRun = useMemo(
    () => aiVisibilityRuns.find((item) => item.brandId === brandId),
    [aiVisibilityRuns, brandId],
  );
  const [currentRun, setCurrentRun] = useState<AiVisibilityRun | null>(null);
  const [seedKeywords, setSeedKeywords] = useState("");
  const [country, setCountry] = useState("IN");
  const [language, setLanguage] = useState("en");
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState("");
  const run = currentRun ?? savedRun;

  async function runAnalysis() {
    if (!brandId) return;
    setRunning(true);
    setMessage("");
    try {
      const response = await fetch("/api/ai-visibility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandId,
          seedKeywords: splitKeywords(seedKeywords),
          country,
          language,
        }),
      });
      const payload = (await response.json()) as { error?: string; run?: AiVisibilityRun };
      if (!response.ok || !payload.run) throw new Error(payload.error ?? "The analysis failed.");
      setCurrentRun(payload.run);
      setMessage(
        payload.run.mode === "preview"
          ? "Preview analysis complete. Configure live providers to measure observed visibility."
          : "Visibility check complete with live provider evidence.",
      );
      await reloadWorkspace();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The analysis failed.");
    } finally {
      setRunning(false);
    }
  }

  const citedCount =
    run?.keywords.reduce(
      (total, keyword) =>
        total +
        keyword.surfaces.reduce(
          (surfaceTotal, surface) =>
            surfaceTotal + surface.citations.filter((citation) => citation.owned).length,
          0,
        ),
      0,
    ) ?? 0;
  const configuredCount = run ? Object.values(run.providerStatus).filter(Boolean).length : 0;

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex flex-wrap gap-2">
            <Badge tone="accent">Generative visibility</Badge>
            {run && (
              <Badge
                tone={
                  run.mode === "live" ? "positive" : run.mode === "mixed" ? "warning" : "neutral"
                }
              >
                {run.mode === "live"
                  ? "Live evidence"
                  : run.mode === "mixed"
                    ? "Mixed evidence"
                    : "Preview only"}
              </Badge>
            )}
          </div>
          <h1 className="page-title mt-4">AI Visibility</h1>
          <p className="page-subtitle">
            Discover query opportunities, check whether owned videos surface in search-grounded AI
            answers, and turn the evidence into stronger content briefs.
          </p>
        </div>
        {run && (
          <p className="text-sm text-[var(--muted)]">
            Last checked {formatRunDate(run.createdAt)} · {run.country.toUpperCase()}
          </p>
        )}
      </div>

      <Card className="overflow-hidden">
        <div className="grid lg:grid-cols-[1.3fr_0.7fr]">
          <div className="p-5 lg:p-6">
            <SectionHeader
              eyebrow="Discovery"
              title="Scrape keywords and check video visibility"
              description="Add priority queries, or leave this empty to discover candidates from owned titles, tags and performance data."
            />
            <label className="mt-5 block text-sm font-semibold">
              Seed keywords
              <textarea
                value={seedKeywords}
                onChange={(event) => setSeedKeywords(event.target.value)}
                className="mt-2 min-h-28 w-full rounded-xl border border-[var(--border-strong)] bg-white px-4 py-3 text-sm leading-6 outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-violet-100"
                placeholder={
                  "personal loan eligibility\nbest savings plan\nhow to improve credit score"
                }
              />
            </label>
            <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
              Up to 12 seeds. Parallax checks the five strongest candidates per run to control API
              usage.
            </p>
          </div>
          <div className="border-t border-[var(--border)] bg-[var(--surface)] p-5 lg:border-l lg:border-t-0 lg:p-6">
            <p className="text-sm font-semibold">Market context</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <label className="text-sm font-semibold">
                Country
                <select
                  className={inputClass + " mt-2 w-full"}
                  value={country}
                  onChange={(event) => setCountry(event.target.value)}
                >
                  <option value="IN">India</option>
                  <option value="US">United States</option>
                  <option value="GB">United Kingdom</option>
                  <option value="AU">Australia</option>
                  <option value="CA">Canada</option>
                </select>
              </label>
              <label className="text-sm font-semibold">
                Language
                <select
                  className={inputClass + " mt-2 w-full"}
                  value={language}
                  onChange={(event) => setLanguage(event.target.value)}
                >
                  <option value="en">English</option>
                  <option value="hi">Hindi</option>
                </select>
              </label>
            </div>
            <Button className="mt-5 h-11 w-full" onClick={runAnalysis} disabled={running || !brand}>
              {running ? (
                <LoaderCircle className="animate-spin" size={17} />
              ) : (
                <ScanSearch size={17} />
              )}
              {running ? "Checking visibility…" : "Run visibility check"}
            </Button>
            <p className="mt-3 text-xs leading-5 text-[var(--muted)]">
              Live checks may use YouTube, SerpApi, OpenAI and Gemini provider credits.
            </p>
            {message && (
              <p className="mt-3 text-sm font-semibold text-[var(--accent)]" role="status">
                {message}
              </p>
            )}
          </div>
        </div>
      </Card>

      {run ? (
        <>
          <div className="grid-auto-cards">
            <Card className="p-5">
              <p className="text-sm text-[var(--muted)]">Queries analysed</p>
              <p className="mt-3 text-3xl font-black">{run.keywords.length}</p>
              <p className="mt-1 text-xs text-[var(--muted)]">Highest-signal candidates</p>
            </Card>
            <Card className="p-5">
              <p className="text-sm text-[var(--muted)]">Live surfaces</p>
              <p className="mt-3 text-3xl font-black">{configuredCount}/4</p>
              <p className="mt-1 text-xs text-[var(--muted)]">Providers configured</p>
            </Card>
            <Card className="p-5">
              <p className="text-sm text-[var(--muted)]">Owned citations</p>
              <p className="mt-3 text-3xl font-black">{citedCount}</p>
              <p className="mt-1 text-xs text-[var(--muted)]">Observed across checked surfaces</p>
            </Card>
            <Card className="p-5">
              <p className="text-sm text-[var(--muted)]">Content briefs</p>
              <p className="mt-3 text-3xl font-black">{run.contentSuggestions.length}</p>
              <p className="mt-1 text-xs text-[var(--muted)]">Ready for editorial review</p>
            </Card>
          </div>

          <section className="space-y-4">
            <SectionHeader
              title="Provider coverage"
              description="A provider is counted only when its live credential and channel connection are available."
            />
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {(Object.entries(run.providerStatus) as [AiVisibilitySurface, boolean][]).map(
                ([surface, configured]) => {
                  const Icon = surfaceIcons[surface];
                  return (
                    <Card className="flex items-center gap-3 p-4" key={surface}>
                      <div className="grid size-10 place-items-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
                        <Icon size={19} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{surface}</p>
                        <p className="mt-1 text-xs text-[var(--muted)]">
                          {configured ? "Connected for live checks" : "Not configured"}
                        </p>
                      </div>
                    </Card>
                  );
                },
              )}
            </div>
          </section>

          <section className="space-y-4">
            <SectionHeader
              title="Keyword visibility matrix"
              description="Visibility means an owned video or channel URL was returned or cited—not merely that the brand name appeared."
            />
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1050px] text-left text-sm">
                  <thead className="bg-[var(--surface)] text-xs uppercase tracking-wide text-[var(--muted)]">
                    <tr>
                      <th className="px-5 py-3">Keyword</th>
                      <th className="px-4 py-3">Owned coverage</th>
                      <th className="px-4 py-3">YouTube</th>
                      <th className="px-4 py-3">AI Overview</th>
                      <th className="px-4 py-3">OpenAI</th>
                      <th className="px-4 py-3">Gemini</th>
                      <th className="px-5 py-3 text-right">Opportunity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {run.keywords.map((row) => (
                      <tr key={row.keyword} className="align-top">
                        <td className="px-5 py-4">
                          <p className="font-semibold text-[var(--ink)]">{row.keyword}</p>
                          <p className="mt-1 text-xs text-[var(--muted)]">{row.intent} intent</p>
                          {row.surfaces.some((surface) => surface.citations.length > 0) && (
                            <details className="mt-3">
                              <summary className="flex cursor-pointer list-none items-center gap-1 text-xs font-semibold text-[var(--accent)]">
                                Evidence links <ChevronDown size={13} />
                              </summary>
                              <div className="mt-2 space-y-1.5">
                                {row.surfaces.flatMap((surface) =>
                                  surface.citations.slice(0, 3).map((citation) => (
                                    <a
                                      key={surface.surface + citation.url}
                                      href={citation.url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="flex max-w-72 items-start gap-1 text-xs text-[var(--muted)] hover:text-[var(--accent)]"
                                    >
                                      <ExternalLink className="mt-0.5 shrink-0" size={12} />
                                      <span className="line-clamp-2">
                                        {citation.title} {citation.owned ? "· Owned" : ""}
                                      </span>
                                    </a>
                                  )),
                                )}
                              </div>
                            </details>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <span className="font-semibold">{row.ownedCoverage}</span>
                          <span className="text-[var(--muted)]"> matching videos</span>
                        </td>
                        {row.surfaces.map((surface) => (
                          <td className="px-4 py-4" key={surface.surface} title={surface.detail}>
                            <Badge tone={statusTone(surface.status)}>
                              {statusLabel(surface.status)}
                              {surface.rank ? ` · #${surface.rank}` : ""}
                            </Badge>
                            <p className="mt-2 max-w-44 text-xs leading-5 text-[var(--muted)]">
                              {surface.detail}
                            </p>
                          </td>
                        ))}
                        <td className="px-5 py-4 text-right">
                          <span className="text-lg font-black">{row.opportunityScore}</span>
                          <span className="text-xs text-[var(--muted)]">/100</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </section>

          <div className="grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
            <section className="space-y-4">
              <SectionHeader
                title="Keyword suggestions"
                description="Prioritised from owned gaps and recurring search language."
              />
              <div className="space-y-3">
                {run.keywordSuggestions.map((suggestion) => (
                  <Card className="p-4" key={suggestion.keyword}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{suggestion.keyword}</p>
                        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                          {suggestion.reason}
                        </p>
                      </div>
                      <Badge
                        tone={
                          suggestion.priority === "High"
                            ? "warning"
                            : suggestion.priority === "Medium"
                              ? "accent"
                              : "neutral"
                        }
                      >
                        {suggestion.priority}
                      </Badge>
                    </div>
                    <p className="mt-3 text-xs text-[var(--muted)]">Source: {suggestion.source}</p>
                  </Card>
                ))}
              </div>
            </section>

            <section className="space-y-4">
              <SectionHeader
                title="Content suggestions for LLM visibility"
                description="Editorial briefs built from the strongest query gaps; recommendations are hypotheses, not ranking guarantees."
              />
              <div className="space-y-3">
                {run.contentSuggestions.map((suggestion) => (
                  <Card className="p-5" key={suggestion.title}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="max-w-2xl">
                        <div className="flex flex-wrap gap-2">
                          <Badge tone="accent">{suggestion.format}</Badge>
                          <Badge>{suggestion.primaryKeyword}</Badge>
                        </div>
                        <h3 className="mt-3 text-lg font-bold tracking-tight">
                          {suggestion.title}
                        </h3>
                        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                          {suggestion.angle}
                        </p>
                      </div>
                      <Target size={20} className="text-[var(--accent)]" />
                    </div>
                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      {suggestion.llmReadiness.map((item) => (
                        <div
                          className="flex items-start gap-2 rounded-xl bg-[var(--surface)] px-3 py-2.5 text-sm"
                          key={item}
                        >
                          <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-600" size={15} />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </Card>
                ))}
              </div>
            </section>
          </div>

          <Card className="flex items-start gap-3 border-amber-200 bg-amber-50/50 p-5">
            {run.mode === "preview" ? (
              <CircleSlash2 className="mt-0.5 shrink-0 text-amber-700" />
            ) : (
              <FileQuestion className="mt-0.5 shrink-0 text-amber-700" />
            )}
            <div>
              <p className="font-semibold">Interpret visibility carefully</p>
              <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                Results are a timestamped sample for the selected market. LLM answers and AI
                Overviews can vary by prompt, location, model, personalisation and time. “Not cited”
                is an observed result for this check, not proof of universal absence.
              </p>
            </div>
          </Card>
        </>
      ) : (
        <EmptyState
          title="No visibility check yet"
          description="Run the first analysis to discover query candidates, inspect provider readiness and create evidence-based content briefs."
        />
      )}
    </div>
  );
}
