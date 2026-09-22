"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  BarChart3,
  CheckCircle2,
  CircleAlert,
  CirclePlay,
  Radio,
  Search,
  Settings2,
  Upload,
} from "lucide-react";
import { useAppContext } from "@/components/app-context";
import { Badge, Button, Card, EmptyState, SectionHeader, inputClass } from "@/components/ui";

type Tab = "data" | "analytics" | "upload" | "live";
type JsonRecord = Record<string, unknown>;

interface StatusPayload {
  configured: boolean;
  connected: boolean;
  connection: {
    channelTitle: string;
    channelId: string;
    scopes: string[];
    connectedAt: string;
    syncErrors: string[];
  } | null;
  services: { id: string; name: string; capability: string }[];
  missingScopes: string[];
  probes?: { name: string; ready: boolean; detail: string; reason?: string }[];
}

interface AnalyticsPayload {
  preset: string;
  startDate: string;
  endDate: string;
  report: { columnHeaders?: { name: string }[]; rows?: unknown[][] };
}

const textareaClass =
  "min-h-24 w-full rounded-xl border border-[var(--border-strong)] bg-white px-3 py-2 text-sm text-[var(--ink)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-violet-100";
const tabs: { id: Tab; label: string; icon: typeof Search }[] = [
  { id: "data", label: "Data & publishing", icon: Search },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "upload", label: "Video upload", icon: Upload },
  { id: "live", label: "Live control", icon: Radio },
];

async function apiJson(url: string, init?: RequestInit) {
  const response = await fetch(url, { cache: "no-store", ...init });
  const payload = (await response.json().catch(() => ({}))) as JsonRecord;
  if (!response.ok)
    throw new Error(String(payload.error ?? "YouTube request failed (" + response.status + ")"));
  return payload;
}

function itemsFrom(payload: JsonRecord | null) {
  return Array.isArray(payload?.items) ? (payload.items as JsonRecord[]) : [];
}

function nested(record: JsonRecord, key: string) {
  const value = record[key];
  return value && typeof value === "object" ? (value as JsonRecord) : {};
}

function toDateTimeLocal(value: unknown) {
  const date = new Date(String(value ?? ""));
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function ResultPanel({ title, payload }: { title: string; payload: JsonRecord | null }) {
  if (!payload) return null;
  return (
    <div className="mt-4 rounded-xl bg-slate-950 p-4 text-slate-100">
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-violet-300">{title}</p>
      <pre className="max-h-72 overflow-auto whitespace-pre-wrap text-xs leading-5">
        {JSON.stringify(payload, null, 2)}
      </pre>
    </div>
  );
}

function DataConsole({ brandId, connected }: { brandId: string; connected: boolean }) {
  const [query, setQuery] = useState("");
  const [searchType, setSearchType] = useState("video");
  const [searchResults, setSearchResults] = useState<JsonRecord | null>(null);
  const [playlistTitle, setPlaylistTitle] = useState("");
  const [playlistDescription, setPlaylistDescription] = useState("");
  const [playlistPrivacy, setPlaylistPrivacy] = useState("private");
  const [playlists, setPlaylists] = useState<JsonRecord | null>(null);
  const [playlistId, setPlaylistId] = useState("");
  const [playlistVideoId, setPlaylistVideoId] = useState("");
  const [lookupVideoId, setLookupVideoId] = useState("");
  const [lookupResult, setLookupResult] = useState<JsonRecord | null>(null);
  const [channelDescription, setChannelDescription] = useState("");
  const [channelKeywords, setChannelKeywords] = useState("");
  const [channelCountry, setChannelCountry] = useState("");
  const [channelLanguage, setChannelLanguage] = useState("");
  const [channelLoaded, setChannelLoaded] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");

  async function run(label: string, operation: () => Promise<void>) {
    setBusy(label);
    setMessage("");
    try {
      await operation();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "YouTube request failed");
    } finally {
      setBusy("");
    }
  }

  async function loadPlaylists() {
    const payload = await apiJson(
      "/api/youtube/data?action=playlists&brandId=" + encodeURIComponent(brandId),
    );
    setPlaylists(payload);
    const firstId = itemsFrom(payload)[0]?.id;
    if (typeof firstId === "string" && !playlistId) setPlaylistId(firstId);
  }

  async function loadChannel() {
    const payload = await apiJson(
      "/api/youtube/data?action=channel&brandId=" + encodeURIComponent(brandId),
    );
    const channel = itemsFrom(payload)[0];
    if (!channel) throw new Error("No managed YouTube channel was found.");
    const settings = nested(nested(channel, "brandingSettings"), "channel");
    setChannelDescription(String(settings.description ?? ""));
    setChannelKeywords(String(settings.keywords ?? ""));
    setChannelCountry(String(settings.country ?? ""));
    setChannelLanguage(String(settings.defaultLanguage ?? ""));
    setChannelLoaded(true);
    setMessage("Current channel settings loaded.");
  }

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <Card className="p-5">
        <SectionHeader
          title="Search YouTube"
          description="Find videos, channels or playlists using the connected account."
        />
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <input
            className={inputClass + " flex-1"}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search topics, channels or videos"
          />
          <select
            className={inputClass}
            value={searchType}
            onChange={(event) => setSearchType(event.target.value)}
          >
            <option value="video">Videos</option>
            <option value="channel">Channels</option>
            <option value="playlist">Playlists</option>
          </select>
          <Button
            disabled={!connected || query.trim().length < 2 || busy === "search"}
            onClick={() =>
              run("search", async () =>
                setSearchResults(
                  await apiJson(
                    "/api/youtube/data?action=search&brandId=" +
                      encodeURIComponent(brandId) +
                      "&type=" +
                      searchType +
                      "&q=" +
                      encodeURIComponent(query),
                  ),
                ),
              )
            }
          >
            <Search size={15} /> Search
          </Button>
        </div>
        <div className="mt-4 space-y-2">
          {itemsFrom(searchResults).map((item, index) => {
            const snippet = nested(item, "snippet");
            const id = nested(item, "id");
            return (
              <div
                key={String(id.videoId ?? id.channelId ?? id.playlistId ?? index)}
                className="rounded-xl border border-[var(--border)] p-4"
              >
                <p className="text-sm font-semibold">
                  {String(snippet.title ?? "Untitled result")}
                </p>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  {String(snippet.channelTitle ?? id.kind ?? "YouTube")}
                </p>
              </div>
            );
          })}
        </div>
        {searchResults && itemsFrom(searchResults).length === 0 && (
          <p className="mt-4 text-sm text-[var(--muted)]">No matching results.</p>
        )}
      </Card>

      <Card className="p-5">
        <SectionHeader
          title="Playlists"
          description="Create playlists and add a video by its YouTube video ID."
          action={
            <Button
              variant="secondary"
              disabled={!connected || busy === "playlists"}
              onClick={() => run("playlists", loadPlaylists)}
            >
              Refresh list
            </Button>
          }
        />
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <input
            className={inputClass}
            value={playlistTitle}
            onChange={(event) => setPlaylistTitle(event.target.value)}
            placeholder="Playlist title"
          />
          <select
            className={inputClass}
            value={playlistPrivacy}
            onChange={(event) => setPlaylistPrivacy(event.target.value)}
          >
            <option value="private">Private</option>
            <option value="unlisted">Unlisted</option>
            <option value="public">Public</option>
          </select>
          <textarea
            className={textareaClass + " sm:col-span-2"}
            value={playlistDescription}
            onChange={(event) => setPlaylistDescription(event.target.value)}
            placeholder="Playlist description"
          />
          <Button
            disabled={!connected || !playlistTitle || busy === "create-playlist"}
            onClick={() =>
              run("create-playlist", async () => {
                await apiJson("/api/youtube/data", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    action: "createPlaylist",
                    brandId,
                    title: playlistTitle,
                    description: playlistDescription,
                    privacyStatus: playlistPrivacy,
                  }),
                });
                setPlaylistTitle("");
                setMessage("Playlist created on YouTube.");
                await loadPlaylists();
              })
            }
          >
            Create playlist
          </Button>
        </div>
        {itemsFrom(playlists).length > 0 && (
          <select
            aria-label="Playlist"
            className={inputClass + " mt-5 w-full"}
            value={playlistId}
            onChange={(event) => setPlaylistId(event.target.value)}
          >
            {itemsFrom(playlists).map((item) => (
              <option key={String(item.id)} value={String(item.id)}>
                {String(nested(item, "snippet").title ?? item.id)}
              </option>
            ))}
          </select>
        )}
        <div className="mt-3 flex gap-2">
          <input
            className={inputClass + " min-w-0 flex-1"}
            value={playlistVideoId}
            onChange={(event) => setPlaylistVideoId(event.target.value)}
            placeholder="Video ID to add"
          />
          <Button
            variant="secondary"
            disabled={!connected || !playlistId || !playlistVideoId || busy === "add-item"}
            onClick={() =>
              run("add-item", async () => {
                await apiJson("/api/youtube/data", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    action: "addPlaylistItem",
                    brandId,
                    playlistId,
                    videoId: playlistVideoId,
                  }),
                });
                setMessage("Video added to the selected playlist.");
              })
            }
          >
            Add video
          </Button>
        </div>
      </Card>

      <Card className="p-5">
        <SectionHeader
          title="Video and comment statistics"
          description="Retrieve public video statistics or top-level comment threads."
        />
        <div className="mt-5 flex gap-2">
          <input
            className={inputClass + " min-w-0 flex-1"}
            value={lookupVideoId}
            onChange={(event) => setLookupVideoId(event.target.value)}
            placeholder="YouTube video ID"
          />
          <Button
            variant="secondary"
            disabled={!connected || !lookupVideoId || Boolean(busy)}
            onClick={() =>
              run("video-stats", async () =>
                setLookupResult(
                  await apiJson(
                    "/api/youtube/data?action=videos&brandId=" +
                      encodeURIComponent(brandId) +
                      "&ids=" +
                      encodeURIComponent(lookupVideoId),
                  ),
                ),
              )
            }
          >
            Video stats
          </Button>
          <Button
            variant="secondary"
            disabled={!connected || !lookupVideoId || Boolean(busy)}
            onClick={() =>
              run("comments", async () =>
                setLookupResult(
                  await apiJson(
                    "/api/youtube/data?action=comments&brandId=" +
                      encodeURIComponent(brandId) +
                      "&videoId=" +
                      encodeURIComponent(lookupVideoId),
                  ),
                ),
              )
            }
          >
            Comments
          </Button>
        </div>
        <ResultPanel title="YouTube response" payload={lookupResult} />
      </Card>

      <Card className="p-5">
        <SectionHeader
          title="Channel settings"
          description="Update the editable branding fields on the managed channel."
          action={
            <Button
              variant="secondary"
              disabled={!connected || busy === "load-channel"}
              onClick={() => run("load-channel", loadChannel)}
            >
              Load current settings
            </Button>
          }
        />
        <div className="mt-5 space-y-3">
          <textarea
            className={textareaClass}
            value={channelDescription}
            onChange={(event) => setChannelDescription(event.target.value)}
            placeholder="Channel description"
          />
          <input
            className={inputClass + " w-full"}
            value={channelKeywords}
            onChange={(event) => setChannelKeywords(event.target.value)}
            placeholder="Keywords separated by spaces"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              className={inputClass}
              value={channelCountry}
              onChange={(event) => setChannelCountry(event.target.value)}
              placeholder="Country code, e.g. IN"
              maxLength={2}
            />
            <input
              className={inputClass}
              value={channelLanguage}
              onChange={(event) => setChannelLanguage(event.target.value)}
              placeholder="Default language, e.g. en"
            />
          </div>
          <Button
            disabled={!connected || !channelLoaded || busy === "channel"}
            onClick={() =>
              run("channel", async () => {
                await apiJson("/api/youtube/data", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    action: "updateChannel",
                    brandId,
                    description: channelDescription,
                    keywords: channelKeywords,
                    country: channelCountry || undefined,
                    defaultLanguage: channelLanguage || undefined,
                  }),
                });
                setMessage("Channel settings updated on YouTube.");
              })
            }
          >
            <Settings2 size={15} /> Save channel settings
          </Button>
          <p className="text-xs leading-5 text-[var(--muted)]">
            Load the current settings before editing. Empty description or keywords will clear that
            field; existing tracking and trailer settings are preserved.
          </p>
        </div>
      </Card>
      {message && (
        <div
          role="status"
          className="xl:col-span-2 rounded-xl border border-violet-100 bg-violet-50 p-4 text-sm font-semibold text-violet-800"
        >
          {message}
        </div>
      )}
    </div>
  );
}

function AnalyticsConsole({ brandId, connected }: { brandId: string; connected: boolean }) {
  const [preset, setPreset] = useState("overview");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [videoId, setVideoId] = useState("");
  const [result, setResult] = useState<AnalyticsPayload | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const headers = result?.report.columnHeaders ?? [];
  const rows = result?.report.rows ?? [];

  async function runReport() {
    setBusy(true);
    setMessage("");
    try {
      const params = new URLSearchParams({ brandId, preset });
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      if (videoId) params.set("videoId", videoId);
      setResult(
        (await apiJson(
          "/api/youtube/analytics?" + params.toString(),
        )) as unknown as AnalyticsPayload,
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Analytics request failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <SectionHeader
          title="YouTube Analytics reports"
          description="Query channel performance, video watch time, audience demographics, geography, traffic sources and devices."
        />
        <div className="mt-5 grid gap-3 md:grid-cols-5">
          <select
            className={inputClass}
            value={preset}
            onChange={(event) => setPreset(event.target.value)}
          >
            <option value="overview">Daily overview</option>
            <option value="videos">Top videos</option>
            <option value="demographics">Demographics</option>
            <option value="geography">Geography</option>
            <option value="traffic">Traffic sources</option>
            <option value="devices">Devices</option>
          </select>
          <input
            type="date"
            aria-label="Start date"
            className={inputClass}
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
          />
          <input
            type="date"
            aria-label="End date"
            className={inputClass}
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
          />
          <input
            className={inputClass}
            value={videoId}
            onChange={(event) => setVideoId(event.target.value)}
            placeholder="Video filter (optional)"
          />
          <Button disabled={!connected || busy} onClick={runReport}>
            <Activity size={15} /> {busy ? "Running…" : "Run report"}
          </Button>
        </div>
        {message && (
          <p role="alert" className="mt-4 text-sm font-semibold text-red-700">
            {message}
          </p>
        )}
      </Card>
      {result && (
        <Card className="overflow-hidden">
          <div className="border-b border-[var(--border)] p-5">
            <p className="font-semibold">
              {result.preset} · {result.startDate} to {result.endDate}
            </p>
            <p className="mt-1 text-xs text-[var(--muted)]">
              {rows.length} row{rows.length === 1 ? "" : "s"} returned by YouTube Analytics.
            </p>
          </div>
          {rows.length === 0 ? (
            <div className="p-5">
              <EmptyState
                title="No analytics rows returned"
                description="Try a wider date range or another report. Recent dates can remain incomplete while YouTube processes data."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-[var(--surface)] text-xs uppercase tracking-wide text-[var(--muted)]">
                  <tr>
                    {headers.map((header) => (
                      <th className="px-4 py-3" key={header.name}>
                        {header.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {rows.map((row, index) => (
                    <tr key={index}>
                      {row.map((cell, cellIndex) => (
                        <td className="px-4 py-3" key={headers[cellIndex]?.name ?? cellIndex}>
                          {typeof cell === "number" ? cell.toLocaleString() : String(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

function UploadConsole({ brandId, connected }: { brandId: string; connected: boolean }) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [privacy, setPrivacy] = useState("private");
  const [madeForKids, setMadeForKids] = useState(false);
  const [notifySubscribers, setNotifySubscribers] = useState(true);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function uploadVideo() {
    if (!file) return;
    setBusy(true);
    setMessage("");
    try {
      const params = new URLSearchParams({
        brandId,
        title,
        description,
        tags,
        privacyStatus: privacy,
        categoryId: "22",
        madeForKids: String(madeForKids),
        notifySubscribers: String(notifySubscribers),
      });
      const payload = await apiJson("/api/youtube/upload?" + params.toString(), {
        method: "POST",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      setMessage("Upload accepted by YouTube. Video ID: " + String(payload.id ?? "processing"));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Video upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1.4fr_0.8fr]">
      <Card className="p-5">
        <SectionHeader
          title="Upload a video"
          description="Uploads use YouTube's resumable protocol. Private is the safest default while you review metadata and processing."
        />
        <div className="mt-5 space-y-4">
          <label className="block text-sm font-semibold">
            Video file
            <input
              type="file"
              accept="video/*"
              className="mt-2 block w-full rounded-xl border border-dashed border-[var(--border-strong)] p-5 text-sm"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
          </label>
          <label className="block text-sm font-semibold">
            Title
            <input
              className={inputClass + " mt-2 w-full"}
              value={title}
              maxLength={100}
              onChange={(event) => setTitle(event.target.value)}
            />
          </label>
          <label className="block text-sm font-semibold">
            Description
            <textarea
              className={textareaClass + " mt-2"}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </label>
          <label className="block text-sm font-semibold">
            Tags
            <input
              className={inputClass + " mt-2 w-full"}
              value={tags}
              onChange={(event) => setTags(event.target.value)}
              placeholder="strategy, tutorial, marketing"
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-3">
            <select
              aria-label="Privacy"
              className={inputClass}
              value={privacy}
              onChange={(event) => setPrivacy(event.target.value)}
            >
              <option value="private">Private</option>
              <option value="unlisted">Unlisted</option>
              <option value="public">Public</option>
            </select>
            <label className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-3 text-sm">
              <input
                type="checkbox"
                checked={madeForKids}
                onChange={(event) => setMadeForKids(event.target.checked)}
              />{" "}
              Made for kids
            </label>
            <label className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-3 text-sm">
              <input
                type="checkbox"
                checked={notifySubscribers}
                onChange={(event) => setNotifySubscribers(event.target.checked)}
              />{" "}
              Notify subscribers
            </label>
          </div>
          <Button disabled={!connected || !file || !title.trim() || busy} onClick={uploadVideo}>
            <Upload size={15} /> {busy ? "Uploading…" : "Upload to YouTube"}
          </Button>
          {message && (
            <p
              role="status"
              className="rounded-xl bg-violet-50 p-4 text-sm font-semibold text-violet-800"
            >
              {message}
            </p>
          )}
        </div>
      </Card>
      <Card className="p-5">
        <Badge tone="warning">Before publishing</Badge>
        <ul className="mt-4 space-y-3 text-sm leading-6 text-[var(--muted)]">
          <li>Confirm you own or have permission to upload the video and audio.</li>
          <li>Verify the audience setting and privacy status.</li>
          <li>New, unaudited Google API projects may have API uploads restricted to private.</li>
          <li>Keep this browser tab open until the upload finishes.</li>
        </ul>
      </Card>
    </div>
  );
}

function LiveConsole({ brandId, connected }: { brandId: string; connected: boolean }) {
  const [broadcasts, setBroadcasts] = useState<JsonRecord | null>(null);
  const [streams, setStreams] = useState<JsonRecord | null>(null);
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastDescription, setBroadcastDescription] = useState("");
  const [scheduledStart, setScheduledStart] = useState("");
  const [privacy, setPrivacy] = useState("private");
  const [streamTitle, setStreamTitle] = useState("");
  const [broadcastId, setBroadcastId] = useState("");
  const [streamId, setStreamId] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");

  async function run(label: string, operation: () => Promise<void>) {
    setBusy(label);
    setMessage("");
    try {
      await operation();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Live API request failed");
    } finally {
      setBusy("");
    }
  }

  async function refresh() {
    const [nextBroadcasts, nextStreams] = await Promise.all([
      apiJson("/api/youtube/live?action=broadcasts&brandId=" + encodeURIComponent(brandId)),
      apiJson("/api/youtube/live?action=streams&brandId=" + encodeURIComponent(brandId)),
    ]);
    setBroadcasts(nextBroadcasts);
    setStreams(nextStreams);
  }

  function livePost(body: JsonRecord) {
    return apiJson("/api/youtube/live", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ brandId, ...body }),
    });
  }

  function chooseBroadcast(id: string) {
    setBroadcastId(id);
    const item = itemsFrom(broadcasts).find((candidate) => String(candidate.id) === id);
    if (!item) return;
    const snippet = nested(item, "snippet");
    setBroadcastTitle(String(snippet.title ?? ""));
    setBroadcastDescription(String(snippet.description ?? ""));
    setScheduledStart(toDateTimeLocal(snippet.scheduledStartTime));
  }

  function chooseStream(id: string) {
    setStreamId(id);
    const item = itemsFrom(streams).find((candidate) => String(candidate.id) === id);
    if (!item) return;
    const snippet = nested(item, "snippet");
    setStreamTitle(String(snippet.title ?? ""));
  }

  return (
    <div className="space-y-5">
      <Card className="flex flex-wrap items-center gap-4 p-5">
        <Radio className="text-[var(--accent)]" />
        <div className="flex-1">
          <p className="font-semibold">Live actions affect the connected YouTube channel</p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Create privately first, verify the encoder stream, bind it, then transition only when
            the stream is active.
          </p>
        </div>
        <Button
          variant="secondary"
          disabled={!connected || busy === "refresh"}
          onClick={() => run("refresh", refresh)}
        >
          Refresh live resources
        </Button>
      </Card>
      <div className="grid gap-5 xl:grid-cols-2">
        <Card className="p-5">
          <SectionHeader
            title="Schedule a broadcast"
            description="Creates a private, unlisted or public live event on YouTube."
          />
          <div className="mt-5 space-y-3">
            <input
              className={inputClass + " w-full"}
              value={broadcastTitle}
              onChange={(event) => setBroadcastTitle(event.target.value)}
              placeholder="Broadcast title"
            />
            <textarea
              className={textareaClass}
              value={broadcastDescription}
              onChange={(event) => setBroadcastDescription(event.target.value)}
              placeholder="Description"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="datetime-local"
                aria-label="Scheduled start"
                className={inputClass}
                value={scheduledStart}
                onChange={(event) => setScheduledStart(event.target.value)}
              />
              <select
                className={inputClass}
                value={privacy}
                onChange={(event) => setPrivacy(event.target.value)}
              >
                <option value="private">Private</option>
                <option value="unlisted">Unlisted</option>
                <option value="public">Public</option>
              </select>
            </div>
            <Button
              disabled={!connected || !broadcastTitle || !scheduledStart || busy === "broadcast"}
              onClick={() =>
                run("broadcast", async () => {
                  const created = await livePost({
                    action: "createBroadcast",
                    title: broadcastTitle,
                    description: broadcastDescription,
                    scheduledStartTime: new Date(scheduledStart).toISOString(),
                    privacyStatus: privacy,
                    latencyPreference: "low",
                    enableDvr: true,
                    recordFromStart: true,
                    enableAutoStart: false,
                    enableAutoStop: false,
                  });
                  setBroadcastId(String(created.id ?? ""));
                  setMessage("Broadcast scheduled on YouTube.");
                  await refresh();
                })
              }
            >
              Create broadcast
            </Button>
          </div>
        </Card>
        <Card className="p-5">
          <SectionHeader
            title="Create an encoder stream"
            description="Creates a reusable 1080p/30fps RTMP stream and returns its ingestion details."
          />
          <div className="mt-5 space-y-3">
            <input
              className={inputClass + " w-full"}
              value={streamTitle}
              onChange={(event) => setStreamTitle(event.target.value)}
              placeholder="Stream name"
            />
            <Button
              disabled={!connected || !streamTitle || busy === "stream"}
              onClick={() =>
                run("stream", async () => {
                  const created = await livePost({
                    action: "createStream",
                    title: streamTitle,
                    description: "",
                    ingestionType: "rtmp",
                    resolution: "1080p",
                    frameRate: "30fps",
                  });
                  setStreamId(String(created.id ?? ""));
                  setMessage("Reusable stream created. Keep its stream key private.");
                  await refresh();
                })
              }
            >
              Create stream
            </Button>
          </div>
          <ResultPanel title="Latest stream list" payload={streams} />
        </Card>
      </div>
      <Card className="p-5">
        <SectionHeader
          title="Bind and control"
          description="Enter or select a broadcast and stream ID. State transitions require confirmation."
        />
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <select
            className={inputClass}
            aria-label="Broadcast"
            value={broadcastId}
            onChange={(event) => chooseBroadcast(event.target.value)}
          >
            <option value="">Broadcast ID</option>
            {itemsFrom(broadcasts).map((item) => (
              <option value={String(item.id)} key={String(item.id)}>
                {String(nested(item, "snippet").title ?? item.id)}
              </option>
            ))}
          </select>
          <select
            className={inputClass}
            aria-label="Stream"
            value={streamId}
            onChange={(event) => chooseStream(event.target.value)}
          >
            <option value="">Stream ID</option>
            {itemsFrom(streams).map((item) => (
              <option value={String(item.id)} key={String(item.id)}>
                {String(nested(item, "snippet").title ?? item.id)}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            variant="secondary"
            disabled={
              !connected || !broadcastId || !broadcastTitle || !scheduledStart || Boolean(busy)
            }
            onClick={() =>
              run("update-broadcast", async () => {
                await livePost({
                  action: "updateBroadcast",
                  broadcastId,
                  title: broadcastTitle,
                  description: broadcastDescription,
                  scheduledStartTime: new Date(scheduledStart).toISOString(),
                });
                setMessage("Broadcast details updated.");
                await refresh();
              })
            }
          >
            Update broadcast
          </Button>
          <Button
            variant="secondary"
            disabled={!connected || !streamId || !streamTitle || Boolean(busy)}
            onClick={() =>
              run("update-stream", async () => {
                await livePost({
                  action: "updateStream",
                  streamId,
                  title: streamTitle,
                  description: "",
                });
                setMessage("Stream name updated.");
                await refresh();
              })
            }
          >
            Update stream
          </Button>
          <Button
            variant="secondary"
            disabled={!connected || !broadcastId || !streamId || Boolean(busy)}
            onClick={() =>
              run("bind", async () => {
                await livePost({ action: "bind", broadcastId, streamId });
                setMessage("Broadcast bound to the selected stream.");
                await refresh();
              })
            }
          >
            Bind stream
          </Button>
          {(["testing", "live", "complete"] as const).map((status) => (
            <Button
              key={status}
              variant={status === "live" ? "primary" : "secondary"}
              disabled={!connected || !broadcastId || Boolean(busy)}
              onClick={() => {
                if (window.confirm("Transition this YouTube broadcast to " + status + "?"))
                  void run("transition", async () => {
                    await livePost({ action: "transition", broadcastId, broadcastStatus: status });
                    setMessage("Broadcast transitioned to " + status + ".");
                    await refresh();
                  });
              }}
            >
              {status === "testing" ? "Start test" : status === "live" ? "Go live" : "Complete"}
            </Button>
          ))}
          <Button
            variant="secondary"
            disabled={!connected || !broadcastId || Boolean(busy)}
            onClick={() => {
              if (window.confirm("Insert a 30-second ad cuepoint into the active broadcast?"))
                void run("cue", async () => {
                  await livePost({ action: "cuepoint", broadcastId, durationSecs: 30 });
                  setMessage("Cuepoint inserted.");
                });
            }}
          >
            Insert 30s cue
          </Button>
        </div>
        {message && (
          <p
            role="status"
            className="mt-4 rounded-xl bg-violet-50 p-4 text-sm font-semibold text-violet-800"
          >
            {message}
          </p>
        )}
      </Card>
    </div>
  );
}

export default function YouTubeOperationsPage() {
  const { brandId, brands } = useAppContext();
  const brand = brands.find((item) => item.id === brandId);
  const [tab, setTab] = useState<Tab>("data");
  const [status, setStatus] = useState<StatusPayload | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [checking, setChecking] = useState(false);

  const loadStatus = useCallback(
    async (probe = false) => {
      if (!brandId) return;
      setChecking(probe);
      setStatusMessage("");
      try {
        setStatus(
          (await apiJson(
            "/api/youtube/status?brandId=" +
              encodeURIComponent(brandId) +
              (probe ? "&probe=true" : ""),
          )) as unknown as StatusPayload,
        );
      } catch (error) {
        setStatusMessage(
          error instanceof Error ? error.message : "Could not check the YouTube connection",
        );
      } finally {
        setChecking(false);
      }
    },
    [brandId],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => void loadStatus(false), 0);
    return () => window.clearTimeout(timer);
  }, [loadStatus]);
  const connected = Boolean(status?.connected);
  const apiReady = useMemo(
    () => status?.probes?.filter((item) => item.ready).length ?? 0,
    [status],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Badge
            tone={connected ? (status?.missingScopes.length ? "warning" : "positive") : "warning"}
          >
            {connected ? (
              <>
                <CheckCircle2 size={12} /> {status?.connection?.channelTitle || "YouTube connected"}
              </>
            ) : (
              <>
                <CircleAlert size={12} /> Connection required
              </>
            )}
          </Badge>
          <h1 className="page-title mt-4">YouTube API operations</h1>
          <p className="page-subtitle">
            Search, analyze, publish and manage {brand?.name ?? "the selected brand"} through
            authenticated YouTube APIs.
          </p>
        </div>
        <div className="flex gap-2">
          {status?.configured && brandId && (
            <Link
              href={"/api/auth/youtube/start?brandId=" + brandId}
              className="inline-flex h-10 items-center justify-center rounded-xl bg-[var(--accent)] px-4 text-sm font-semibold text-white"
            >
              {connected ? "Re-authorize APIs" : "Connect YouTube"}
            </Link>
          )}
          <Button
            variant="secondary"
            disabled={!connected || checking}
            onClick={() => void loadStatus(true)}
          >
            <Activity size={15} /> {checking ? "Testing…" : "Test APIs"}
          </Button>
        </div>
      </div>

      {statusMessage && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">
          {statusMessage}
        </div>
      )}
      {!status?.configured && (
        <Card className="border-amber-200 bg-amber-50 p-5">
          <p className="font-semibold text-amber-900">
            Google OAuth credentials are not configured
          </p>
          <p className="mt-2 text-sm leading-6 text-amber-800">
            Enable the APIs in Google Cloud, create a Web application OAuth client and add the
            credentials to <code>.env.local</code>. The setup guide is in Data &amp; Integrations.
          </p>
          <Link
            href="/data-integrations"
            className="mt-4 inline-flex text-sm font-semibold text-amber-900 underline"
          >
            Open setup guide
          </Link>
        </Card>
      )}
      {connected && status?.missingScopes.length ? (
        <Card className="border-amber-200 bg-amber-50 p-5">
          <p className="font-semibold text-amber-900">
            This connection still has read-only permissions
          </p>
          <p className="mt-2 text-sm leading-6 text-amber-800">
            Choose Re-authorize APIs and approve the requested permissions before using playlists,
            uploads, channel settings or live controls.
          </p>
        </Card>
      ) : null}

      <div className="grid gap-3 md:grid-cols-3">
        {(status?.services ?? []).map((service) => {
          const probe = status?.probes?.find((item) => item.name === service.name);
          return (
            <Card className="p-5" key={service.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="grid size-10 place-items-center rounded-xl bg-red-50 text-red-600">
                  <CirclePlay size={19} />
                </div>
                <Badge
                  tone={
                    probe
                      ? probe.ready
                        ? "positive"
                        : "critical"
                      : connected
                        ? "accent"
                        : "neutral"
                  }
                >
                  {probe
                    ? probe.ready
                      ? "Verified"
                      : "Check failed"
                    : connected
                      ? "Authorized"
                      : "Not connected"}
                </Badge>
              </div>
              <p className="mt-4 font-semibold">{service.name}</p>
              <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{service.capability}</p>
              {probe && <p className="mt-3 text-xs text-[var(--muted)]">{probe.detail}</p>}
            </Card>
          );
        })}
        <Card className="p-5">
          <div className="flex items-start justify-between">
            <div className="grid size-10 place-items-center rounded-xl bg-red-50 text-red-600">
              <Radio size={19} />
            </div>
            <Badge
              tone={
                status?.probes
                  ? apiReady === 3
                    ? "positive"
                    : "warning"
                  : connected
                    ? "accent"
                    : "neutral"
              }
            >
              {status?.probes
                ? apiReady === 3
                  ? "Verified"
                  : "Needs attention"
                : "Data API feature"}
            </Badge>
          </div>
          <p className="mt-4 font-semibold">YouTube Live Streaming API</p>
          <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
            Broadcasts, reusable encoder streams, binding, lifecycle transitions and cuepoints.
          </p>
        </Card>
      </div>

      <div className="flex gap-1 overflow-x-auto rounded-2xl border border-[var(--border)] bg-white p-1">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={
              "flex h-11 shrink-0 items-center gap-2 rounded-xl px-4 text-sm font-semibold " +
              (tab === id
                ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                : "text-[var(--muted)] hover:bg-[var(--surface)]")
            }
          >
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      {tab === "data" && <DataConsole brandId={brandId} connected={connected} />}
      {tab === "analytics" && <AnalyticsConsole brandId={brandId} connected={connected} />}
      {tab === "upload" && <UploadConsole brandId={brandId} connected={connected} />}
      {tab === "live" && <LiveConsole brandId={brandId} connected={connected} />}
    </div>
  );
}
