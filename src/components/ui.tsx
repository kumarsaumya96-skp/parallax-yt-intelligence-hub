import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-2xl border border-[var(--border)] bg-white", className)} {...props} />;
}

export function Button({
  className,
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger" }) {
  return (
    <button
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" && "bg-[var(--accent)] text-white hover:bg-[var(--accent-strong)]",
        variant === "secondary" && "border border-[var(--border-strong)] bg-white text-[var(--ink)] hover:bg-[var(--surface)]",
        variant === "ghost" && "text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--ink)]",
        variant === "danger" && "bg-[var(--critical-soft)] text-[var(--critical)] hover:bg-red-100",
        className,
      )}
      {...props}
    />
  );
}

export function Badge({ children, tone = "neutral", className }: { children: ReactNode; tone?: "neutral" | "positive" | "warning" | "critical" | "accent"; className?: string }) {
  const tones = {
    neutral: "bg-slate-100 text-slate-600",
    positive: "bg-emerald-50 text-emerald-700",
    warning: "bg-amber-50 text-amber-700",
    critical: "bg-red-50 text-red-700",
    accent: "bg-violet-50 text-violet-700",
  };
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold", tones[tone], className)}>{children}</span>;
}

export function SectionHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="mb-1 text-xs font-bold uppercase tracking-[0.18em] text-[var(--accent)]">{eyebrow}</p>}
        <h2 className="text-xl font-bold tracking-tight text-[var(--ink)]">{title}</h2>
        {description && <p className="mt-1 max-w-3xl text-sm leading-6 text-[var(--muted)]">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function MetricCard({ label, value, change, note, icon }: { label: string; value: string; change?: number; note?: string; icon?: ReactNode }) {
  const positive = (change ?? 0) >= 0;
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between text-sm text-[var(--muted)]">
        <span>{label}</span>
        {icon}
      </div>
      <div className="mt-4 flex items-end justify-between gap-3">
        <p className="text-2xl font-bold tracking-tight text-[var(--ink)]">{value}</p>
        {change !== undefined && (
          <span className={cn("inline-flex items-center gap-0.5 text-xs font-semibold", positive ? "text-emerald-700" : "text-red-700")}>
            {positive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            {Math.abs(change).toFixed(1)}%
          </span>
        )}
      </div>
      {note && <p className="mt-2 text-xs text-[var(--muted)]">{note}</p>}
    </Card>
  );
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <Card className="flex min-h-48 flex-col items-center justify-center p-8 text-center">
      <p className="font-semibold text-[var(--ink)]">{title}</p>
      <p className="mt-2 max-w-md text-sm text-[var(--muted)]">{description}</p>
    </Card>
  );
}

export const inputClass = "h-10 rounded-xl border border-[var(--border-strong)] bg-white px-3 text-sm text-[var(--ink)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-violet-100";
