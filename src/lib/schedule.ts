import { addDays, addMonths, addWeeks } from "date-fns";

export type ReportFrequency = "Weekly" | "Monthly" | "Custom";
export type RepeatUnit = "Days" | "Weeks" | "Months";

export function nextScheduleRun(
  from: Date,
  frequency: ReportFrequency,
  repeatEvery = 1,
  repeatUnit: RepeatUnit = "Months",
) {
  if (frequency === "Weekly") return addWeeks(from, 1);
  if (frequency === "Monthly") return addMonths(from, 1);

  const interval = Math.max(1, Math.floor(repeatEvery));
  if (repeatUnit === "Days") return addDays(from, interval);
  if (repeatUnit === "Weeks") return addWeeks(from, interval);
  return addMonths(from, interval);
}

export function frequencyLabel(
  frequency: ReportFrequency,
  repeatEvery = 1,
  repeatUnit: RepeatUnit = "Months",
) {
  if (frequency !== "Custom") return frequency;
  const unit = repeatEvery === 1 ? repeatUnit.slice(0, -1).toLowerCase() : repeatUnit.toLowerCase();
  return `Every ${repeatEvery} ${unit}`;
}
