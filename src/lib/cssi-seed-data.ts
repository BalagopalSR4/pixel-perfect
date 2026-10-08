import type { CapturePhase } from "@/lib/meeting-capture";
import type { CriterionStatus, Verdict } from "@/lib/qualification";

export type Criterion = {
  name: string;
  status: CriterionStatus;
  quote: string;
  speaker: string;
  time: string;
};

export type WageLine = {
  employee: string;
  amount: number;
};

export type Project = {
  id: string;
  number: string;
  name: string;
  objective: string;
  verdict: Verdict;
  /** Qualified wages for this project once a person confirms Eligible. */
  amount: number;
  wages: string;
  /** Named wage lines for this project. An excluded project still lists the line it leaves out. */
  lines: WageLine[];
  criteria: Criterion[];
  note?: string;
};

export type FollowUp = {
  id: string;
  project: string;
  date: string;
  source: string;
  note: string;
  reanalysis?: boolean;
};

export type Engagement = {
  id: string;
  client: string;
  years: string;
  capture: string;
  status: string;
  stage: string;
  date: string;
  owner: string;
  projects: Project[];
};

export const pioneerProjects: Project[] = [
  {
    id: "thermal",
    number: "01",
    name: "Thermal Process Optimization",
    objective: "Improve production efficiency by redesigning thermal controls.",
    verdict: "Eligible",
    amount: 70300,
    wages: "$70,300",
    lines: [
      { employee: "Employee A", amount: 42500 },
      { employee: "Employee B", amount: 27800 },
    ],
    criteria: [
      { name: "Business Component", status: "Met", quote: "We had to redesign the thermal control loop completely. The one we had could not hold tolerance once we moved to the wider temperature band.", speaker: "B. Okafor", time: "00:14:22" },
      { name: "Elimination of Uncertainty", status: "Met", quote: "Honestly we did not know whether a passive approach would hold at that range. That was the whole question going in.", speaker: "B. Okafor", time: "00:19:05" },
      { name: "Process of Experimentation", status: "Met", quote: "We built three configurations, ran each one through a full drift cycle, measured the deviation, and only then picked.", speaker: "L. Hartmann", time: "00:31:47" },
      { name: "Technological in Nature", status: "Met", quote: "It was thermal modelling and CFD, then physical rigs to confirm what the model predicted.", speaker: "B. Okafor", time: "00:22:10" },
    ],
  },
  {
    id: "legacy",
    number: "02",
    name: "Legacy Reporting Migration",
    objective: "Replace an existing reporting workflow with a newer platform.",
    verdict: "Likely Ineligible",
    amount: 31200,
    wages: "Excluded",
    lines: [{ employee: "Employee D", amount: 31200 }],
    criteria: [
      { name: "Business Component", status: "Met", quote: "The workflow was moved to the new reporting platform.", speaker: "Project interview", time: "00:08:14" },
      { name: "Elimination of Uncertainty", status: "Not met", quote: "The platform and migration path were already established.", speaker: "Project interview", time: "00:11:32" },
      { name: "Process of Experimentation", status: "Not met", quote: "The team configured the standard migration path.", speaker: "Project interview", time: "00:13:09" },
      { name: "Technological in Nature", status: "Insufficient evidence", quote: "Technical approach requires further support.", speaker: "Project interview", time: "00:14:50" },
    ],
  },
  {
    id: "calibration",
    number: "03",
    name: "Automated Calibration Model",
    objective: "Develop a calibration approach for variable operating conditions.",
    verdict: "Needs Review",
    amount: 18400,
    wages: "Pending",
    lines: [{ employee: "Employee C", amount: 18400 }],
    note: "Experimentation detail is missing.",
    criteria: [
      { name: "Business Component", status: "Met", quote: "We needed a calibration model that could account for changing operating conditions.", speaker: "Project interview", time: "00:17:05" },
      { name: "Elimination of Uncertainty", status: "Met", quote: "We were not sure which calibration approach would hold across the range.", speaker: "Project interview", time: "00:22:18" },
      { name: "Process of Experimentation", status: "Insufficient evidence", quote: "More than one approach was considered, but alternatives and measurements are not specified.", speaker: "Project interview", time: "00:26:44" },
      { name: "Technological in Nature", status: "Insufficient evidence", quote: "The technical method needs more source detail.", speaker: "Project interview", time: "00:28:51" },
    ],
  },
];

export const pioneerFollowUps: FollowUp[] = [
  { id: "fu-3", project: "", date: "Sep 28", source: "Fathom transcript", note: "Clarified alternatives, re-analysis needed", reanalysis: true },
  { id: "fu-2", project: "", date: "Sep 22", source: "Drawings", note: "Included in Draft v2" },
  { id: "fu-1", project: "", date: "Sep 15", source: "Notes", note: "Included in Draft v2" },
];

export const engagements: Engagement[] = [
  { id: "acme", client: "Acme Manufacturing", years: "2025", capture: "Automatic", status: "Review required", stage: "Final review", date: "Sep 22, 2026", owner: "J. Smith", projects: [] },
  { id: "northstar", client: "Northstar Labs", years: "2025", capture: "Automatic", status: "Running", stage: "Narrative generation", date: "Sep 22, 2026", owner: "R. Lee", projects: [] },
  { id: "pioneer", client: "Pioneer Systems", years: "2024–2025", capture: "Manual", status: "Ready to run", stage: "Inputs validated", date: "Sep 21, 2026", owner: "J. Smith", projects: pioneerProjects },
  { id: "delta", client: "Delta Fabrication", years: "2025", capture: "Fallback", status: "Needs attention", stage: "Transcript retrieval failed", date: "Sep 20, 2026", owner: "M. Jones", projects: [] },
  { id: "cronus", client: "Cronus Project", years: "2024", capture: "Manual", status: "Finalized", stage: "Final report", date: "Sep 18, 2026", owner: "R. Lee", projects: [] },
];

export type Interview = {
  id: string;
  title: string;
  client: string;
  when: string;
  owner: string;
  platform: string;
  status: string;
  /** Capture status this meeting opens on. */
  phase: CapturePhase;
  engagementId?: string;
  taxYear?: string;
};

export const interviews: Interview[] = [
  { id: "acme-call", title: "R&D Interview", client: "Acme Manufacturing", when: "Sep 24 10:00 AM", owner: "J. Smith", platform: "Zoom", status: "Not linked", phase: "detected" },
  { id: "northstar-call", title: "R&D Interview", client: "Northstar Labs", when: "Sep 26 2:00 PM", owner: "R. Lee", platform: "Zoom", status: "Linked", phase: "detected", engagementId: "northstar" },
  { id: "planning-call", title: "Quarterly planning", client: "", when: "Sep 26 4:00 PM", owner: "J. Smith", platform: "Teams", status: "Ignored", phase: "detected" },
  { id: "delta-call", title: "R&D Interview", client: "Delta Fabrication", when: "Oct 01 11:30 AM", owner: "M. Jones", platform: "Zoom", status: "Not linked", phase: "failed" },
];

export const recentActivity = [
  { title: "Transcript retrieval failed", subtitle: "Delta Fabrication", date: "Sep 20", tone: "negative" },
  { title: "Qualification checkpoint", subtitle: "Pioneer Systems", date: "Sep 24", tone: "warning" },
  { title: "QRE verification pending", subtitle: "Acme Manufacturing", date: "Sep 22", tone: "negative" },
];