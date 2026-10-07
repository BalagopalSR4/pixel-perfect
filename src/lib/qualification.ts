export type CriterionStatus = "Met" | "Not met" | "Insufficient evidence";
export type Verdict = "Eligible" | "Likely Ineligible" | "Needs Review";

export function calculateVerdict(criteria: CriterionStatus[]): Verdict {
  if (criteria.length !== 4) return "Needs Review";
  if (criteria.some((criterion) => criterion === "Not met")) return "Likely Ineligible";
  if (criteria.every((criterion) => criterion === "Met")) return "Eligible";
  return "Needs Review";
}

export function qualifiedWages(verdict: Verdict, amount: number): number {
  return verdict === "Eligible" ? amount : 0;
}