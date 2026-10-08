import { describe, expect, it } from "vitest";
import {
  activityState,
  advanceRun,
  beginFinish,
  beginRun,
  currentActivity,
  generatedWith,
  projectsForNarrative,
  runStatusLabel,
  runTitle,
  seededRun,
  stepCount,
  stoppedRun,
  traceScript,
  visibleTraceRows,
  type TraceRow,
} from "@/lib/run-trace";

const pioneer = [
  { number: "01", verdict: "Eligible" as const },
  { number: "02", verdict: "Likely Ineligible" as const },
  { number: "03", verdict: "Needs Review" as const },
];

describe("run screen", () => {
  it("animates the first three activities and pauses on the checkpoint", () => {
    let snapshot = beginRun();
    expect(runTitle(snapshot)).toBe("Run");
    expect(runStatusLabel(snapshot)).toBe("Running");
    expect(stepCount(snapshot)).toBe("1 / 40");
    expect(currentActivity(snapshot)).toBe("Read summary");

    snapshot = advanceRun(snapshot).snapshot;
    expect(currentActivity(snapshot)).toBe("Parse transcript");
    snapshot = advanceRun(snapshot).snapshot;
    expect(currentActivity(snapshot)).toBe("Qualify projects");

    const paused = advanceRun(snapshot);
    expect(paused.event).toBe("paused");
    expect(runStatusLabel(paused.snapshot)).toBe("Paused");
    expect(stepCount(paused.snapshot)).toBe("4 / 40");
    expect(currentActivity(paused.snapshot)).toBe("Checkpoint");
    expect(runActivities(paused.snapshot)).toEqual(["done", "done", "done", "current", "waiting", "waiting", "waiting", "waiting"]);
  });

  it("keeps finished activities when the run is cancelled", () => {
    const paused = { phase: "checkpoint" as const, current: 3, done: 3 };
    const stopped = stoppedRun(paused);
    expect(stopped).toEqual({ phase: "idle", current: 0, done: 3 });
    expect(runStatusLabel(stopped)).toBe("Ready to run");
    expect(stepCount(stopped)).toBe("3 / 40");
    expect(currentActivity(stopped)).toBe("");
    expect(activityState(0, stopped)).toBe("done");
    expect(activityState(2, stopped)).toBe("done");
    expect(activityState(3, stopped)).toBe("waiting");
  });

  it("finishes activities 5–8 and opens the draft", () => {
    let snapshot = beginFinish();
    expect(currentActivity(snapshot)).toBe("Write narratives");
    expect(stepCount(snapshot)).toBe("5 / 40");
    expect(runStatusLabel(snapshot)).toBe("Running");

    snapshot = advanceRun(snapshot).snapshot;
    expect(currentActivity(snapshot)).toBe("Extract wages");
    snapshot = advanceRun(snapshot).snapshot;
    expect(currentActivity(snapshot)).toBe("Map QRE");
    snapshot = advanceRun(snapshot).snapshot;
    expect(currentActivity(snapshot)).toBe("Assemble draft");

    const done = advanceRun(snapshot);
    expect(done.event).toBe("draft");
    expect(runTitle(done.snapshot)).toBe("Run complete");
    expect(runStatusLabel(done.snapshot)).toBe("Run complete");
    expect(stepCount(done.snapshot)).toBe("8 / 40");
    expect(currentActivity(done.snapshot)).toBe("");
    expect(activityState(7, done.snapshot)).toBe("done");
  });

  it("opens Northstar already on the narrative step", () => {
    const snapshot = seededRun("northstar");
    expect(runStatusLabel(snapshot)).toBe("Running");
    expect(currentActivity(snapshot)).toBe("Write narratives");
    expect(stepCount(snapshot)).toBe("5 / 40");
    expect(activityState(3, snapshot)).toBe("done");
    expect(activityState(4, snapshot)).toBe("current");
    expect(seededRun("pioneer").phase).toBe("idle");
  });
});

describe("trace", () => {
  it("shows steps 1–6 while the checkpoint is paused", () => {
    const rows = visibleTraceRows({ phase: "checkpoint", current: 3, done: 3 }, pioneer);
    expect(rows.map((row) => row.step)).toEqual(["1", "2", "3–5", "6"]);
    expect(rows[3]?.result).toBe("Paused");
    expect(runStatusLabel({ phase: "checkpoint", current: 3, done: 3 })).toBe("Paused");
  });

  it("matches the row count to a cancelled run", () => {
    const rows = visibleTraceRows(stoppedRun({ phase: "checkpoint", current: 3, done: 3 }), pioneer);
    expect(rows.map((row) => row.step)).toEqual(["1", "2", "3–5"]);
  });

  it("shows the finished table and can append one editor row", () => {
    const complete = { phase: "complete" as const, current: 7, done: 8 };
    const rows = visibleTraceRows(complete, pioneer);
    expect(rows).toHaveLength(traceScript.length);
    expect(rows.map((row) => [row.step, row.tool, row.input, row.reasoning, row.result])).toEqual(traceScript.map(cells));
    expect(rows.find((row) => row.step === "7–10")?.input).toBe("Project 01");

    const editorRow: TraceRow = { step: "20", tool: "editor", input: "Case study", reasoning: "Accept a supported edit", result: "Accepted" };
    expect(visibleTraceRows(complete, pioneer, [editorRow])).toHaveLength(rows.length + 1);
    expect(visibleTraceRows({ phase: "checkpoint", current: 3, done: 3 }, pioneer, [editorRow])).toHaveLength(4);
  });

  it("writes narratives only for Eligible projects", () => {
    expect(projectsForNarrative(pioneer).map((project) => project.number)).toEqual(["01"]);
    const both = visibleTraceRows(
      { phase: "complete", current: 7, done: 8 },
      [
        { number: "01", verdict: "Eligible" },
        { number: "02", verdict: "Likely Ineligible" },
        { number: "03", verdict: "Eligible" },
      ],
    );
    expect(both.find((row) => row.step === "7–10")?.input).toBe("Project 01, Project 03");
    const northstar = visibleTraceRows({ phase: "running", current: 4, done: 4 }, []);
    expect(northstar.map((row) => row.step)).toEqual(["1", "2", "3–5", "6", "7–10"]);
    expect(northstar.find((row) => row.step === "7–10")?.input).toBe("Project 01");
    const skipped = visibleTraceRows({ phase: "complete", current: 7, done: 8 }, [{ number: "02", verdict: "Likely Ineligible" }]);
    expect(skipped.find((row) => row.step === "7–10")?.result).toBe("Skipped. No Eligible projects");
  });

  it("lists the pinned generators", () => {
    expect(generatedWith.map((item) => `${item.name} ${item.version}`)).toEqual([
      "transcript_parser v1.2",
      "qualification_evaluator v1.4",
      "narrative_writer v2.0",
      "Knowledge base v1.1",
      "Reasoning model pinned",
    ]);
  });
});

/** Eight row states in order. */
function runActivities(snapshot: Parameters<typeof activityState>[1]) {
  return [0, 1, 2, 3, 4, 5, 6, 7].map((index) => activityState(index, snapshot));
}

/** Table cells in column order. */
function cells(row: TraceRow) {
  return [row.step, row.tool, row.input, row.reasoning, row.result];
}
