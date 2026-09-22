export interface OwnedChannelAnalyticsRequest {
  channelId: string;
  startDate: string;
  endDate: string;
  metrics: string[];
  dimensions?: string[];
}

export interface YouTubeProvider {
  readonly name: string;
  getOwnedChannelMetadata(channelId: string): Promise<unknown>;
  getOwnedAnalytics(request: OwnedChannelAnalyticsRequest): Promise<unknown>;
  getVideos(channelId: string): Promise<unknown>;
  getSearchTerms(request: OwnedChannelAnalyticsRequest): Promise<unknown>;
  getTrafficSources(request: OwnedChannelAnalyticsRequest): Promise<unknown>;
  getAudience(request: OwnedChannelAnalyticsRequest): Promise<unknown>;
  getCompetitorMetadata(channelId: string): Promise<unknown>;
  getCompetitorVideos(channelId: string): Promise<unknown>;
  searchDiscovery(query: string): Promise<unknown>;
}

export class MockYouTubeProvider implements YouTubeProvider {
  readonly name = "Seeded demo";
  async getOwnedChannelMetadata(channelId: string) { return { channelId, provider: this.name, synthetic: true }; }
  async getOwnedAnalytics(request: OwnedChannelAnalyticsRequest) { return { request, rows: [], provider: this.name, synthetic: true }; }
  async getVideos(channelId: string) { return { channelId, rows: [], synthetic: true }; }
  async getSearchTerms(request: OwnedChannelAnalyticsRequest) { return { request, rows: [], synthetic: true }; }
  async getTrafficSources(request: OwnedChannelAnalyticsRequest) { return { request, rows: [], synthetic: true }; }
  async getAudience(request: OwnedChannelAnalyticsRequest) { return { request, rows: [], synthetic: true }; }
  async getCompetitorMetadata(channelId: string) { return { channelId, publicOnly: true, synthetic: true }; }
  async getCompetitorVideos(channelId: string) { return { channelId, publicOnly: true, rows: [], synthetic: true }; }
  async searchDiscovery(query: string) { return { query, cached: true, rows: [], synthetic: true }; }
}
