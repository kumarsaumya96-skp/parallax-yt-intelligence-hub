"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type {
  AlertEvent,
  AiVisibilityRun,
  Brand,
  Channel,
  CommunityPost,
  ComparisonKey,
  Competitor,
  CustomDateRange,
  DailyMetric,
  DateRangeKey,
  Opportunity,
  ShortExperiment,
  Video,
} from "@/lib/types";

interface WorkspacePayload {
  brands: Brand[];
  channels: Channel[];
  dailyMetrics: DailyMetric[];
  videos: Video[];
  competitors: Competitor[];
  opportunities: Opportunity[];
  alertEvents: AlertEvent[];
  shortExperiments: ShortExperiment[];
  communityPosts: CommunityPost[];
  reportTemplates: Record<string, unknown>[];
  schedules: Record<string, unknown>[];
  deliveryLogs: Record<string, unknown>[];
  youtubeConnections: Record<string, unknown>[];
  youtubeConfigured: boolean;
  aiVisibilityRuns: AiVisibilityRun[];
}

interface AppContextValue {
  brandId: string;
  setBrandId: (id: string) => void;
  dateRange: DateRangeKey;
  setDateRange: (range: DateRangeKey) => void;
  customDateRange: CustomDateRange;
  setCustomDateRange: (range: CustomDateRange) => void;
  comparison: ComparisonKey;
  setComparison: (comparison: ComparisonKey) => void;
  refreshKey: number;
  refresh: () => void;
  reloadWorkspace: () => Promise<void>;
  brands: Brand[];
  channels: Channel[];
  dailyMetrics: DailyMetric[];
  videos: Video[];
  competitors: Competitor[];
  opportunities: Opportunity[];
  alertEvents: AlertEvent[];
  shortExperiments: ShortExperiment[];
  communityPosts: CommunityPost[];
  reportTemplates: Record<string, unknown>[];
  schedules: Record<string, unknown>[];
  deliveryLogs: Record<string, unknown>[];
  youtubeConnections: Record<string, unknown>[];
  youtubeConfigured: boolean;
  aiVisibilityRuns: AiVisibilityRun[];
  workspaceLoading: boolean;
  workspaceError: string;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [brandId, setBrandIdState] = useState("");
  const [dateRange, setDateRangeState] = useState<DateRangeKey>("28d");
  const [customDateRange, setCustomDateRangeState] = useState<CustomDateRange>({
    startDate: "",
    endDate: "",
  });
  const [comparison, setComparisonState] = useState<ComparisonKey>("previous");
  const [refreshKey, setRefreshKey] = useState(0);
  const [workspace, setWorkspace] = useState<WorkspacePayload>({
    brands: [],
    channels: [],
    dailyMetrics: [],
    videos: [],
    competitors: [],
    opportunities: [],
    alertEvents: [],
    shortExperiments: [],
    communityPosts: [],
    reportTemplates: [],
    schedules: [],
    deliveryLogs: [],
    youtubeConnections: [],
    youtubeConfigured: false,
    aiVisibilityRuns: [],
  });
  const [workspaceLoading, setWorkspaceLoading] = useState(true);
  const [workspaceError, setWorkspaceError] = useState("");

  const reloadWorkspace = useCallback(async () => {
    setWorkspaceLoading(true);
    setWorkspaceError("");
    try {
      const response = await fetch("/api/workspace", { cache: "no-store" });
      if (!response.ok) throw new Error(`Workspace load failed (${response.status})`);
      const payload = (await response.json()) as WorkspacePayload;
      setWorkspace(payload);
      setBrandIdState((current) => {
        const requested = new URLSearchParams(window.location.search).get("brand");
        if (requested && payload.brands.some((brand) => brand.id === requested)) return requested;
        if (payload.brands.some((brand) => brand.id === current)) return current;
        return payload.brands[0]?.id ?? "";
      });
    } catch (error) {
      setWorkspaceError(error instanceof Error ? error.message : "Workspace load failed");
    } finally {
      setWorkspaceLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void reloadWorkspace();
      const params = new URLSearchParams(window.location.search);
      const range = params.get("range") as DateRangeKey | null;
      const compare = params.get("compare") as ComparisonKey | null;
      const end = new Date();
      end.setDate(end.getDate() - 1);
      const start = new Date(end);
      start.setDate(start.getDate() - 27);
      const startDate = params.get("startDate") ?? start.toISOString().slice(0, 10);
      const endDate = params.get("endDate") ?? end.toISOString().slice(0, 10);
      if (range) setDateRangeState(range);
      if (compare) setComparisonState(compare);
      setCustomDateRangeState({ startDate, endDate });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [reloadWorkspace]);

  const updateUrl = useCallback(
    (values: {
      brand?: string;
      range?: DateRangeKey;
      compare?: ComparisonKey;
      startDate?: string;
      endDate?: string;
    }) => {
      const params = new URLSearchParams(window.location.search);
      if (values.brand) params.set("brand", values.brand);
      if (values.range) params.set("range", values.range);
      if (values.compare) params.set("compare", values.compare);
      if (values.startDate) params.set("startDate", values.startDate);
      if (values.endDate) params.set("endDate", values.endDate);
      window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);
    },
    [],
  );

  const setBrandId = useCallback(
    (id: string) => {
      setBrandIdState(id);
      if (id) updateUrl({ brand: id });
    },
    [updateUrl],
  );
  const setDateRange = useCallback(
    (range: DateRangeKey) => {
      setDateRangeState(range);
      if (range === "custom") {
        let selectedRange = customDateRange;
        if (!selectedRange.startDate || !selectedRange.endDate) {
          const end = new Date();
          end.setDate(end.getDate() - 1);
          const start = new Date(end);
          start.setDate(start.getDate() - 27);
          selectedRange = {
            startDate: start.toISOString().slice(0, 10),
            endDate: end.toISOString().slice(0, 10),
          };
          setCustomDateRangeState(selectedRange);
        }
        updateUrl({ range, ...selectedRange });
      } else {
        updateUrl({ range });
      }
    },
    [customDateRange, updateUrl],
  );
  const setCustomDateRange = useCallback(
    (range: CustomDateRange) => {
      setCustomDateRangeState(range);
      updateUrl(range);
    },
    [updateUrl],
  );
  const setComparison = useCallback(
    (value: ComparisonKey) => {
      setComparisonState(value);
      updateUrl({ compare: value });
    },
    [updateUrl],
  );

  const refresh = useCallback(() => {
    setRefreshKey((key) => key + 1);
    void reloadWorkspace();
  }, [reloadWorkspace]);
  const value = useMemo(
    () => ({
      brandId,
      setBrandId,
      dateRange,
      setDateRange,
      customDateRange,
      setCustomDateRange,
      comparison,
      setComparison,
      refreshKey,
      refresh,
      reloadWorkspace,
      ...workspace,
      workspaceLoading,
      workspaceError,
    }),
    [
      brandId,
      comparison,
      customDateRange,
      dateRange,
      refresh,
      refreshKey,
      reloadWorkspace,
      setBrandId,
      setComparison,
      setCustomDateRange,
      setDateRange,
      workspace,
      workspaceError,
      workspaceLoading,
    ],
  );
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const value = useContext(AppContext);
  if (!value) throw new Error("useAppContext must be used inside AppProvider");
  return value;
}
