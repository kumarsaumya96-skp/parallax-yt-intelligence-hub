export interface TrendSignal { topic: string; score: number; direction: "rising" | "stable" | "falling"; source: string; }
export interface TrendProvider { readonly name: string; explore(topic: string): Promise<TrendSignal[]>; }
export class MockTrendProvider implements TrendProvider {
  readonly name = "Mock trends";
  async explore(topic: string) { return [{ topic, score: 0.68, direction: "rising" as const, source: "synthetic-demo" }]; }
}
