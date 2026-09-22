import { NextResponse } from "next/server";
import { z } from "zod";
import { appendRuntimeItem, readRuntimeState } from "@/lib/runtime-store";

const payloadSchema = z.object({
  collection: z.enum(["reportTemplates", "schedules", "alertRules", "deliveryLogs"]),
  item: z.record(z.string(), z.unknown()),
});

export async function GET() {
  return NextResponse.json(await readRuntimeState());
}

export async function POST(request: Request) {
  const result = payloadSchema.safeParse(await request.json());
  if (!result.success) return NextResponse.json({ error: "Invalid state payload", issues: result.error.issues }, { status: 400 });
  const item = { id: crypto.randomUUID(), createdAt: new Date().toISOString(), ...result.data.item };
  await appendRuntimeItem(result.data.collection, item);
  return NextResponse.json({ ok: true, item }, { status: 201 });
}
