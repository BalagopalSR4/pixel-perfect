import type { Verdict } from "@/lib/qualification";
import { draftIncluded } from "@/lib/editor-review";

type ReportProject = {
  id: string;
  number: string;
  verdict: Verdict;
  amount: number;
  lines: Array<{ employee: string }>;
};

export type FinalFigures = {
  total: string;
  projects: string;
  employees: string;
  wageLines: string;
  /** True when confirming Project 03 added wages that the draft did not include. */
  higherBecauseProject03: boolean;
};

/** Whole-dollar label used on the final report and an excluded project card. */
export function excludedWageLabel(amount: number): string {
  return `$${amount.toLocaleString("en-US")}`;
}

/** Counts only projects that are included. An excluded Project 03 stays out of every figure. */
export function finalReportFigures(
  projects: ReportProject[],
  confirmed: Record<string, { verdict?: Verdict } | undefined>,
): FinalFigures {
  const included = projects.filter((project) => draftIncluded(project.verdict, confirmed[project.id]?.verdict));
  const total = included.reduce((sum, project) => sum + project.amount, 0);
  const allEmployees = new Set(projects.flatMap((project) => project.lines.map((line) => line.employee)));
  const includedEmployees = new Set(included.flatMap((project) => project.lines.map((line) => line.employee)));
  const wageLines = included.reduce((sum, project) => sum + project.lines.length, 0);
  const project03 = projects.find((project) => project.number === "03");
  const project03Included = Boolean(project03 && draftIncluded(project03.verdict, confirmed[project03.id]?.verdict));
  return {
    total: excludedWageLabel(total),
    projects: `${included.length} of ${projects.length}`,
    employees: `${includedEmployees.size} of ${allEmployees.size}`,
    wageLines: `${wageLines} of ${wageLines}`,
    higherBecauseProject03: project03Included && project03?.verdict !== "Eligible",
  };
}

/** PDF name for the engagement file. Pioneer keeps the fixed final name. */
export function finalReportFileName(id: string, client: string, years: string): string {
  if (id === "pioneer") return "Pioneer_Systems_2025_Final.pdf";
  const slug = client.trim().replace(/[^A-Za-z0-9]+/g, "_").replace(/^_|_$/g, "");
  const year = years.match(/\d{4}/g)?.at(-1) ?? "Final";
  return `${slug}_${year}_Final.pdf`;
}

/** Gray attribution line. Pioneer is Julie’s lock; every other final uses its own owner and date. */
export function finalReportAttribution(engagement: { id: string; owner: string; date: string }): string {
  if (engagement.id === "pioneer") return "Julie · Sep 25, 2026 · 10:35 AM";
  return `${engagement.owner} · ${engagement.date}`;
}

/** True when the working verdict keeps the project in the final report. */
export function projectIncluded(agent: Verdict, confirmed?: Verdict): boolean {
  return draftIncluded(agent, confirmed);
}

/** Revision card. An excluded project stays excluded even when someone selected it. */
export function revisionCardState(included: boolean, inScope: boolean): "Being revised" | "Not included" | "Unchanged" {
  if (!included) return "Not included";
  if (inScope) return "Being revised";
  return "Unchanged";
}
