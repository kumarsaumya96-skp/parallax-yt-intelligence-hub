export interface StructuredInsight {
  summary: string;
  what_changed: string[];
  likely_drivers: string[];
  positive_signals: string[];
  negative_signals: string[];
  opportunities: string[];
  recommended_actions: string[];
  confidence_notes: string[];
  evidence_refs: string[];
}

export interface LLMProvider {
  readonly name: string;
  generateInsight(input: Record<string, unknown>): Promise<StructuredInsight>;
}

export class MockLLMProvider implements LLMProvider {
  readonly name = "Deterministic mock";
  async generateInsight(input: Record<string, unknown>): Promise<StructuredInsight> {
    return {
      summary: "Performance changed versus the comparison period; the strongest supplied signals should guide the next action.",
      what_changed: [String(input.summary ?? "Selected metrics changed")],
      likely_drivers: ["Traffic-source mix likely contributed"],
      positive_signals: ["Search demand remained resilient"],
      negative_signals: ["Browse exposure softened"],
      opportunities: ["Extend the strongest evidence-backed topic"],
      recommended_actions: ["Restore a consistent publishing cadence"],
      confidence_notes: ["Correlation does not prove causality"],
      evidence_refs: ["structured_input:summary"],
    };
  }
}
