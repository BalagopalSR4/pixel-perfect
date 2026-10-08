import type { Verdict } from "@/lib/qualification";

export const editorIssues = ["Employee C unmapped", "Alternatives not cited", "Outcome unfinished"] as const;

const issueSections: Record<string, string[]> = {
  "Employee C unmapped": ["Employee C", "QRE", "Wage lines", "Project 03"],
  "Alternatives not cited": ["4-Part Test", "Project 01"],
  "Outcome unfinished": ["Case Study", "Project 01"],
};

/** Working verdict. A saved confirmation replaces the agent's verdict. */
export function workingVerdict(agent: Verdict, confirmed?: Verdict): Verdict {
  return confirmed ?? agent;
}

/** A draft project is included when its working verdict is Eligible. */
export function draftIncluded(agent: Verdict, confirmed?: Verdict): boolean {
  return workingVerdict(agent, confirmed) === "Eligible";
}

/** True while the working verdict is still Needs Review. */
export function awaitingDraftDecision(agent: Verdict, confirmed?: Verdict): boolean {
  return workingVerdict(agent, confirmed) === "Needs Review";
}

/** Qualified draft total. An included project adds its own amount. */
export function draftQualifiedTotal(projects: Array<{ agent: Verdict; confirmed?: Verdict; amount: number }>): number {
  return projects.reduce((total, project) => total + (draftIncluded(project.agent, project.confirmed) ? project.amount : 0), 0);
}

/** True when the ask names a figure the interview does not contain. */
export function refusesUnsupportedFigure(text: string): boolean {
  return /efficiency|30%|percent/i.test(text);
}

/** A section stays open while one of its issues is still open. */
export function canMarkSectionReviewed(section: string, openIssues: string[]): boolean {
  return !openIssues.some((issue) => issueSections[issue]?.includes(section));
}

/** Accept closes one issue. The unfinished outcome closes first, then the missing alternatives. */
export function issuesAfterAccept(openIssues: string[]): string[] {
  const order = ["Outcome unfinished", "Alternatives not cited", "Employee C unmapped"];
  const next = order.find((issue) => openIssues.includes(issue));
  if (!next) return openIssues.slice(1);
  return openIssues.filter((issue) => issue !== next);
}

/** Project scope lists that project. Report scope lists every included project. */
export function editorOutline(scope: "project" | "report", projectNumber: string, wageLines: string[], includedNumbers: string[]): string[] {
  if (scope === "project") return [`Project ${projectNumber}`, "4-Part Test", "Case Study", ...wageLines];
  return ["Executive Summary", ...includedNumbers.map((number) => `Project ${number}`), "QRE", "Agent Summary"];
}

/** DOM id for an outline row or an open issue. */
export function reviewAnchor(label: string): string {
  return `review-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
}

/** Project edit and full-report edit stay on different outlines. A query string still resolves. */
export function readEditorScope(path: string, search = ""): { scope: "project" | "report"; projectId: string } {
  const match = path.match(/\/editor\/project\/([^/]+)/);
  if (match?.[1]) return { scope: "project", projectId: decodeURIComponent(match[1]) };
  if (path.includes("/editor/report")) return { scope: "report", projectId: "" };
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  if (params.get("scope") === "project") return { scope: "project", projectId: params.get("project") || "thermal" };
  return { scope: "report", projectId: "" };
}
