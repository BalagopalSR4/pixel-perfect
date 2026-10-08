import { describe, expect, it } from "vitest";
import {
  calculateVerdict,
  criterionMark,
  draftExists,
  narrativeReady,
  overviewActions,
  projectWageLabel,
  qualifiedWages,
} from "@/lib/qualification";

describe("qualification rule", () => {
  it("marks all four met as Eligible and counts those wages", () => {
    const verdict = calculateVerdict(["Met", "Met", "Met", "Met"]);
    expect(verdict).toBe("Eligible");
    expect(qualifiedWages(verdict, 70300)).toBe(70300);
    expect(projectWageLabel(verdict, 70300)).toBe("$70,300");
  });

  it("marks any miss as Likely Ineligible and excludes wages", () => {
    const verdict = calculateVerdict(["Met", "Not met", "Not met", "Insufficient evidence"]);
    expect(verdict).toBe("Likely Ineligible");
    expect(qualifiedWages(verdict, 31200)).toBe(0);
    expect(projectWageLabel(verdict, 31200)).toBe("Excluded");
  });

  it("keeps a gap with no miss in review and leaves wages pending", () => {
    const verdict = calculateVerdict(["Met", "Met", "Insufficient evidence", "Insufficient evidence"]);
    expect(verdict).toBe("Needs Review");
    expect(qualifiedWages(verdict, 18400)).toBe(0);
    expect(projectWageLabel(verdict, 18400)).toBe("Pending");
    expect(projectWageLabel("Eligible", 18400)).toBe("$18,400");
  });

  it("writes a narrative only after an Eligible confirmation and a draft", () => {
    expect(narrativeReady(undefined, true)).toBe(false);
    expect(narrativeReady("Eligible", false)).toBe(false);
    expect(narrativeReady("Likely Ineligible", true)).toBe(false);
    expect(narrativeReady("Needs Review", true)).toBe(false);
    expect(narrativeReady("Eligible", true)).toBe(true);
    expect(narrativeReady("Eligible", true, "Likely Ineligible")).toBe(false);
  });

  it("shows draft and trace only for the statuses that have them", () => {
    expect(overviewActions("Ready to run").map((action) => action.label)).toEqual(["Start Agent"]);
    expect(overviewActions("Running").map((action) => action.label)).toEqual(["View run"]);
    expect(overviewActions("Draft ready").map((action) => action.label)).toEqual(["View draft", "View trace"]);
    expect(overviewActions("Finalized").map((action) => action.label)).toEqual(["View report", "View trace"]);
    expect(overviewActions("Needs attention")).toEqual([]);
    expect(draftExists("Ready to run")).toBe(false);
    expect(draftExists("Draft ready")).toBe(true);
  });

  it("compares criteria with a tick, a cross, and a question mark", () => {
    expect(criterionMark("Met")).toBe("✓");
    expect(criterionMark("Not met")).toBe("✗");
    expect(criterionMark("Insufficient evidence")).toBe("?");
  });
});
