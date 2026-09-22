"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  BarChart3,
  Bell,
  BookOpenCheck,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  FileBarChart,
  Lightbulb,
  LogOut,
  Menu,
  MessageSquareText,
  PlaySquare,
  Radio,
  RefreshCw,
  ScanSearch,
  Settings,
  SlidersHorizontal,
  Sparkles,
  Users,
} from "lucide-react";
import type { ComparisonKey, DateRangeKey } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AppProvider, useAppContext } from "@/components/app-context";
import { inputClass } from "@/components/ui";

const links = [
  ["Overview", "/overview", BarChart3],
  ["Channels", "/channels", PlaySquare],
  ["Videos", "/videos", BookOpenCheck],
  ["AI Visibility", "/ai-visibility", ScanSearch],
  ["Shorts & Posts", "/shorts-posts", MessageSquareText],
  ["Competitors", "/competitors", Users],
  ["Opportunities", "/opportunities", Lightbulb],
  ["YouTube APIs", "/youtube-operations", Radio],
  ["Reports", "/reports", FileBarChart],
  ["Alerts", "/alerts", Bell],
  ["Data & Integrations", "/data-integrations", SlidersHorizontal],
  ["Settings", "/settings", Settings],
] as const;

const dateOptions: [DateRangeKey, string][] = [
  ["today", "Today"],
  ["yesterday", "Yesterday"],
  ["7d", "Last 7 days"],
  ["28d", "Last 28 days"],
  ["this-month", "This month"],
  ["last-month", "Last month"],
  ["quarter", "This quarter"],
  ["year", "This year"],
  ["365d", "Last 365 days"],
  ["custom", "Custom"],
];
const comparisonOptions: [ComparisonKey, string][] = [
  ["previous", "Previous period"],
  ["previous-month", "Previous month"],
  ["previous-year", "Previous year"],
  ["custom", "Custom period"],
  ["none", "No comparison"],
];

function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const {
    brandId,
    setBrandId,
    dateRange,
    setDateRange,
    comparison,
    setComparison,
    customDateRange,
    setCustomDateRange,
    refresh,
    brands,
    channels,
    alertEvents,
    workspaceLoading,
    workspaceError,
  } = useAppContext();
  const activeAlerts = alertEvents.filter(
    (event) => event.brandId === brandId && !event.resolved,
  ).length;
  const setupRoute =
    pathname === "/onboarding" ||
    pathname === "/data-integrations" ||
    pathname === "/settings/brands";
  const selectedChannel = channels.find((channel) => channel.brandId === brandId);

  return (
    <div className="min-h-screen bg-[var(--canvas)] text-[var(--ink)]">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-[248px] flex-col border-r border-[var(--border)] bg-white transition-transform lg:translate-x-0",
          !mobileOpen && "-translate-x-full",
          collapsed && "lg:w-[84px]",
        )}
      >
        <div className="flex h-20 items-center gap-3 px-5">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--accent)] text-sm font-black text-white">
            PX
          </div>
          {!collapsed && (
            <div title="Parallax — YouTube Intelligence Hub">
              <p className="text-[13px] font-bold">Parallax</p>
              <p className="text-xs text-[var(--muted)]">YouTube Intelligence Hub</p>
            </div>
          )}
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-3" aria-label="Primary navigation">
          {links.map(([label, href, Icon]) => {
            const active =
              pathname === href || (href !== "/overview" && pathname.startsWith(`${href}/`));
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium text-[var(--muted)] transition hover:bg-[var(--surface)] hover:text-[var(--ink)]",
                  active && "bg-[var(--accent-soft)] text-[var(--accent-strong)]",
                )}
              >
                <Icon size={18} className="shrink-0" />
                {!collapsed && <span>{label}</span>}
                {!collapsed && label === "Alerts" && activeAlerts > 0 && (
                  <span className="ml-auto rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-bold text-red-700">
                    {activeAlerts}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-[var(--border)] p-3">
          <div
            className={cn(
              "rounded-xl bg-[var(--surface)] p-3",
              collapsed && "grid place-items-center p-2",
            )}
          >
            <Sparkles size={17} className="text-[var(--accent)]" />
            {!collapsed && (
              <>
                <p className="mt-2 text-xs font-semibold">Hybrid workspace</p>
                <p className="mt-1 text-[11px] leading-4 text-[var(--muted)]">
                  Add live accounts manually or load five clearly labeled demo brands.
                </p>
              </>
            )}
          </div>
          <button
            onClick={() => setCollapsed((value) => !value)}
            className="mt-2 hidden h-9 w-full items-center justify-center rounded-lg text-[var(--muted)] hover:bg-[var(--surface)] lg:flex"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}
          </button>
        </div>
      </aside>

      <div className={cn("transition-[padding] lg:pl-[248px]", collapsed && "lg:pl-[84px]")}>
        <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-white/95 backdrop-blur">
          <div className="flex min-h-20 flex-wrap items-center gap-3 px-4 py-3 lg:px-8">
            <button
              onClick={() => setMobileOpen(true)}
              className="grid size-10 place-items-center rounded-xl border border-[var(--border)] lg:hidden"
              aria-label="Open navigation"
            >
              <Menu size={19} />
            </button>
            <select
              aria-label="Current brand"
              value={brandId}
              onChange={(event) => setBrandId(event.target.value)}
              disabled={brands.length === 0}
              className={cn(inputClass, "min-w-44 font-semibold")}
            >
              {brands.length === 0 && <option value="">No brands yet</option>}
              {brands.map((brand) => (
                <option value={brand.id} key={brand.id}>
                  {brand.name}
                </option>
              ))}
            </select>
            <select
              aria-label="Date range"
              value={dateRange}
              onChange={(event) => setDateRange(event.target.value as DateRangeKey)}
              className={cn(inputClass, "min-w-36")}
            >
              {dateOptions.map(([value, label]) => (
                <option value={value} key={value}>
                  {label}
                </option>
              ))}
            </select>
            {dateRange === "custom" && (
              <div className="flex h-10 items-center gap-2 rounded-xl border border-violet-200 bg-violet-50/50 px-2">
                <CalendarDays size={16} className="shrink-0 text-[var(--accent)]" />
                <input
                  type="date"
                  aria-label="Custom range start date"
                  value={customDateRange.startDate}
                  max={customDateRange.endDate || undefined}
                  onChange={(event) =>
                    setCustomDateRange({
                      ...customDateRange,
                      startDate: event.target.value,
                    })
                  }
                  className="min-w-32 bg-transparent text-sm font-medium outline-none"
                />
                <span className="text-xs text-[var(--muted)]">to</span>
                <input
                  type="date"
                  aria-label="Custom range end date"
                  value={customDateRange.endDate}
                  min={customDateRange.startDate || undefined}
                  onChange={(event) =>
                    setCustomDateRange({
                      ...customDateRange,
                      endDate: event.target.value,
                    })
                  }
                  className="min-w-32 bg-transparent text-sm font-medium outline-none"
                />
              </div>
            )}
            <select
              aria-label="Comparison"
              value={comparison}
              onChange={(event) => setComparison(event.target.value as ComparisonKey)}
              className={cn(inputClass, "hidden min-w-40 sm:block")}
            >
              {comparisonOptions.map(([value, label]) => (
                <option value={value} key={value}>
                  {label}
                </option>
              ))}
            </select>
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={refresh}
                className="grid size-10 place-items-center rounded-xl border border-[var(--border)] text-[var(--muted)] hover:bg-[var(--surface)]"
                aria-label="Refresh data"
              >
                <RefreshCw size={17} />
              </button>
              <Link
                href="/alerts"
                className="relative grid size-10 place-items-center rounded-xl border border-[var(--border)] text-[var(--muted)] hover:bg-[var(--surface)]"
                aria-label={`${activeAlerts} active alerts`}
              >
                <Bell size={17} />
                {activeAlerts > 0 && (
                  <span className="absolute right-2 top-2 size-2 rounded-full bg-red-500 ring-2 ring-white" />
                )}
              </Link>
              <div className="relative">
                <button
                  className="grid size-10 place-items-center rounded-full bg-slate-900 text-xs font-bold text-white"
                  aria-label="User menu"
                  aria-expanded={userMenuOpen}
                  onClick={() => setUserMenuOpen((current) => !current)}
                >
                  PX
                </button>
                {userMenuOpen && (
                  <div
                    className="absolute right-0 top-12 w-56 rounded-2xl border border-[var(--border)] bg-white p-2 shadow-xl shadow-slate-200/70"
                    role="menu"
                  >
                    <div className="border-b border-[var(--border)] px-3 py-2">
                      <p className="text-sm font-semibold">Parallax workspace</p>
                      <p className="mt-1 text-xs text-[var(--muted)]">YouTube Intelligence Hub</p>
                    </div>
                    <form action="/api/auth/parallax/logout" method="post">
                      <button
                        className="mt-1 flex h-10 w-full items-center gap-2 rounded-xl px-3 text-sm font-semibold text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--ink)]"
                        type="submit"
                        role="menuitem"
                      >
                        <LogOut size={16} /> Sign out
                      </button>
                    </form>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1600px] p-4 lg:p-8">
          {workspaceLoading ? (
            <div className="grid min-h-80 place-items-center text-sm text-[var(--muted)]">
              Loading live workspace...
            </div>
          ) : workspaceError ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
              {workspaceError}
            </div>
          ) : brands.length === 0 && !setupRoute ? (
            <div className="grid min-h-[62vh] place-items-center">
              <div className="max-w-xl rounded-3xl border border-[var(--border)] bg-white p-8 text-center">
                <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)]">
                  <PlaySquare size={24} />
                </div>
                <h1 className="mt-5 text-2xl font-bold">Your workspace is empty</h1>
                <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                  Create a live brand and connect its channel, or load five fictional demo brands to
                  explore every feature immediately.
                </p>
                <Link
                  href="/onboarding"
                  className="mt-6 inline-flex h-10 items-center justify-center rounded-xl bg-[var(--accent)] px-4 text-sm font-semibold text-white"
                >
                  Set up workspace
                </Link>
              </div>
            </div>
          ) : brands.length > 0 &&
            !selectedChannel &&
            !setupRoute &&
            pathname !== "/overview" &&
            pathname !== "/channels" ? (
            <div className="grid min-h-[55vh] place-items-center">
              <div className="max-w-lg rounded-3xl border border-[var(--border)] bg-white p-8 text-center">
                <h1 className="text-xl font-bold">Add a channel to continue</h1>
                <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                  The selected brand has no channel. Complete channel setup before opening
                  analytics, diagnostics or reports.
                </p>
                <Link
                  href="/onboarding"
                  className="mt-6 inline-flex h-10 items-center justify-center rounded-xl bg-[var(--accent)] px-4 text-sm font-semibold text-white"
                >
                  Continue setup
                </Link>
              </div>
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/" || pathname === "/login") return children;

  return (
    <AppProvider>
      <Shell>{children}</Shell>
    </AppProvider>
  );
}
