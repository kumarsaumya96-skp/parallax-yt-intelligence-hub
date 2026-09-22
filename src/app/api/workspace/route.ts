import { NextResponse } from "next/server";
import { z } from "zod";
import {
  alerts as allDemoAlerts,
  brands as allDemoBrands,
  channels as allDemoChannels,
  communityPosts as allDemoPosts,
  competitors as allDemoCompetitors,
  dailyMetrics as allDemoMetrics,
  opportunities as allDemoOpportunities,
  reportTemplates as allDemoTemplates,
  shortExperiments as allDemoShortExperiments,
  videos as allDemoVideos,
} from "@/lib/demo-data";
import { readRuntimeState, writeRuntimeState } from "@/lib/runtime-store";

const payloadSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("loadDemoWorkspace") }),
  z.object({
    action: z.literal("createBrand"),
    name: z.string().trim().min(2).max(120),
    industry: z.string().trim().min(2).max(80),
    accountManager: z.string().trim().min(2).max(100),
  }),
  z.object({
    action: z.literal("createChannel"),
    brandId: z.string().uuid(),
    name: z.string().trim().min(2).max(120),
    handle: z.string().trim().min(2).max(120),
    youtubeChannelId: z.string().trim().max(160).optional(),
  }),
  z.object({
    action: z.literal("createCompetitor"),
    brandId: z.string().uuid(),
    name: z.string().trim().min(2).max(120),
    channelUrl: z.url().max(500),
  }),
]);

const accents = ["#6d4aff", "#2563eb", "#0891b2", "#16a34a", "#db2777", "#ea580c"];

export async function GET() {
  const state = await readRuntimeState();
  return NextResponse.json({
    brands: state.brands,
    channels: state.channels,
    dailyMetrics: state.dailyMetrics,
    videos: state.videos,
    competitors: state.competitors,
    opportunities: state.opportunities,
    alertEvents: state.alertEvents,
    shortExperiments: state.shortExperiments,
    communityPosts: state.communityPosts,
    reportTemplates: state.reportTemplates,
    schedules: state.schedules,
    deliveryLogs: state.deliveryLogs,
    aiVisibilityRuns: state.aiVisibilityRuns,
    youtubeConnections: state.youtubeConnections.map((connection) =>
      Object.fromEntries(Object.entries(connection).filter(([key]) => key !== "tokenMaterial")),
    ),
    youtubeConfigured: Boolean(
      process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      process.env.TOKEN_ENCRYPTION_KEY,
    ),
  });
}

export async function POST(request: Request) {
  const result = payloadSchema.safeParse(await request.json());
  if (!result.success)
    return NextResponse.json(
      { error: "Invalid workspace payload", issues: result.error.issues },
      { status: 400 },
    );

  const state = await readRuntimeState();
  const payload = result.data;

  if (payload.action === "loadDemoWorkspace") {
    const demoBrands = allDemoBrands
      .slice(0, 5)
      .map((brand) => ({ ...brand, source: "demo" as const }));
    const brandIds = new Set(demoBrands.map((brand) => brand.id));
    const demoChannels = allDemoChannels
      .filter((channel) => brandIds.has(channel.brandId))
      .map((channel) => ({ ...channel, source: "demo" as const, lastSync: "Demo snapshot" }));
    state.brands = [...state.brands.filter((brand) => !brandIds.has(brand.id)), ...demoBrands];
    state.channels = [
      ...state.channels.filter((channel) => !brandIds.has(channel.brandId)),
      ...demoChannels,
    ];
    state.dailyMetrics = [
      ...state.dailyMetrics.filter(
        (metric) => !demoChannels.some((channel) => channel.id === metric.channelId),
      ),
      ...allDemoMetrics.filter((metric) =>
        demoChannels.some((channel) => channel.id === metric.channelId),
      ),
    ];
    state.videos = [
      ...state.videos.filter((video) => !brandIds.has(video.brandId)),
      ...allDemoVideos.filter((video) => brandIds.has(video.brandId)),
    ];
    state.competitors = [
      ...state.competitors.filter((item) => !brandIds.has(item.brandId)),
      ...allDemoCompetitors
        .filter((item) => brandIds.has(item.brandId))
        .map((item) => ({ ...item, source: "demo" as const })),
    ];
    state.opportunities = [
      ...state.opportunities.filter((item) => !brandIds.has(item.brandId)),
      ...allDemoOpportunities.filter((item) => brandIds.has(item.brandId)),
    ];
    state.alertEvents = [
      ...state.alertEvents.filter((item) => !brandIds.has(item.brandId)),
      ...allDemoAlerts
        .filter((item) => brandIds.has(item.brandId))
        .map((item) => ({ ...item, source: "demo" as const })),
    ];
    state.shortExperiments = [
      ...state.shortExperiments.filter((item) => !brandIds.has(item.brandId)),
      ...allDemoShortExperiments.filter((item) => brandIds.has(item.brandId)),
    ];
    state.communityPosts = [
      ...state.communityPosts.filter((item) => !brandIds.has(item.brandId)),
      ...allDemoPosts.filter((item) => brandIds.has(item.brandId)),
    ];
    state.reportTemplates = [
      ...state.reportTemplates.filter((item) => !brandIds.has(String(item.brandId))),
      ...allDemoTemplates.filter((item) => brandIds.has(item.brandId)).map((item) => ({ ...item })),
    ];
    await writeRuntimeState(state);
    return NextResponse.json({
      ok: true,
      brandsAdded: demoBrands.length,
      channelsAdded: demoChannels.length,
      opportunitiesAvailable: allDemoOpportunities.filter((item) => brandIds.has(item.brandId))
        .length,
    });
  }

  if (payload.action === "createBrand") {
    if (state.brands.some((brand) => brand.name.toLowerCase() === payload.name.toLowerCase())) {
      return NextResponse.json(
        { error: "A brand with this name already exists." },
        { status: 409 },
      );
    }
    const id = crypto.randomUUID();
    const initials =
      payload.name
        .split(/\s+/)
        .slice(0, 2)
        .map((word) => word[0]?.toUpperCase())
        .join("") || "BR";
    const brand = {
      id,
      name: payload.name,
      industry: payload.industry,
      initials,
      accountManager: payload.accountManager,
      channelId: "",
      accent: accents[state.brands.length % accents.length],
      source: "manual" as const,
    };
    state.brands.push(brand);
    await writeRuntimeState(state);
    return NextResponse.json({ ok: true, brand }, { status: 201 });
  }

  const brand = state.brands.find((item) => item.id === payload.brandId);
  if (!brand) return NextResponse.json({ error: "Brand not found." }, { status: 404 });

  if (payload.action === "createChannel") {
    const normalizedHandle = payload.handle.startsWith("@") ? payload.handle : `@${payload.handle}`;
    if (
      state.channels.some(
        (channel) =>
          channel.brandId === payload.brandId &&
          channel.handle.toLowerCase() === normalizedHandle.toLowerCase(),
      )
    ) {
      return NextResponse.json(
        { error: "This channel is already attached to the brand." },
        { status: 409 },
      );
    }
    const channel = {
      id: crypto.randomUUID(),
      brandId: payload.brandId,
      name: payload.name,
      handle: normalizedHandle,
      subscribers: 0,
      connected: false,
      lastSync: "Not synced",
      youtubeChannelId: payload.youtubeChannelId || undefined,
      source: "manual" as const,
    };
    state.channels.push(channel);
    if (!brand.channelId) brand.channelId = channel.id;
    await writeRuntimeState(state);
    return NextResponse.json({ ok: true, channel }, { status: 201 });
  }

  const competitor = {
    id: crypto.randomUUID(),
    brandId: payload.brandId,
    name: payload.name,
    channelUrl: payload.channelUrl,
    source: "manual" as const,
    createdAt: new Date().toISOString(),
  };
  state.competitors.push(competitor);
  await writeRuntimeState(state);
  return NextResponse.json({ ok: true, competitor }, { status: 201 });
}
