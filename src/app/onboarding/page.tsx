"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CirclePlay,
  FlaskConical,
  Plus,
  ShieldCheck,
} from "lucide-react";
import { useAppContext } from "@/components/app-context";
import { Badge, Button, Card, inputClass } from "@/components/ui";

const steps = ["Brand", "Channel", "Competitors", "Reporting", "Alerts"];

async function postJson(url: string, body: Record<string, unknown>) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = (await response.json()) as { error?: string; brand?: { id: string } };
  if (!response.ok) throw new Error(payload.error ?? `Request failed (${response.status})`);
  return payload;
}

export default function OnboardingPage() {
  const router = useRouter();
  const { brandId, brands, channels, competitors, reloadWorkspace, setBrandId, youtubeConfigured } =
    useAppContext();
  const [step, setStep] = useState(0);
  const [activeBrandId, setActiveBrandId] = useState(brandId);
  const [brandName, setBrandName] = useState("");
  const [industry, setIndustry] = useState("");
  const [manager, setManager] = useState("");
  const [channelName, setChannelName] = useState("");
  const [channelHandle, setChannelHandle] = useState("");
  const [youtubeChannelId, setYoutubeChannelId] = useState("");
  const [competitorName, setCompetitorName] = useState("");
  const [competitorUrl, setCompetitorUrl] = useState("");
  const [recipients, setRecipients] = useState("");
  const [frequency, setFrequency] = useState("Monthly");
  const [formats, setFormats] = useState(["Excel", "PDF"]);
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const selectedBrand =
    brands.find((brand) => brand.id === activeBrandId) ??
    brands.find((brand) => brand.id === brandId);
  const selectedChannels = channels.filter((channel) => channel.brandId === selectedBrand?.id);
  const selectedCompetitors = competitors.filter((item) => item.brandId === selectedBrand?.id);

  async function createBrand() {
    setSaving(true);
    setMessage("");
    try {
      const result = await postJson("/api/workspace", {
        action: "createBrand",
        name: brandName,
        industry,
        accountManager: manager,
      });
      const id = result.brand?.id ?? "";
      await reloadWorkspace();
      setActiveBrandId(id);
      setBrandId(id);
      setStep(1);
      setMessage("Brand created. Add or connect its YouTube channel.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not create brand");
    } finally {
      setSaving(false);
    }
  }

  async function loadDemoWorkspace() {
    setSaving(true);
    setMessage("");
    try {
      await postJson("/api/workspace", { action: "loadDemoWorkspace" });
      await reloadWorkspace();
      setActiveBrandId("brand-1");
      setBrandId("brand-1");
      setMessage("Five demo brands and channels are ready. Opening the demo workspace…");
      router.push("/overview?brand=brand-1");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load the demo workspace");
    } finally {
      setSaving(false);
    }
  }

  async function addChannel() {
    if (!selectedBrand) return;
    setSaving(true);
    setMessage("");
    try {
      await postJson("/api/workspace", {
        action: "createChannel",
        brandId: selectedBrand.id,
        name: channelName,
        handle: channelHandle,
        youtubeChannelId: youtubeChannelId || undefined,
      });
      await reloadWorkspace();
      setChannelName("");
      setChannelHandle("");
      setYoutubeChannelId("");
      setMessage(
        "Channel saved. Connect Google OAuth when you want private YouTube Analytics data.",
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not add channel");
    } finally {
      setSaving(false);
    }
  }

  async function addCompetitor() {
    if (!selectedBrand) return;
    setSaving(true);
    setMessage("");
    try {
      await postJson("/api/workspace", {
        action: "createCompetitor",
        brandId: selectedBrand.id,
        name: competitorName,
        channelUrl: competitorUrl,
      });
      await reloadWorkspace();
      setCompetitorName("");
      setCompetitorUrl("");
      setMessage("Competitor saved for a future public-data sync.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not add competitor");
    } finally {
      setSaving(false);
    }
  }

  async function saveReporting() {
    if (!selectedBrand) return;
    setSaving(true);
    setMessage("");
    try {
      const recipientList = recipients
        .split(/[,;]/)
        .map((value) => value.trim())
        .filter(Boolean);
      await postJson("/api/state", {
        collection: "reportTemplates",
        item: {
          brandId: selectedBrand.id,
          name: `${selectedBrand.name} YouTube Performance`,
          frequency,
          formats,
          recipients: recipientList,
          sections: [
            "Executive Summary",
            "Channel Overview",
            "Video Performance",
            "Traffic Sources",
            "Search Queries",
          ],
        },
      });
      if (recipientList.length > 0)
        await postJson("/api/state", {
          collection: "schedules",
          item: {
            brandId: selectedBrand.id,
            reportName: `${selectedBrand.name} YouTube Performance`,
            frequency,
            formats,
            recipients: recipientList.join(","),
            active: false,
            nextRun: null,
          },
        });
      setStep(4);
      setMessage("Reporting defaults saved. The schedule remains inactive until you enable it.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save reporting defaults");
    } finally {
      setSaving(false);
    }
  }

  async function finish() {
    if (!selectedBrand) return;
    setSaving(true);
    setMessage("");
    try {
      if (alertsEnabled) {
        for (const rule of [
          { metric: "Views", condition: "decrease", threshold: 15 },
          { metric: "Upload inactivity", condition: "above", threshold: 10 },
          { metric: "Scheduled report failure", condition: "crosses", threshold: 1 },
        ])
          await postJson("/api/state", {
            collection: "alertRules",
            item: {
              brandId: selectedBrand.id,
              ...rule,
              window: "7d",
              comparison: "previous",
              channels: ["in-app"],
              active: true,
            },
          });
      }
      await reloadWorkspace();
      router.push(`/overview?brand=${selectedBrand.id}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not finish setup");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <Badge tone="accent">Workspace setup</Badge>
        <h1 className="page-title mt-4">Add a brand and YouTube channel</h1>
        <p className="page-subtitle">
          Create live accounts manually, connect YouTube, or load five clearly labeled demo brands
          for presentations.
        </p>
      </div>
      <div className="grid grid-cols-5 gap-2">
        {steps.map((label, index) => (
          <button
            key={label}
            onClick={() => selectedBrand && setStep(index)}
            disabled={!selectedBrand && index > 0}
            className={`rounded-xl border px-3 py-3 text-left text-xs font-semibold disabled:opacity-40 ${step === index ? "border-violet-300 bg-[var(--accent-soft)] text-[var(--accent)]" : index < step ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-[var(--border)] bg-white text-[var(--muted)]"}`}
          >
            <span className="mr-2">{index < step ? "✓" : index + 1}</span>
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>
      {message && (
        <div
          role="status"
          className="rounded-xl border border-violet-100 bg-violet-50 p-4 text-sm font-semibold text-violet-800"
        >
          {message}
        </div>
      )}

      <Card className="min-h-[470px] p-6 lg:p-8">
        {step === 0 && (
          <div className="space-y-8">
            <div className="grid gap-8 lg:grid-cols-2">
              <div>
                <h2 className="text-xl font-bold">Create a new brand</h2>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                  This creates only the workspace record; no YouTube data is invented.
                </p>
                <div className="mt-6 space-y-4">
                  <label className="block text-sm font-semibold">
                    Brand name
                    <input
                      className={`${inputClass} mt-2 w-full`}
                      value={brandName}
                      onChange={(event) => setBrandName(event.target.value)}
                      placeholder="e.g. Acme Media"
                    />
                  </label>
                  <label className="block text-sm font-semibold">
                    Industry
                    <input
                      className={`${inputClass} mt-2 w-full`}
                      value={industry}
                      onChange={(event) => setIndustry(event.target.value)}
                      placeholder="e.g. Marketing services"
                    />
                  </label>
                  <label className="block text-sm font-semibold">
                    Account manager
                    <input
                      className={`${inputClass} mt-2 w-full`}
                      value={manager}
                      onChange={(event) => setManager(event.target.value)}
                      placeholder="Team member name"
                    />
                  </label>
                  <Button
                    onClick={createBrand}
                    disabled={saving || !brandName || !industry || !manager}
                  >
                    <Plus size={16} /> {saving ? "Creating..." : "Create brand"}
                  </Button>
                </div>
              </div>
              <div>
                <h2 className="text-xl font-bold">Or continue an existing brand</h2>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                  Use this when you want to attach another channel or adjust setup.
                </p>
                {brands.length === 0 ? (
                  <div className="mt-6 rounded-2xl border border-dashed border-[var(--border-strong)] p-8 text-center text-sm text-[var(--muted)]">
                    No brands have been created.
                  </div>
                ) : (
                  <div className="mt-6 max-h-72 space-y-2 overflow-y-auto pr-1">
                    {brands.map((brand) => (
                      <button
                        key={brand.id}
                        onClick={() => {
                          setActiveBrandId(brand.id);
                          setBrandId(brand.id);
                          setStep(1);
                        }}
                        className="flex w-full items-center gap-3 rounded-xl border border-[var(--border)] p-4 text-left hover:border-violet-200"
                      >
                        <span
                          className="grid size-10 place-items-center rounded-xl text-sm font-bold text-white"
                          style={{ background: brand.accent }}
                        >
                          {brand.initials}
                        </span>
                        <span>
                          <span className="block text-sm font-semibold">{brand.name}</span>
                          <span className="text-xs text-[var(--muted)]">
                            {brand.industry}
                            {brand.source === "demo" ? " · Demo" : ""}
                          </span>
                        </span>
                        <ArrowRight className="ml-auto" size={16} />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-4 rounded-2xl border border-violet-200 bg-violet-50/50 p-5 sm:flex-row sm:items-center">
              <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-white text-[var(--accent)] shadow-sm">
                <FlaskConical size={21} />
              </div>
              <div className="flex-1">
                <h3 className="font-bold">Need a presentation-ready workspace?</h3>
                <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                  Load five fictional brands, one channel per brand, 90 days of analytics, videos,
                  competitors, opportunities, alerts and report templates. Demo records remain
                  clearly labeled.
                </p>
              </div>
              <Button variant="secondary" onClick={loadDemoWorkspace} disabled={saving}>
                <FlaskConical size={16} /> {saving ? "Loading…" : "Load 5 demo brands"}
              </Button>
            </div>
          </div>
        )}

        {step === 1 && selectedBrand && (
          <div>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold">Connect {selectedBrand.name}</h2>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                  Google OAuth is required for private owned-channel analytics. Manual entry creates
                  a channel record but does not grant analytics access.
                </p>
              </div>
              <Badge tone={youtubeConfigured ? "positive" : "warning"}>
                {youtubeConfigured ? "OAuth configured" : "Google credentials required"}
              </Badge>
            </div>
            <div className="mt-7 grid gap-5 lg:grid-cols-2">
              <div className="rounded-2xl border border-violet-200 bg-violet-50/40 p-6">
                <CirclePlay className="text-[var(--accent)]" />
                <h3 className="mt-4 font-bold">Connect with Google</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                  Recommended. Select the Google account that owns or manages the YouTube channel.
                </p>
                <a
                  href={`/api/auth/youtube/start?brandId=${selectedBrand.id}`}
                  className={`mt-5 inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-semibold ${youtubeConfigured ? "bg-[var(--accent)] text-white" : "pointer-events-none bg-slate-200 text-slate-500"}`}
                >
                  Connect YouTube
                </a>
              </div>
              <div className="rounded-2xl border border-[var(--border)] p-6">
                <h3 className="font-bold">Add channel manually</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                  Useful for setup before OAuth credentials are ready.
                </p>
                <div className="mt-4 space-y-3">
                  <input
                    className={`${inputClass} w-full`}
                    value={channelName}
                    onChange={(event) => setChannelName(event.target.value)}
                    placeholder="Channel name"
                  />
                  <input
                    className={`${inputClass} w-full`}
                    value={channelHandle}
                    onChange={(event) => setChannelHandle(event.target.value)}
                    placeholder="@channelhandle"
                  />
                  <input
                    className={`${inputClass} w-full`}
                    value={youtubeChannelId}
                    onChange={(event) => setYoutubeChannelId(event.target.value)}
                    placeholder="YouTube channel ID (optional)"
                  />
                  <Button
                    variant="secondary"
                    onClick={addChannel}
                    disabled={saving || !channelName || !channelHandle}
                  >
                    Save manual channel
                  </Button>
                </div>
              </div>
            </div>
            {selectedChannels.length > 0 && (
              <div className="mt-6">
                <p className="text-xs font-bold uppercase tracking-wide text-[var(--muted)]">
                  Attached channels
                </p>
                <div className="mt-2 space-y-2">
                  {selectedChannels.map((channel) => (
                    <div
                      key={channel.id}
                      className="flex items-center gap-3 rounded-xl bg-[var(--surface)] p-4"
                    >
                      <span
                        className={`size-2 rounded-full ${channel.connected ? "bg-emerald-500" : "bg-amber-500"}`}
                      />
                      <span className="flex-1 text-sm font-semibold">
                        {channel.name}{" "}
                        <span className="font-normal text-[var(--muted)]">{channel.handle}</span>
                      </span>
                      <Badge tone={channel.connected ? "positive" : "warning"}>
                        {channel.connected ? "Connected" : "OAuth pending"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {step === 2 && selectedBrand && (
          <div className="max-w-3xl">
            <h2 className="text-xl font-bold">Add competitors</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              Competitors use public channel data only. You can skip this step and return later.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_1.4fr_auto]">
              <input
                className={inputClass}
                value={competitorName}
                onChange={(event) => setCompetitorName(event.target.value)}
                placeholder="Competitor name"
              />
              <input
                className={inputClass}
                value={competitorUrl}
                onChange={(event) => setCompetitorUrl(event.target.value)}
                placeholder="https://youtube.com/@channel"
              />
              <Button
                onClick={addCompetitor}
                disabled={saving || !competitorName || !competitorUrl}
              >
                <Plus size={16} /> Add
              </Button>
            </div>
            {selectedCompetitors.length > 0 && (
              <div className="mt-6 space-y-2">
                {selectedCompetitors.map((item) => (
                  <div
                    key={String(item.id)}
                    className="rounded-xl border border-[var(--border)] p-4"
                  >
                    <p className="text-sm font-semibold">{String(item.name)}</p>
                    <p className="mt-1 text-xs text-[var(--muted)]">{String(item.channelUrl)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {step === 3 && selectedBrand && (
          <div className="max-w-3xl">
            <h2 className="text-xl font-bold">Configure reporting</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              Save real recipient and format defaults. No report is sent or scheduled automatically.
            </p>
            <div className="mt-6 space-y-4">
              <label className="block text-sm font-semibold">
                Recipients
                <input
                  className={`${inputClass} mt-2 w-full`}
                  value={recipients}
                  onChange={(event) => setRecipients(event.target.value)}
                  placeholder="client@example.com, team@example.com"
                />
              </label>
              <label className="block text-sm font-semibold">
                Default frequency
                <select
                  className={`${inputClass} mt-2 w-full`}
                  value={frequency}
                  onChange={(event) => setFrequency(event.target.value)}
                >
                  <option>Weekly</option>
                  <option>Monthly</option>
                  <option>Custom</option>
                </select>
              </label>
              <div>
                <p className="text-sm font-semibold">Formats</p>
                <div className="mt-2 flex gap-2">
                  {["Excel", "PDF"].map((format) => (
                    <button
                      key={format}
                      onClick={() =>
                        setFormats((current) =>
                          current.includes(format)
                            ? current.filter((item) => item !== format)
                            : [...current, format],
                        )
                      }
                      className={`rounded-xl border px-4 py-2 text-sm font-semibold ${formats.includes(format) ? "border-violet-300 bg-[var(--accent-soft)] text-[var(--accent)]" : "border-[var(--border)]"}`}
                    >
                      {formats.includes(format) && "✓ "}
                      {format}
                    </button>
                  ))}
                </div>
              </div>
              <Button onClick={saveReporting} disabled={saving || formats.length === 0}>
                {saving ? "Saving..." : "Save reporting defaults"}
              </Button>
            </div>
          </div>
        )}

        {step === 4 && selectedBrand && (
          <div className="max-w-3xl">
            <ShieldCheck className="text-[var(--accent)]" size={30} />
            <h2 className="mt-4 text-xl font-bold">Configure recommended alerts</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              Recommended rules cover a 15% views decline, 10 days without an upload, and scheduled
              report failure. They evaluate only after real data exists.
            </p>
            <label className="mt-6 flex items-start gap-3 rounded-2xl border border-[var(--border)] p-5">
              <input
                type="checkbox"
                checked={alertsEnabled}
                onChange={(event) => setAlertsEnabled(event.target.checked)}
                className="mt-1 size-4 accent-violet-600"
              />
              <span>
                <span className="block text-sm font-semibold">
                  Create the three recommended rules
                </span>
                <span className="mt-1 block text-xs leading-5 text-[var(--muted)]">
                  You can edit or disable them from Alerts later.
                </span>
              </span>
            </label>
            <Button className="mt-6" onClick={finish} disabled={saving}>
              <Check size={16} /> {saving ? "Finishing..." : "Finish setup"}
            </Button>
          </div>
        )}
      </Card>

      <div className="flex items-center justify-between">
        <Button
          variant="secondary"
          disabled={step === 0}
          onClick={() => setStep((value) => Math.max(0, value - 1))}
        >
          <ArrowLeft size={16} /> Back
        </Button>
        {step > 0 && step < 4 && (
          <Button variant="ghost" onClick={() => setStep((value) => Math.min(4, value + 1))}>
            Skip for now <ArrowRight size={16} />
          </Button>
        )}
      </div>
    </div>
  );
}
