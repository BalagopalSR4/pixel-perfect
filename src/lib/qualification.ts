export type CriterionStatus = "Met" | "Not met" | "Insufficient evidence";
export type Verdict = "Eligible" | "Likely Ineligible" | "Needs Review";

/** All four met is Eligible. Any miss is Likely Ineligible. A gap with no miss stays in review. */
export function calculateVerdict(criteria: CriterionStatus[]): Verdict {
  if (criteria.length !== 4) return "Needs Review";
  if (criteria.some((criterion) => criterion === "Not met")) return "Likely Ineligible";
  if (criteria.every((criterion) => criterion === "Met")) return "Eligible";
  return "Needs Review";
}

/** Eligible wages count. Every other verdict contributes nothing. */
export function qualifiedWages(verdict: Verdict, amount: number): number {
  return verdict === "Eligible" ? amount : 0;
}

/** Project-row wage. A miss is excluded, and unresolved evidence stays pending. */
export function projectWageLabel(verdict: Verdict, amount: number): string {
  if (verdict === "Likely Ineligible") return "Excluded";
  if (verdict !== "Eligible") return "Pending";
  return `$${amount.toLocaleString("en-US")}`;
}

/** A narrative exists only after a person confirms Eligible and a draft exists. A Not met criterion never generates one. */
export function narrativeReady(confirmed: Verdict | undefined, draftReady: boolean, agent?: Verdict): boolean {
  if (agent === "Likely Ineligible") return false;
  return draftReady && confirmed === "Eligible";
}

/** True once this engagement has a draft or a final report. */
export function draftExists(status: string): boolean {
  return status === "Draft ready" || status === "Review required" || status === "Finalized";
}

export type OverviewAction = { label: string; to: "run" | "draft" | "report" | "trace" };

/** Header actions for an engagement. Draft and trace stay hidden until that output exists. */
export function overviewActions(status: string): OverviewAction[] {
  if (status === "Ready to run") return [{ label: "Start Agent", to: "run" }];
  if (status === "Running") return [{ label: "View run", to: "run" }];
  if (status === "Draft ready") return [{ label: "View draft", to: "draft" }, { label: "View trace", to: "trace" }];
  if (status === "Finalized") return [{ label: "View report", to: "report" }, { label: "View trace", to: "trace" }];
  if (status === "Review required") return [{ label: "View draft", to: "draft" }];
  return [];
}

/** Tick, cross, or question mark for one criterion in the slim comparison. */
export function criterionMark(status: CriterionStatus): "✓" | "✗" | "?" {
  if (status === "Met") return "✓";
  if (status === "Not met") return "✗";
  return "?";
}
