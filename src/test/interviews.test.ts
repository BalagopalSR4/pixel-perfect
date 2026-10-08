import { describe, expect, it } from "vitest";
import {
  advanceCapture,
  captureAdvanceLabel,
  captureBadge,
  captureLog,
  captureStepMark,
  scheduleMissing,
  scheduledWhen,
} from "@/lib/meeting-capture";
import { connectorSummary, teamMembers, wageFigure, wagesRestricted } from "@/lib/workspace-access";

describe("meeting capture", () => {
  it("walks one screen from detected to complete", () => {
    expect(captureBadge("detected")).toBe("Detected");
    expect(captureAdvanceLabel("detected")).toBe("Meeting starts");
    expect(captureLog("detected").at(-1)?.label).toBe("Waiting for Zoom");
    expect(captureStepMark(0, "detected")).toBe("current");
    expect(captureStepMark(1, "detected")).toBe("waiting");

    const recording = advanceCapture("detected");
    expect(captureBadge(recording)).toBe("Recording");
    expect(captureAdvanceLabel(recording)).toBe("Meeting ends");
    expect(captureLog(recording).at(-1)?.label).toBe("Fathom recording");
    expect(captureStepMark(1, recording)).toBe("done");
    expect(captureStepMark(2, recording)).toBe("current");

    const retrieving = advanceCapture(recording);
    expect(captureBadge(retrieving)).toBe("Retrieving");
    expect(captureAdvanceLabel(retrieving)).toBe("Retrieval completes");
    expect(captureLog(retrieving).at(-1)?.label).toBe("Fetching transcript");

    const complete = advanceCapture(retrieving);
    expect(captureBadge(complete)).toBe("Complete");
    expect(captureAdvanceLabel(complete)).toBeNull();
    expect(captureLog(complete).every((row) => row.mark === "completed")).toBe(true);
    expect(captureStepMark(4, complete)).toBe("done");
  });

  it("stops a failed retrieval before the engagement exists", () => {
    expect(captureBadge("failed")).toBe("Transcript failed");
    expect(captureAdvanceLabel("failed")).toBeNull();
    expect(captureLog("failed")).toEqual([
      { label: "Summary", mark: "done" },
      { label: "Transcript", mark: "failed" },
    ]);
    expect(captureStepMark(3, "failed")).toBe("failed");
    expect(captureStepMark(4, "failed")).toBe("waiting");
  });

  it("requires client and tax year, and the clock only when the meeting is later", () => {
    expect(scheduleMissing({ client: "", taxYear: "", start: "Later", date: "", time: "" })).toEqual(["Client", "Tax year", "Date", "Time"]);
    expect(scheduleMissing({ client: "Acme", taxYear: "2025", start: "Start now", date: "", time: "" })).toEqual([]);
    expect(scheduledWhen("2026-09-24", "10:00", false)).toMatch(/Sep 24/);
    expect(scheduledWhen("2026-09-24", "10:00", true)).toBe("Now");
  });
});

describe("workspace access", () => {
  it("describes each person's connectors", () => {
    expect(teamMembers.map(connectorSummary)).toEqual([
      "Calendar, Zoom, and Fathom connected",
      "Fathom not connected",
      "Zoom not connected",
      "no connectors",
    ]);
  });

  it("hides wage figures R. Lee does not own and keeps the owner label out of that cell", () => {
    expect(wagesRestricted("J. Smith", true, "Engagement lead only")).toBe(true);
    expect(wagesRestricted("R. Lee", true, "Engagement lead only")).toBe(false);
    expect(wagesRestricted("J. Smith", true, "All team members")).toBe(false);
    expect(wagesRestricted("J. Smith", false, "Engagement lead only")).toBe(false);
    expect(wageFigure("$70,300", true)).toBe("Restricted");
    expect(wageFigure("$70,300", false)).toBe("$70,300");
  });
});
