import { describe, expect, it } from "vitest";
import { pioneerProjects } from "@/lib/cssi-seed-data";
import {
  excludedWageLabel,
  finalReportAttribution,
  finalReportFigures,
  finalReportFileName,
  revisionCardState,
} from "@/lib/final-report";

describe("final report", () => {
  it("counts Project 03 when that project was confirmed", () => {
    expect(finalReportFigures(pioneerProjects, { calibration: { verdict: "Eligible" } })).toEqual({
      total: "$88,700",
      projects: "2 of 3",
      employees: "3 of 4",
      wageLines: "3 of 3",
      higherBecauseProject03: true,
    });
  });

  it("leaves Project 03 out when it was excluded", () => {
    expect(finalReportFigures(pioneerProjects, { calibration: { verdict: "Likely Ineligible" } })).toEqual({
      total: "$70,300",
      projects: "1 of 3",
      employees: "2 of 4",
      wageLines: "2 of 2",
      higherBecauseProject03: false,
    });
    expect(finalReportFigures(pioneerProjects, {})).toMatchObject({
      total: "$70,300",
      projects: "1 of 3",
      wageLines: "2 of 2",
      higherBecauseProject03: false,
    });
  });

  it("uses Pioneer’s file and Julie’s lock, and Cronus’s own owner and date", () => {
    expect(finalReportFileName("pioneer", "Pioneer Systems", "2024–2025")).toBe("Pioneer_Systems_2025_Final.pdf");
    expect(finalReportFileName("cronus", "Cronus Project", "2024")).toBe("Cronus_Project_2024_Final.pdf");
    expect(finalReportAttribution({ id: "pioneer", owner: "J. Smith", date: "Sep 21, 2026" })).toBe("Julie · Sep 25, 2026 · 10:35 AM");
    expect(finalReportAttribution({ id: "cronus", owner: "R. Lee", date: "Sep 18, 2026" })).toBe("R. Lee · Sep 18, 2026");
    expect(excludedWageLabel(31200)).toBe("$31,200");
  });

  it("does not let a reopen change an excluded project", () => {
    expect(revisionCardState(false, true)).toBe("Not included");
    expect(revisionCardState(true, true)).toBe("Being revised");
    expect(revisionCardState(true, false)).toBe("Unchanged");
  });
});
