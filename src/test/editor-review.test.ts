import { describe, expect, it } from "vitest";
import {
  awaitingDraftDecision,
  canMarkSectionReviewed,
  draftIncluded,
  draftQualifiedTotal,
  editorOutline,
  issuesAfterAccept,
  readEditorScope,
  refusesUnsupportedFigure,
} from "@/lib/editor-review";

describe("draft and editor review", () => {
  const projects = [
    { agent: "Eligible" as const, amount: 70300 },
    { agent: "Likely Ineligible" as const, amount: 31200 },
    { agent: "Needs Review" as const, amount: 18400 },
  ];

  it("includes an Eligible draft before anyone confirms it", () => {
    expect(draftIncluded("Eligible")).toBe(true);
    expect(draftIncluded("Likely Ineligible")).toBe(false);
    expect(draftIncluded("Needs Review")).toBe(false);
    expect(draftIncluded("Needs Review", "Eligible")).toBe(true);
    expect(awaitingDraftDecision("Needs Review")).toBe(true);
    expect(awaitingDraftDecision("Needs Review", "Eligible")).toBe(false);
  });

  it("adds Project 03 wages only after that project is included", () => {
    expect(draftQualifiedTotal(projects)).toBe(70300);
    expect(draftQualifiedTotal(projects.map((project, index) => index === 2 ? { ...project, confirmed: "Eligible" as const } : project))).toBe(88700);
  });

  it("refuses a figure that is not in the source", () => {
    expect(refusesUnsupportedFigure("Show the efficiency gain")).toBe(true);
    expect(refusesUnsupportedFigure("Was it 30%")).toBe(true);
    expect(refusesUnsupportedFigure("What percent qualified")).toBe(true);
    expect(refusesUnsupportedFigure("What did the team test")).toBe(false);
  });

  it("blocks a section review while its issue is open and clears one issue on accept", () => {
    const open = ["Employee C unmapped", "Alternatives not cited", "Outcome unfinished"];
    expect(canMarkSectionReviewed("Case Study", open)).toBe(false);
    expect(canMarkSectionReviewed("Executive Summary", open)).toBe(true);
    const remaining = issuesAfterAccept(open);
    expect(remaining).toEqual(["Employee C unmapped", "Alternatives not cited"]);
    expect(canMarkSectionReviewed("Case Study", remaining)).toBe(true);
  });

  it("opens a project outline and a full-report outline", () => {
    expect(editorOutline("project", "01", ["Employee A", "Employee B"], ["01"])).toEqual(["Project 01", "4-Part Test", "Case Study", "Employee A", "Employee B"]);
    expect(editorOutline("report", "01", [], ["01", "03"])).toEqual(["Executive Summary", "Project 01", "Project 03", "QRE", "Agent Summary"]);
    expect(readEditorScope("/engagements/pioneer/editor/project/thermal")).toEqual({ scope: "project", projectId: "thermal" });
    expect(readEditorScope("/engagements/pioneer/editor/report")).toEqual({ scope: "report", projectId: "" });
    expect(readEditorScope("/engagements/pioneer/editor", "?scope=project&project=calibration")).toEqual({ scope: "project", projectId: "calibration" });
  });
});
