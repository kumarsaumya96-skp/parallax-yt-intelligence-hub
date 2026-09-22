import { NextResponse } from "next/server";
import { z } from "zod";
import { readRuntimeState, writeRuntimeState } from "@/lib/runtime-store";

const payloadSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("createShortExperiment"),
    brandId: z.string().min(1).max(80),
    title: z.string().trim().min(3).max(140),
    hypothesis: z.string().trim().min(8).max(500),
    variable: z.enum(["Hook", "Length", "Pacing", "CTA", "Caption", "Audio"]),
    variantA: z.string().trim().min(2).max(240),
    variantB: z.string().trim().min(2).max(240),
    primaryMetric: z.enum([
      "Engaged views",
      "Average percentage viewed",
      "Subscribers per 1K",
      "Engagement rate",
      "Chose to view",
    ]),
  }),
  z.object({
    action: z.literal("updateShortExperiment"),
    id: z.string().min(1).max(100),
    status: z.enum(["Planned", "Running", "Completed"]),
    winner: z.enum(["A", "B", "Inconclusive"]).optional(),
  }),
  z.object({
    action: z.literal("createCommunityPost"),
    brandId: z.string().min(1).max(80),
    format: z.enum(["Poll", "Image", "Text", "Quiz", "Video"]),
    objective: z.enum(["Conversation", "Research", "Traffic", "Awareness"]),
    copy: z.string().trim().min(3).max(1500),
    cta: z.string().trim().min(2).max(240),
    plannedAt: z.string().min(10).max(40),
    status: z.enum(["Draft", "Scheduled"]),
  }),
  z.object({
    action: z.literal("updateCommunityPost"),
    id: z.string().min(1).max(100),
    status: z.enum(["Draft", "Scheduled", "Published"]),
    likes: z.number().int().min(0).max(1_000_000_000).optional(),
    comments: z.number().int().min(0).max(1_000_000_000).optional(),
    votes: z.number().int().min(0).max(1_000_000_000).optional(),
    clicks: z.number().int().min(0).max(1_000_000_000).optional(),
  }),
]);

export async function POST(request: Request) {
  const result = payloadSchema.safeParse(await request.json());
  if (!result.success)
    return NextResponse.json(
      { error: "Invalid content-lab payload", issues: result.error.issues },
      { status: 400 },
    );
  const state = await readRuntimeState();
  const payload = result.data;

  if (payload.action === "createShortExperiment") {
    if (!state.brands.some((brand) => brand.id === payload.brandId))
      return NextResponse.json({ error: "Brand not found." }, { status: 404 });
    const experiment = {
      id: crypto.randomUUID(),
      brandId: payload.brandId,
      title: payload.title,
      hypothesis: payload.hypothesis,
      variable: payload.variable,
      variantA: payload.variantA,
      variantB: payload.variantB,
      primaryMetric: payload.primaryMetric,
      status: "Planned" as const,
      createdAt: new Date().toISOString(),
      source: "manual" as const,
    };
    state.shortExperiments.push(experiment);
    await writeRuntimeState(state);
    return NextResponse.json({ ok: true, item: experiment }, { status: 201 });
  }

  if (payload.action === "updateShortExperiment") {
    const item = state.shortExperiments.find((experiment) => experiment.id === payload.id);
    if (!item) return NextResponse.json({ error: "Experiment not found." }, { status: 404 });
    item.status = payload.status;
    item.winner = payload.status === "Completed" ? (payload.winner ?? "Inconclusive") : undefined;
    await writeRuntimeState(state);
    return NextResponse.json({ ok: true, item });
  }

  if (payload.action === "createCommunityPost") {
    if (!state.brands.some((brand) => brand.id === payload.brandId))
      return NextResponse.json({ error: "Brand not found." }, { status: 404 });
    const post = {
      id: crypto.randomUUID(),
      brandId: payload.brandId,
      format: payload.format,
      objective: payload.objective,
      copy: payload.copy,
      cta: payload.cta,
      plannedAt: payload.plannedAt,
      status: payload.status,
      createdAt: new Date().toISOString(),
      source: "manual" as const,
    };
    state.communityPosts.push(post);
    await writeRuntimeState(state);
    return NextResponse.json({ ok: true, item: post }, { status: 201 });
  }

  const item = state.communityPosts.find((post) => post.id === payload.id);
  if (!item) return NextResponse.json({ error: "Post not found." }, { status: 404 });
  item.status = payload.status;
  for (const metric of ["likes", "comments", "votes", "clicks"] as const) {
    if (payload[metric] !== undefined) item[metric] = payload[metric];
  }
  await writeRuntimeState(state);
  return NextResponse.json({ ok: true, item });
}
