import { promises as fs } from "node:fs";
import path from "node:path";
import type {
  AiVisibilityRun,
  AlertEvent,
  Brand,
  Channel,
  CommunityPost,
  Competitor,
  DailyMetric,
  Opportunity,
  ShortExperiment,
  Video,
} from "@/lib/types";

export interface RuntimeState {
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
  alertRules: Record<string, unknown>[];
  deliveryLogs: Record<string, unknown>[];
  youtubeConnections: Record<string, unknown>[];
  aiVisibilityRuns: AiVisibilityRun[];
}

const initialState: RuntimeState = {
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
  alertRules: [],
  deliveryLogs: [],
  youtubeConnections: [],
  aiVisibilityRuns: [],
};

const statePath = path.join(process.cwd(), "data", "runtime", "state.json");

export async function readRuntimeState(): Promise<RuntimeState> {
  try {
    const stored = JSON.parse(await fs.readFile(statePath, "utf8")) as Partial<RuntimeState>;
    return {
      ...structuredClone(initialState),
      ...stored,
      brands: Array.isArray(stored.brands) ? stored.brands : [],
      channels: Array.isArray(stored.channels) ? stored.channels : [],
      dailyMetrics: Array.isArray(stored.dailyMetrics) ? stored.dailyMetrics : [],
      videos: Array.isArray(stored.videos) ? stored.videos : [],
      competitors: Array.isArray(stored.competitors) ? stored.competitors : [],
      opportunities: Array.isArray(stored.opportunities) ? stored.opportunities : [],
      alertEvents: Array.isArray(stored.alertEvents) ? stored.alertEvents : [],
      shortExperiments: Array.isArray(stored.shortExperiments) ? stored.shortExperiments : [],
      communityPosts: Array.isArray(stored.communityPosts) ? stored.communityPosts : [],
      aiVisibilityRuns: Array.isArray(stored.aiVisibilityRuns) ? stored.aiVisibilityRuns : [],
    };
  } catch {
    return structuredClone(initialState);
  }
}

export async function writeRuntimeState(state: RuntimeState) {
  await fs.mkdir(path.dirname(statePath), { recursive: true });
  const temporaryPath = `${statePath}.tmp`;
  await fs.writeFile(temporaryPath, JSON.stringify(state, null, 2), "utf8");
  await fs.rename(temporaryPath, statePath);
}

export async function appendRuntimeItem<K extends keyof RuntimeState>(
  collection: K,
  item: RuntimeState[K][number],
) {
  const state = await readRuntimeState();
  const items = state[collection] as unknown[];
  items.push(item);
  await writeRuntimeState(state);
  return item;
}
