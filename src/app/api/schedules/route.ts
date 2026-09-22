import { NextResponse } from "next/server";
import { z } from "zod";
import { appendRuntimeItem, readRuntimeState } from "@/lib/runtime-store";

const scheduleSchema = z
  .object({
    brandId: z.string().min(1).max(80),
    reportName: z.string().trim().min(1).max(160),
    recipients: z.array(z.email()).min(1).max(20),
    frequency: z.enum(["Weekly", "Monthly", "Custom"]),
    repeatEvery: z.number().int().min(1).max(365).optional(),
    repeatUnit: z.enum(["Days", "Weeks", "Months"]).optional(),
    nextRun: z.string().datetime({ offset: true }),
    formats: z
      .array(z.enum(["Excel", "PDF"]))
      .min(1)
      .max(2),
    sections: z.array(z.string().max(100)).max(20).default([]),
    selectedMetrics: z.array(z.string().max(100)).max(20).default([]),
    dateRange: z.enum([
      "today",
      "yesterday",
      "7d",
      "28d",
      "this-month",
      "last-month",
      "quarter",
      "year",
      "365d",
      "custom",
    ]),
    comparison: z.enum(["previous", "previous-month", "previous-year", "custom", "none"]),
    startDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    endDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    subject: z.string().trim().max(200).optional(),
    message: z.string().max(4000).optional(),
  })
  .superRefine((payload, context) => {
    if (payload.frequency === "Custom" && (!payload.repeatEvery || !payload.repeatUnit)) {
      context.addIssue({
        code: "custom",
        path: ["repeatEvery"],
        message: "Choose how often the custom schedule should repeat.",
      });
    }
    if (
      payload.dateRange === "custom" &&
      (!payload.startDate || !payload.endDate || payload.startDate > payload.endDate)
    ) {
      context.addIssue({
        code: "custom",
        path: ["startDate"],
        message: "A valid custom start and end date are required.",
      });
    }
  });

export async function POST(request: Request) {
  const result = scheduleSchema.safeParse(await request.json());
  if (!result.success) {
    return NextResponse.json(
      { error: "Check the schedule details.", issues: result.error.issues },
      { status: 400 },
    );
  }
  const payload = result.data;
  if (new Date(payload.nextRun).getTime() <= Date.now()) {
    return NextResponse.json(
      { error: "The first delivery time must be in the future." },
      { status: 400 },
    );
  }
  const state = await readRuntimeState();
  if (!state.brands.some((brand) => brand.id === payload.brandId)) {
    return NextResponse.json({ error: "Brand not found." }, { status: 404 });
  }
  const item = {
    id: crypto.randomUUID(),
    ...payload,
    active: true,
    createdAt: new Date().toISOString(),
  };
  await appendRuntimeItem("schedules", item);
  return NextResponse.json({ ok: true, item }, { status: 201 });
}
