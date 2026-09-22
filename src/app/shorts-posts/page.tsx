"use client";

import { useMemo, useState } from "react";
import {
  BarChart3,
  Calendar,
  Check,
  FlaskConical,
  MessageSquare,
  PencilLine,
  Play,
  Plus,
  Smartphone,
  Target,
  Zap,
} from "lucide-react";
import { useAppContext } from "@/components/app-context";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  MetricCard,
  SectionHeader,
  inputClass,
} from "@/components/ui";
import { analyzeShorts, durationPerformance, shortsSummary } from "@/lib/shorts";
import { formatMetric } from "@/lib/analytics";
import type { CommunityPost, ShortExperiment } from "@/lib/types";

type Tab = "shorts" | "posts";

async function postJson(body: Record<string, unknown>) {
  const response = await fetch("/api/content-lab", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = (await response.json()) as { error?: string };
  if (!response.ok) throw new Error(payload.error ?? `Request failed (${response.status})`);
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric" }).format(
        date,
      );
}

function signalTone(score: number) {
  if (score >= 75) return "positive" as const;
  if (score >= 55) return "accent" as const;
  return "warning" as const;
}

export default function ShortsPostsPage() {
  const { brandId, brands, videos, shortExperiments, communityPosts, reloadWorkspace } =
    useAppContext();
  const [tab, setTab] = useState<Tab>("shorts");
  const [showExperiment, setShowExperiment] = useState(false);
  const [showPost, setShowPost] = useState(false);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [experimentTitle, setExperimentTitle] = useState("");
  const [hypothesis, setHypothesis] = useState("");
  const [variable, setVariable] = useState<ShortExperiment["variable"]>("Hook");
  const [variantA, setVariantA] = useState("");
  const [variantB, setVariantB] = useState("");
  const [primaryMetric, setPrimaryMetric] =
    useState<ShortExperiment["primaryMetric"]>("Engaged views");
  const [postFormat, setPostFormat] = useState<CommunityPost["format"]>("Poll");
  const [postObjective, setPostObjective] = useState<CommunityPost["objective"]>("Research");
  const [postCopy, setPostCopy] = useState("");
  const [postCta, setPostCta] = useState("");
  const [plannedAt, setPlannedAt] = useState("");
  const [postStatus, setPostStatus] = useState<"Draft" | "Scheduled">("Draft");
  const [resultPostId, setResultPostId] = useState("");
  const [resultMetrics, setResultMetrics] = useState({
    likes: "",
    comments: "",
    votes: "",
    clicks: "",
  });

  const brand = brands.find((item) => item.id === brandId);
  const brandVideos = useMemo(
    () => videos.filter((video) => video.brandId === brandId),
    [brandId, videos],
  );
  const analyses = useMemo(() => analyzeShorts(brandVideos), [brandVideos]);
  const summary = useMemo(() => shortsSummary(brandVideos), [brandVideos]);
  const durationRows = useMemo(() => durationPerformance(brandVideos), [brandVideos]);
  const experiments = shortExperiments.filter((item) => item.brandId === brandId);
  const posts = communityPosts
    .filter((item) => item.brandId === brandId)
    .sort((a, b) => b.plannedAt.localeCompare(a.plannedAt));
  const publishedPosts = posts.filter((post) => post.status === "Published");
  const averagePostInteractions = publishedPosts.length
    ? publishedPosts.reduce(
        (sum, post) => sum + (post.likes ?? 0) + (post.comments ?? 0) + (post.votes ?? 0),
        0,
      ) / publishedPosts.length
    : 0;
  const bestDuration = [...durationRows].sort(
    (a, b) => b.medianEngagedViews - a.medianEngagedViews,
  )[0];
  const topShort = analyses[0]?.video;

  const postFormatRows = (["Poll", "Image", "Text", "Quiz", "Video"] as CommunityPost["format"][])
    .map((format) => {
      const rows = publishedPosts.filter((post) => post.format === format);
      return {
        format,
        posts: rows.length,
        likes: rows.length
          ? Math.round(rows.reduce((sum, post) => sum + (post.likes ?? 0), 0) / rows.length)
          : null,
        comments: rows.length
          ? Math.round(rows.reduce((sum, post) => sum + (post.comments ?? 0), 0) / rows.length)
          : null,
        votes: rows.length
          ? Math.round(rows.reduce((sum, post) => sum + (post.votes ?? 0), 0) / rows.length)
          : null,
        clicks: rows.length
          ? Math.round(rows.reduce((sum, post) => sum + (post.clicks ?? 0), 0) / rows.length)
          : null,
      };
    })
    .filter((row) => row.posts > 0);

  async function saveExperiment() {
    setSaving(true);
    setMessage("");
    try {
      await postJson({
        action: "createShortExperiment",
        brandId,
        title: experimentTitle,
        hypothesis,
        variable,
        variantA,
        variantB,
        primaryMetric,
      });
      await reloadWorkspace();
      setExperimentTitle("");
      setHypothesis("");
      setVariantA("");
      setVariantB("");
      setShowExperiment(false);
      setMessage("Shorts experiment saved as Planned.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save experiment");
    } finally {
      setSaving(false);
    }
  }

  async function advanceExperiment(experiment: ShortExperiment) {
    const status = experiment.status === "Planned" ? "Running" : "Completed";
    setSaving(true);
    try {
      await postJson({
        action: "updateShortExperiment",
        id: experiment.id,
        status,
        ...(status === "Completed" ? { winner: "Inconclusive" } : {}),
      });
      await reloadWorkspace();
      setMessage(
        status === "Running"
          ? "Experiment started."
          : "Experiment completed. Record a winner after reviewing both variants.",
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update experiment");
    } finally {
      setSaving(false);
    }
  }

  async function savePost() {
    setSaving(true);
    setMessage("");
    try {
      await postJson({
        action: "createCommunityPost",
        brandId,
        format: postFormat,
        objective: postObjective,
        copy: postCopy,
        cta: postCta,
        plannedAt,
        status: postStatus,
      });
      await reloadWorkspace();
      setPostCopy("");
      setPostCta("");
      setPlannedAt("");
      setShowPost(false);
      setMessage(`Post saved as ${postStatus}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save post");
    } finally {
      setSaving(false);
    }
  }

  async function savePostResult(post: CommunityPost) {
    setSaving(true);
    setMessage("");
    try {
      await postJson({
        action: "updateCommunityPost",
        id: post.id,
        status: "Published",
        likes: Number(resultMetrics.likes || 0),
        comments: Number(resultMetrics.comments || 0),
        votes: Number(resultMetrics.votes || 0),
        clicks: Number(resultMetrics.clicks || 0),
      });
      await reloadWorkspace();
      setResultPostId("");
      setMessage("Post result recorded. Format benchmarks have been refreshed.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not record result");
    } finally {
      setSaving(false);
    }
  }

  function applyPostIdea(
    format: CommunityPost["format"],
    objective: CommunityPost["objective"],
    copy: string,
    cta: string,
  ) {
    setPostFormat(format);
    setPostObjective(objective);
    setPostCopy(copy);
    setPostCta(cta);
    setShowPost(true);
  }

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex flex-wrap gap-2">
            <Badge tone="accent">
              <Zap size={12} /> Optimization lab
            </Badge>
            {brand?.source === "demo" && <Badge tone="neutral">Demo signals</Badge>}
          </div>
          <h1 className="page-title mt-4">Shorts & Posts</h1>
          <p className="page-subtitle">
            Turn short-form and Community content into measured experiments for{" "}
            {brand?.name ?? "the selected brand"}.
          </p>
        </div>
        <div className="flex rounded-xl border border-[var(--border)] bg-white p-1">
          <button
            onClick={() => setTab("shorts")}
            className={`inline-flex h-9 items-center gap-2 rounded-lg px-4 text-sm font-semibold ${tab === "shorts" ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "text-[var(--muted)]"}`}
          >
            <Smartphone size={15} /> Shorts
          </button>
          <button
            onClick={() => setTab("posts")}
            className={`inline-flex h-9 items-center gap-2 rounded-lg px-4 text-sm font-semibold ${tab === "posts" ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "text-[var(--muted)]"}`}
          >
            <MessageSquare size={15} /> Posts
          </button>
        </div>
      </div>
      {message && (
        <div
          role="status"
          className="rounded-xl border border-violet-100 bg-violet-50 p-4 text-sm font-semibold text-violet-800"
        >
          {message}
        </div>
      )}

      {tab === "shorts" && (
        <div className="space-y-7">
          <div className="grid-auto-cards">
            <MetricCard
              label="Shorts analysed"
              value={String(summary.count)}
              note="Selected brand"
              icon={<Smartphone size={17} />}
            />
            <MetricCard
              label="Median engaged views"
              value={formatMetric(summary.medianEngagedViews)}
              note="Comparable Shorts"
              icon={<Play size={17} />}
            />
            <MetricCard
              label="Average viewed"
              value={
                summary.averageViewPercentage === null
                  ? "N/A"
                  : `${summary.averageViewPercentage.toFixed(0)}%`
              }
              note="Available analytics only"
              icon={<BarChart3 size={17} />}
            />
            <MetricCard
              label="Chose to view"
              value={
                summary.choseToViewRate === null ? "N/A" : `${summary.choseToViewRate.toFixed(1)}%`
              }
              note={brand?.source === "demo" ? "Demo Studio signal" : "Studio-only if unavailable"}
              icon={<Target size={17} />}
            />
            <MetricCard
              label="Subscriber conversion"
              value={summary.count ? summary.subscribersPerThousand.toFixed(1) : "N/A"}
              note="Subscribers per 1K views"
              icon={<Zap size={17} />}
            />
          </div>

          {analyses.length === 0 ? (
            <EmptyState
              title="No Shorts available"
              description="Connect YouTube and sync video analytics. Shorts are identified by YouTube's content-type dimension when available; the app does not rely only on duration."
            />
          ) : (
            <>
              <section className="space-y-4">
                <SectionHeader
                  eyebrow="Act next"
                  title="Optimization priorities"
                  description="Recommendations are tied to measured signals; unavailable inputs are excluded."
                />
                <div className="grid gap-4 lg:grid-cols-3">
                  <Card className="p-5">
                    <Badge
                      tone={
                        summary.choseToViewRate === null
                          ? "warning"
                          : summary.choseToViewRate >= 55
                            ? "positive"
                            : "warning"
                      }
                    >
                      Hook
                    </Badge>
                    <p className="mt-4 text-lg font-bold">
                      {summary.choseToViewRate === null
                        ? "Capture the Studio signal"
                        : summary.choseToViewRate < 55
                          ? "Test a clearer first-frame promise"
                          : "Protect the opening pattern"}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                      {summary.choseToViewRate === null
                        ? "Viewed-versus-swiped is not returned by the current API sync. Use it from YouTube Studio before making a hook claim."
                        : `${summary.choseToViewRate.toFixed(1)}% chose to view across available Shorts. Test one hook variable at a time.`}
                    </p>
                  </Card>
                  <Card className="p-5">
                    <Badge
                      tone={
                        summary.averageViewPercentage === null
                          ? "warning"
                          : summary.averageViewPercentage >= 80
                            ? "positive"
                            : "accent"
                      }
                    >
                      Hold
                    </Badge>
                    <p className="mt-4 text-lg font-bold">
                      {summary.averageViewPercentage === null
                        ? "Retention sync required"
                        : summary.averageViewPercentage < 80
                          ? "Tighten the middle section"
                          : "Completion is a strength"}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                      {summary.averageViewPercentage === null
                        ? "Average percentage viewed remains unavailable, so no retention diagnosis is generated."
                        : `Average percentage viewed is ${summary.averageViewPercentage.toFixed(0)}%. Compare the opening, proof point and payoff—not just length.`}
                    </p>
                  </Card>
                  <Card className="p-5">
                    <Badge tone="accent">Length cohort</Badge>
                    <p className="mt-4 text-lg font-bold">
                      {bestDuration ? `${bestDuration.label} leads` : "More samples required"}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                      {bestDuration
                        ? `${bestDuration.videos} Short${bestDuration.videos === 1 ? "" : "s"} in this band produced a ${formatMetric(bestDuration.medianEngagedViews)} median. Treat small cohorts as a test direction, not a rule.`
                        : "Publish enough Shorts to compare length bands without over-reading one result."}
                    </p>
                  </Card>
                </div>
              </section>

              <Card className="overflow-hidden">
                <div className="p-5">
                  <SectionHeader
                    title="Shorts scorecard"
                    description="Hook, hold, engaged-view scale, engagement and subscriber conversion are re-weighted when a metric is unavailable."
                  />
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[980px] text-left text-sm">
                    <thead className="bg-[var(--surface)] text-xs uppercase tracking-wide text-[var(--muted)]">
                      <tr>
                        <th className="px-5 py-3">Short</th>
                        <th className="px-5 py-3">Length</th>
                        <th className="px-5 py-3">Engaged views</th>
                        <th className="px-5 py-3">Avg. viewed</th>
                        <th className="px-5 py-3">Chose to view</th>
                        <th className="px-5 py-3">Score</th>
                        <th className="px-5 py-3">Focus next</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {analyses.map(({ video, score, focus }) => (
                        <tr key={video.id}>
                          <td className="max-w-md px-5 py-4">
                            <p className="line-clamp-2 font-semibold">{video.title}</p>
                            <p className="mt-1 text-xs text-[var(--muted)]">
                              Published {video.publishedAt}
                            </p>
                          </td>
                          <td className="px-5 py-4">{video.durationSeconds}s</td>
                          <td className="px-5 py-4 font-semibold">
                            {formatMetric(video.engagedViews ?? video.views)}
                          </td>
                          <td className="px-5 py-4">
                            {video.averageViewPercentage === undefined
                              ? "—"
                              : `${video.averageViewPercentage.toFixed(0)}%`}
                          </td>
                          <td className="px-5 py-4">
                            {video.choseToViewRate === undefined
                              ? "—"
                              : `${video.choseToViewRate.toFixed(1)}%`}
                          </td>
                          <td className="px-5 py-4">
                            <Badge tone={signalTone(score)}>{score}/100</Badge>
                          </td>
                          <td className="px-5 py-4 font-semibold text-[var(--accent)]">{focus}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              <div className="grid gap-4 lg:grid-cols-[1fr_1.35fr]">
                <Card className="p-5">
                  <SectionHeader
                    title="Length cohorts"
                    description="Compare outcomes within the selected brand."
                  />
                  <div className="mt-5 space-y-3">
                    {durationRows.map((row) => (
                      <div
                        key={row.label}
                        className="grid grid-cols-[1fr_auto_auto] items-center gap-4 rounded-xl bg-[var(--surface)] p-4"
                      >
                        <div>
                          <p className="text-sm font-semibold">{row.label}</p>
                          <p className="mt-1 text-xs text-[var(--muted)]">
                            {row.videos} video{row.videos === 1 ? "" : "s"}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold">
                            {formatMetric(row.medianEngagedViews)}
                          </p>
                          <p className="text-[10px] text-[var(--muted)]">median engaged</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold">
                            {row.averageViewPercentage === null
                              ? "—"
                              : `${row.averageViewPercentage.toFixed(0)}%`}
                          </p>
                          <p className="text-[10px] text-[var(--muted)]">average viewed</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
                <Card className="p-5">
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <SectionHeader
                      title="Experiment tracker"
                      description="Change one variable, name the primary metric and record the outcome."
                    />
                    <Button onClick={() => setShowExperiment((value) => !value)}>
                      <FlaskConical size={16} /> New test
                    </Button>
                  </div>
                  {showExperiment && (
                    <div className="mt-5 grid gap-3 rounded-2xl border border-violet-200 bg-violet-50/40 p-4 sm:grid-cols-2">
                      <input
                        className={`${inputClass} sm:col-span-2`}
                        value={experimentTitle}
                        onChange={(event) => setExperimentTitle(event.target.value)}
                        placeholder="Test name"
                      />
                      <textarea
                        className="min-h-24 rounded-xl border border-[var(--border-strong)] bg-white p-3 text-sm sm:col-span-2"
                        value={hypothesis}
                        onChange={(event) => setHypothesis(event.target.value)}
                        placeholder="If we change…, then… because…"
                      />
                      <select
                        className={inputClass}
                        value={variable}
                        onChange={(event) =>
                          setVariable(event.target.value as ShortExperiment["variable"])
                        }
                      >
                        {["Hook", "Length", "Pacing", "CTA", "Caption", "Audio"].map((item) => (
                          <option key={item}>{item}</option>
                        ))}
                      </select>
                      <select
                        className={inputClass}
                        value={primaryMetric}
                        onChange={(event) =>
                          setPrimaryMetric(event.target.value as ShortExperiment["primaryMetric"])
                        }
                      >
                        {[
                          "Engaged views",
                          "Average percentage viewed",
                          "Subscribers per 1K",
                          "Engagement rate",
                          "Chose to view",
                        ].map((item) => (
                          <option key={item}>{item}</option>
                        ))}
                      </select>
                      <input
                        className={inputClass}
                        value={variantA}
                        onChange={(event) => setVariantA(event.target.value)}
                        placeholder="Variant A"
                      />
                      <input
                        className={inputClass}
                        value={variantB}
                        onChange={(event) => setVariantB(event.target.value)}
                        placeholder="Variant B"
                      />
                      <Button
                        className="sm:col-span-2"
                        onClick={saveExperiment}
                        disabled={
                          saving || !experimentTitle || !hypothesis || !variantA || !variantB
                        }
                      >
                        {saving ? "Saving…" : "Save experiment"}
                      </Button>
                    </div>
                  )}
                  <div className="mt-5 space-y-3">
                    {experiments.length === 0 ? (
                      <p className="rounded-xl bg-[var(--surface)] p-5 text-sm text-[var(--muted)]">
                        No experiments yet. Start with the weakest scorecard signal.
                      </p>
                    ) : (
                      experiments.map((experiment) => (
                        <div
                          key={experiment.id}
                          className="rounded-xl border border-[var(--border)] p-4"
                        >
                          <div className="flex flex-wrap items-start gap-3">
                            <div className="flex-1">
                              <div className="flex flex-wrap gap-2">
                                <Badge
                                  tone={
                                    experiment.status === "Completed"
                                      ? "positive"
                                      : experiment.status === "Running"
                                        ? "accent"
                                        : "neutral"
                                  }
                                >
                                  {experiment.status}
                                </Badge>
                                <Badge>{experiment.variable}</Badge>
                                {experiment.source === "demo" && <Badge tone="neutral">Demo</Badge>}
                              </div>
                              <p className="mt-3 font-semibold">{experiment.title}</p>
                              <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                                {experiment.hypothesis}
                              </p>
                              <p className="mt-3 text-xs">
                                <strong>A:</strong> {experiment.variantA}{" "}
                                <span className="mx-2 text-[var(--border-strong)]">|</span>{" "}
                                <strong>B:</strong> {experiment.variantB}
                              </p>
                              <p className="mt-2 text-xs text-[var(--muted)]">
                                Primary: {experiment.primaryMetric}
                                {experiment.winner ? ` · Winner: ${experiment.winner}` : ""}
                              </p>
                            </div>
                            {experiment.status !== "Completed" && (
                              <Button
                                variant="secondary"
                                onClick={() => advanceExperiment(experiment)}
                                disabled={saving}
                              >
                                {experiment.status === "Planned" ? "Start" : "Complete"}
                              </Button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </Card>
              </div>
            </>
          )}
          <Card className="flex flex-wrap items-start gap-4 border-amber-200 bg-amber-50/50 p-5">
            <Target className="mt-0.5 text-amber-700" />
            <div className="flex-1">
              <p className="font-semibold">Metric availability matters</p>
              <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                Engaged views and average percentage viewed can be synced for owned videos. “Shown
                in feed” and “chose to view” are displayed only when explicitly available; they are
                never inferred from public views.
              </p>
            </div>
          </Card>
        </div>
      )}

      {tab === "posts" && (
        <div className="space-y-7">
          <Card className="flex flex-wrap items-start gap-4 border-violet-200 bg-violet-50/40 p-5">
            <MessageSquare className="mt-0.5 text-[var(--accent)]" />
            <div className="flex-1">
              <p className="font-semibold">Posts use a planning and results workflow</p>
              <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                The current YouTube Data API does not expose a Community Post resource for
                publishing or retrieving post records. Plan here, publish in YouTube Studio, then
                record the observed result.
              </p>
            </div>
            <Button onClick={() => setShowPost((value) => !value)}>
              <Plus size={16} /> New post
            </Button>
          </Card>
          <div className="grid-auto-cards">
            <MetricCard
              label="Planned posts"
              value={String(posts.filter((post) => post.status !== "Published").length)}
              note="Draft + scheduled"
              icon={<Calendar size={17} />}
            />
            <MetricCard
              label="Published results"
              value={String(publishedPosts.length)}
              note="With manual/demo outcomes"
              icon={<Check size={17} />}
            />
            <MetricCard
              label="Avg. interactions"
              value={publishedPosts.length ? formatMetric(averagePostInteractions) : "N/A"}
              note="Likes + comments + votes"
              icon={<MessageSquare size={17} />}
            />
            <MetricCard
              label="Formats tested"
              value={String(new Set(publishedPosts.map((post) => post.format)).size)}
              note="Avoid single-format conclusions"
              icon={<FlaskConical size={17} />}
            />
          </div>

          {showPost && (
            <Card className="p-5">
              <SectionHeader
                eyebrow="Plan"
                title="Create Community Post"
                description="Save the hypothesis and call to action before publishing."
              />
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <label className="text-sm font-semibold">
                  Format
                  <select
                    className={`${inputClass} mt-2 w-full`}
                    value={postFormat}
                    onChange={(event) =>
                      setPostFormat(event.target.value as CommunityPost["format"])
                    }
                  >
                    {["Poll", "Image", "Text", "Quiz", "Video"].map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                </label>
                <label className="text-sm font-semibold">
                  Objective
                  <select
                    className={`${inputClass} mt-2 w-full`}
                    value={postObjective}
                    onChange={(event) =>
                      setPostObjective(event.target.value as CommunityPost["objective"])
                    }
                  >
                    {["Conversation", "Research", "Traffic", "Awareness"].map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                </label>
                <label className="text-sm font-semibold md:col-span-2">
                  Post copy
                  <textarea
                    className="mt-2 min-h-28 w-full rounded-xl border border-[var(--border-strong)] bg-white p-3 text-sm"
                    value={postCopy}
                    onChange={(event) => setPostCopy(event.target.value)}
                    placeholder="Write the question, prompt or post copy"
                  />
                </label>
                <label className="text-sm font-semibold">
                  Call to action
                  <input
                    className={`${inputClass} mt-2 w-full`}
                    value={postCta}
                    onChange={(event) => setPostCta(event.target.value)}
                    placeholder="e.g. Vote and explain why"
                  />
                </label>
                <label className="text-sm font-semibold">
                  Planned time
                  <input
                    type="datetime-local"
                    className={`${inputClass} mt-2 w-full`}
                    value={plannedAt}
                    onChange={(event) => setPlannedAt(event.target.value)}
                  />
                </label>
                <label className="text-sm font-semibold">
                  Status
                  <select
                    className={`${inputClass} mt-2 w-full`}
                    value={postStatus}
                    onChange={(event) => setPostStatus(event.target.value as "Draft" | "Scheduled")}
                  >
                    <option>Draft</option>
                    <option>Scheduled</option>
                  </select>
                </label>
                <div className="flex items-end">
                  <Button
                    onClick={savePost}
                    disabled={saving || !postCopy || !postCta || !plannedAt}
                  >
                    {saving ? "Saving…" : "Save post"}
                  </Button>
                </div>
              </div>
            </Card>
          )}

          <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
            <Card className="overflow-hidden">
              <div className="flex flex-wrap items-end justify-between gap-3 p-5">
                <SectionHeader
                  title="Post calendar"
                  description="Move from idea to result without pretending the app published it."
                />
                <Button variant="secondary" onClick={() => setShowPost(true)}>
                  <PencilLine size={15} /> Add draft
                </Button>
              </div>
              {posts.length === 0 ? (
                <div className="p-5">
                  <EmptyState
                    title="No posts planned"
                    description="Create a post brief, publish it in YouTube Studio and return to record results."
                  />
                </div>
              ) : (
                <div className="divide-y divide-[var(--border)]">
                  {posts.map((post) => (
                    <div key={post.id} className="p-5">
                      <div className="flex flex-wrap items-start gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap gap-2">
                            <Badge
                              tone={
                                post.status === "Published"
                                  ? "positive"
                                  : post.status === "Scheduled"
                                    ? "accent"
                                    : "neutral"
                              }
                            >
                              {post.status}
                            </Badge>
                            <Badge>{post.format}</Badge>
                            <Badge tone="neutral">{post.objective}</Badge>
                            {post.source === "demo" && <Badge tone="neutral">Demo</Badge>}
                          </div>
                          <p className="mt-3 font-semibold leading-6">{post.copy}</p>
                          <p className="mt-2 text-xs text-[var(--muted)]">
                            {formatDate(post.plannedAt)} · CTA: {post.cta}
                          </p>
                          {post.status === "Published" && (
                            <p className="mt-3 text-xs font-semibold text-[var(--accent)]">
                              {post.likes ?? 0} likes · {post.comments ?? 0} comments ·{" "}
                              {post.votes ?? 0} votes · {post.clicks ?? 0} clicks
                            </p>
                          )}
                        </div>
                        <Button
                          variant="secondary"
                          onClick={() => {
                            setResultPostId(post.id);
                            setResultMetrics({
                              likes: String(post.likes ?? ""),
                              comments: String(post.comments ?? ""),
                              votes: String(post.votes ?? ""),
                              clicks: String(post.clicks ?? ""),
                            });
                          }}
                        >
                          Record result
                        </Button>
                      </div>
                      {resultPostId === post.id && (
                        <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-[var(--surface)] p-3 sm:grid-cols-5">
                          {(["likes", "comments", "votes", "clicks"] as const).map((metric) => (
                            <input
                              key={metric}
                              type="number"
                              min="0"
                              className={inputClass}
                              value={resultMetrics[metric]}
                              onChange={(event) =>
                                setResultMetrics((current) => ({
                                  ...current,
                                  [metric]: event.target.value,
                                }))
                              }
                              placeholder={metric[0].toUpperCase() + metric.slice(1)}
                            />
                          ))}
                          <Button onClick={() => savePostResult(post)} disabled={saving}>
                            Save result
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
            <div className="space-y-4">
              <Card className="p-5">
                <SectionHeader
                  title="Format benchmarks"
                  description="Averages from recorded published posts."
                />
                <div className="mt-5 space-y-3">
                  {postFormatRows.length === 0 ? (
                    <p className="text-sm text-[var(--muted)]">
                      Record published results to compare formats.
                    </p>
                  ) : (
                    postFormatRows.map((row) => (
                      <div key={row.format} className="rounded-xl bg-[var(--surface)] p-4">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold">{row.format}</p>
                          <Badge tone={row.posts < 3 ? "warning" : "positive"}>
                            {row.posts} sample{row.posts === 1 ? "" : "s"}
                          </Badge>
                        </div>
                        <p className="mt-2 text-xs text-[var(--muted)]">
                          Avg. {row.likes ?? 0} likes · {row.comments ?? 0} comments ·{" "}
                          {row.votes ?? 0} votes · {row.clicks ?? 0} clicks
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </Card>
              <Card className="p-5">
                <SectionHeader eyebrow="Ideas" title="Turn insight into a post" />
                <div className="mt-4 space-y-3">
                  {[
                    [
                      "Poll",
                      "Research",
                      `Which part of “${topShort?.title ?? "our next topic"}” should we explain next?`,
                      "Vote, then add your question in the comments",
                    ],
                    [
                      "Image",
                      "Awareness",
                      "Save this simple checklist before your next decision.",
                      "Save the post and share it with someone who needs it",
                    ],
                    [
                      "Text",
                      "Conversation",
                      "What is one piece of advice in this category you no longer believe?",
                      "Reply with your experience",
                    ],
                  ].map(([format, objective, copy, cta]) => (
                    <button
                      key={format}
                      onClick={() =>
                      applyPostIdea(
                          format as CommunityPost["format"],
                          objective as CommunityPost["objective"],
                          copy,
                          cta,
                        )
                      }
                      className="w-full rounded-xl border border-[var(--border)] p-4 text-left hover:border-violet-200"
                    >
                      <p className="text-xs font-bold uppercase tracking-wide text-[var(--accent)]">
                        {format} · {objective}
                      </p>
                      <p className="mt-2 text-sm font-semibold leading-6">{copy}</p>
                    </button>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
