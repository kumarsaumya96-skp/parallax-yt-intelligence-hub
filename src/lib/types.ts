export type DateRangeKey =
  | "today"
  | "yesterday"
  | "7d"
  | "28d"
  | "this-month"
  | "last-month"
  | "quarter"
  | "year"
  | "365d"
  | "custom";
export type ComparisonKey = "previous" | "previous-month" | "previous-year" | "custom" | "none";
export type VideoFormat = "Long-form" | "Shorts" | "Live";

export interface CustomDateRange {
  startDate: string;
  endDate: string;
}

export interface Brand {
  id: string;
  name: string;
  industry: string;
  initials: string;
  accountManager: string;
  channelId: string;
  accent: string;
  source?: "manual" | "demo";
}

export interface Channel {
  id: string;
  brandId: string;
  name: string;
  handle: string;
  subscribers: number;
  connected: boolean;
  lastSync: string;
  youtubeChannelId?: string;
  source?: "manual" | "google-youtube" | "demo";
}

export interface DailyMetric {
  channelId: string;
  date: string;
  views: number;
  watchMinutes: number;
  subscribersGained: number;
  subscribersLost: number;
  avgViewDuration: number;
  likes: number;
  comments: number;
  shares: number;
}

export interface Video {
  id: string;
  brandId: string;
  channelId: string;
  title: string;
  publishedAt: string;
  format: VideoFormat;
  durationSeconds: number;
  views: number;
  watchMinutes: number;
  subscribers: number;
  engagementRate: number;
  trafficSource: string;
  searchShare: number;
  first7Views: number;
  typicalMedian: number;
  last14Views: number;
  previous14Views: number;
  tags: string[];
  thumbnailColor: string;
  engagedViews?: number;
  averageViewPercentage?: number;
  shownInFeed?: number;
  choseToViewRate?: number;
}

export interface ShortExperiment {
  id: string;
  brandId: string;
  title: string;
  hypothesis: string;
  variable: "Hook" | "Length" | "Pacing" | "CTA" | "Caption" | "Audio";
  variantA: string;
  variantB: string;
  primaryMetric:
    | "Engaged views"
    | "Average percentage viewed"
    | "Subscribers per 1K"
    | "Engagement rate"
    | "Chose to view";
  status: "Planned" | "Running" | "Completed";
  winner?: "A" | "B" | "Inconclusive";
  createdAt: string;
  source?: "manual" | "demo";
}

export interface CommunityPost {
  id: string;
  brandId: string;
  format: "Poll" | "Image" | "Text" | "Quiz" | "Video";
  objective: "Conversation" | "Research" | "Traffic" | "Awareness";
  copy: string;
  cta: string;
  plannedAt: string;
  status: "Draft" | "Scheduled" | "Published";
  likes?: number;
  comments?: number;
  votes?: number;
  clicks?: number;
  createdAt: string;
  source?: "manual" | "demo";
}

export interface Diagnostic {
  label:
    | "Breakout"
    | "Underperforming"
    | "Resurging"
    | "Evergreen"
    | "Strong Search"
    | "Subscriber Driver"
    | "Typical";
  score: number;
  rule: string;
  evidence: string[];
  sampleSufficient: boolean;
}

export interface OpportunitySignal {
  label: string;
  value: number | null;
  weight: number;
  evidence: string;
}

export interface Opportunity {
  id: string;
  brandId: string;
  title: string;
  type: "Search" | "Competitor" | "Content Gap" | "Resurging" | "High Performer" | "Seasonal";
  priority: "High" | "Medium" | "Low";
  format: VideoFormat;
  summary: string;
  concepts: string[];
  signals: OpportunitySignal[];
  score: number;
}

export interface Competitor {
  id: string;
  brandId: string;
  name: string;
  subscribers?: number;
  recentUploads?: number;
  medianViews?: number;
  shortsShare?: number;
  breakoutTitle?: string;
  channelUrl?: string;
  source?: "manual" | "demo";
  createdAt?: string;
}

export interface AlertEvent {
  id: string;
  brandId: string;
  severity: "critical" | "warning" | "info";
  title: string;
  detail: string;
  createdAt: string;
  resolved: boolean;
  source?: "live" | "demo";
}

export interface ReportTemplate {
  id: string;
  brandId: string;
  name: string;
  frequency: "Weekly" | "Monthly" | "Custom";
  repeatEvery?: number;
  repeatUnit?: "Days" | "Weeks" | "Months";
  formats: ("Excel" | "PDF")[];
  sections: string[];
  nextRun: string;
}

export type AiVisibilitySurface =
  "YouTube Search" | "Google AI Overview" | "OpenAI web search" | "Gemini grounded search";

export type AiVisibilityStatus = "cited" | "not-cited" | "preview" | "unavailable";

export interface AiVisibilityCitation {
  title: string;
  url: string;
  owned: boolean;
}

export interface AiVisibilitySurfaceResult {
  surface: AiVisibilitySurface;
  status: AiVisibilityStatus;
  detail: string;
  citations: AiVisibilityCitation[];
  rank?: number | null;
}

export interface AiVisibilityKeywordResult {
  keyword: string;
  intent: "How-to" | "Comparison" | "Question" | "Definition" | "Exploration";
  ownedCoverage: number;
  opportunityScore: number;
  surfaces: AiVisibilitySurfaceResult[];
}

export interface AiKeywordSuggestion {
  keyword: string;
  priority: "High" | "Medium" | "Low";
  reason: string;
  source: "Seed" | "Owned metadata" | "YouTube results" | "Google related search";
}

export interface AiContentSuggestion {
  title: string;
  format: VideoFormat;
  primaryKeyword: string;
  angle: string;
  llmReadiness: string[];
}

export interface AiVisibilityRun {
  id: string;
  brandId: string;
  createdAt: string;
  mode: "preview" | "mixed" | "live";
  country: string;
  language: string;
  providerStatus: Record<AiVisibilitySurface, boolean>;
  keywords: AiVisibilityKeywordResult[];
  keywordSuggestions: AiKeywordSuggestion[];
  contentSuggestions: AiContentSuggestion[];
}
