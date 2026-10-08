import type { Verdict } from "@/lib/qualification";

/** Eight activities on the run screen. The agent budget is still 40 steps. */
export const runActivities = [
  "Read summary",
  "Parse transcript",
  "Qualify projects",
  "Checkpoint",
  "Write narratives",
  "Extract wages",
  "Map QRE",
  "Assemble draft",
] as const;

export const stepBudget = 40;

export type RunPhase = "idle" | "starting" | "checkpoint" | "finishing" | "running" | "complete";

export type RunSnapshot = {
  phase: RunPhase;
  /** Zero-based activity that is current. Ignored while idle or complete. */
  current: number;
  /** Activities already finished. Cancel keeps this count. */
  done: number;
};

export type TraceRow = {
  step: string;
  tool: string;
  input: string;
  reasoning: string;
  result: string;
};

export type RunEvent = "continue" | "paused" | "draft";

/** Tool versions recorded under the trace. */
export const generatedWith: Array<{ name: string; version: string }> = [
  { name: "transcript_parser", version: "v1.2" },
  { name: "qualification_evaluator", version: "v1.4" },
  { name: "narrative_writer", version: "v2.0" },
  { name: "Knowledge base", version: "v1.1" },
  { name: "Reasoning model", version: "pinned" },
];

/** Scripted audit for a finished run. Grouped steps stay on one row. */
export const traceScript: TraceRow[] = [
  { step: "1", tool: "transcript_parser", input: "Fathom summary", reasoning: "Build interview context", result: "High-level interview context built" },
  { step: "2", tool: "transcript_parser", input: "Full transcript", reasoning: "Identify every project", result: "3 projects identified" },
  { step: "3–5", tool: "qualification_evaluator", input: "Projects 01–03", reasoning: "Apply the 4-Part Test", result: "Eligible / Likely Ineligible / Needs Review" },
  { step: "6", tool: "request_human_input", input: "Checkpoint 1", reasoning: "Checkpoint enabled", result: "Decisions confirmed by J. Smith" },
  { step: "7–10", tool: "narrative_writer", input: "Project 01", reasoning: "Only qualifying projects", result: "4-Part Test and case study generated" },
  { step: "11", tool: "ocr_w2_extractor", input: "2025-wages.pdf", reasoning: "Scanned PDF", result: "Wage fields extracted" },
  { step: "12", tool: "wage_data_processor", input: "Wage data and projects", reasoning: "Map allocations", result: "QRE populated; one allocation unmatched" },
  { step: "13", tool: "narrative_writer", input: "Project 03 outcome", reasoning: "Complete an outcome absent from the source", result: "REFUSED. No supporting passage" },
  { step: "14–17", tool: "confidence_flagging", input: "Generated content", reasoning: "Check each section against the source", result: "items flagged Review needed" },
  { step: "18", tool: "document_assembler", input: "All sections", reasoning: "Assemble the report", result: "Word draft assembled" },
  { step: "19", tool: "Termination", input: "Successful completion", reasoning: "Agent summary produced", result: "Agent summary produced" },
];

/** Last agent step already written when this activity is the current one. */
const traceThroughActivity = [1, 2, 5, 6, 10, 11, 12, 18];

/** Last agent step kept after this many activities have finished. */
const traceAfterDone = [0, 1, 2, 5, 6, 10, 11, 12, 19];

/** Northstar is already running on the narrative step. Every other engagement is idle. */
export function seededRun(engagementId: string): RunSnapshot {
  if (engagementId === "northstar") return { phase: "running", current: 4, done: 4 };
  return { phase: "idle", current: 0, done: 0 };
}

/** Overview Start Agent. The screen then advances activities 1–3 and pauses on the checkpoint. */
export function beginRun(): RunSnapshot {
  return { phase: "starting", current: 0, done: 0 };
}

/** After every project is confirmed. The screen then completes activities 5–8. */
export function beginFinish(): RunSnapshot {
  return { phase: "finishing", current: 4, done: 4 };
}

/** Cancel. The engagement goes idle and finished activities stay. */
export function stoppedRun(snapshot: RunSnapshot): RunSnapshot {
  const done = snapshot.phase === "complete" ? 8 : snapshot.phase === "idle" ? snapshot.done : snapshot.current;
  return { phase: "idle", current: 0, done };
}

/** Moves a starting run to the checkpoint, or a finishing run to the draft. */
export function advanceRun(snapshot: RunSnapshot): { snapshot: RunSnapshot; event: RunEvent } {
  if (snapshot.phase === "starting") {
    if (snapshot.current >= 2) return { snapshot: { phase: "checkpoint", current: 3, done: 3 }, event: "paused" };
    const current = snapshot.current + 1;
    return { snapshot: { phase: "starting", current, done: current }, event: "continue" };
  }
  if (snapshot.phase === "finishing") {
    if (snapshot.current >= 7) return { snapshot: { phase: "complete", current: 7, done: 8 }, event: "draft" };
    const current = snapshot.current + 1;
    return { snapshot: { phase: "finishing", current, done: current }, event: "continue" };
  }
  return { snapshot, event: "continue" };
}

/** Page title. It changes only when the run has finished. */
export function runTitle(snapshot: RunSnapshot): "Run" | "Run complete" {
  return snapshot.phase === "complete" ? "Run complete" : "Run";
}

/** Status badge on the run screen and the trace. */
export function runStatusLabel(snapshot: RunSnapshot): "Ready to run" | "Running" | "Paused" | "Run complete" {
  if (snapshot.phase === "complete") return "Run complete";
  if (snapshot.phase === "checkpoint") return "Paused";
  if (snapshot.phase === "idle") return "Ready to run";
  return "Running";
}

/** Counter against the 40-step budget. The checkpoint pause reads 4 / 40. */
export function stepCount(snapshot: RunSnapshot): string {
  if (snapshot.phase === "complete") return `8 / ${stepBudget}`;
  if (snapshot.phase === "idle") return `${snapshot.done} / ${stepBudget}`;
  return `${snapshot.current + 1} / ${stepBudget}`;
}

/** The only activity line. Empty when nothing is current. */
export function currentActivity(snapshot: RunSnapshot): string {
  if (snapshot.phase === "idle" || snapshot.phase === "complete") return "";
  return runActivities[snapshot.current] ?? "";
}

/** Done, current, or waiting for one of the eight rows. */
export function activityState(index: number, snapshot: RunSnapshot): "done" | "current" | "waiting" {
  if (snapshot.phase === "complete") return "done";
  if (snapshot.phase === "idle") return index < snapshot.done ? "done" : "waiting";
  if (index < snapshot.current) return "done";
  if (index === snapshot.current) return "current";
  return "waiting";
}

/** Step 5 writes a narrative only for Eligible projects. */
export function projectsForNarrative<T extends { verdict: Verdict }>(projects: T[]): T[] {
  return projects.filter((project) => project.verdict === "Eligible");
}

/** First agent step in a label such as "14–17". */
export function traceStepStart(step: string): number {
  const match = /^(\d+)/.exec(step);
  return match ? Number(match[1]) : Number.POSITIVE_INFINITY;
}

/** Highest agent step stored for this snapshot. A checkpoint pause stops at 6. */
export function traceLimit(snapshot: RunSnapshot): number {
  if (snapshot.phase === "complete") return 19;
  if (snapshot.phase === "idle") return traceAfterDone[snapshot.done] ?? 0;
  return traceThroughActivity[snapshot.current] ?? 0;
}

/** True once the checkpoint decision is in the trace. A pause is still waiting. */
function checkpointConfirmed(snapshot: RunSnapshot): boolean {
  if (snapshot.phase === "complete" || snapshot.phase === "finishing") return true;
  if (snapshot.phase === "running" && snapshot.current > 3) return true;
  return snapshot.phase === "idle" && snapshot.done >= 4;
}

/** Narrative row. An engagement with projects keeps only the Eligible ones. */
function narrativeTraceRow(projects: Array<{ number: string; verdict: Verdict }>): TraceRow {
  const base = traceScript.find((row) => row.step === "7–10");
  const fallback: TraceRow = { step: "7–10", tool: "narrative_writer", input: "No Eligible projects", reasoning: "Only qualifying projects", result: "Skipped. No Eligible projects" };
  if (!base) return fallback;
  if (!projects.length) return base;
  const eligible = projectsForNarrative(projects);
  if (!eligible.length) return { ...base, input: "No Eligible projects", result: "Skipped. No Eligible projects" };
  return { ...base, input: eligible.map((project) => `Project ${project.number}`).join(", ") };
}

/** Rows that belong to this run, plus one appended editor row after completion. */
export function visibleTraceRows(snapshot: RunSnapshot, projects: Array<{ number: string; verdict: Verdict }>, extra: TraceRow[] = []): TraceRow[] {
  const limit = traceLimit(snapshot);
  const rows = traceScript.map((row) => {
    if (row.step === "6") return { ...row, result: checkpointConfirmed(snapshot) ? row.result : "Paused" };
    if (row.step === "7–10") return narrativeTraceRow(projects);
    return row;
  }).filter((row) => traceStepStart(row.step) <= limit);
  if (snapshot.phase !== "complete") return rows;
  return [...rows, ...extra];
}
