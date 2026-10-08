import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { engagements, interviews, pioneerProjects, type Engagement, type FollowUp, type Interview, type Project } from "@/lib/cssi-seed-data";
import { defaultRunSettings, teamMembers, type RunSettings, type TeamMember } from "@/lib/workspace-access";
import type { Verdict } from "@/lib/qualification";
import { advanceRun, beginFinish, beginRun, seededRun, stoppedRun, type RunEvent, type RunSnapshot, type TraceRow } from "@/lib/run-trace";

export type { RunSnapshot, TraceRow };

export type ProjectDecision = {
  verdict: Verdict;
  overridden: boolean;
  reason: string;
};

export type ReportRevision = {
  active: boolean;
  reason: string;
  /** Included projects selected for this draft. A whole-report reopen passes every included id. */
  projectIds: string[];
  /** True when the reopen covers the report, so history Edit opens the report editor. */
  wholeReport: boolean;
};

type CSSIState = {
  signedIn: boolean;
  setSignedIn: (value: boolean) => void;
  records: Engagement[];
  setRecords: React.Dispatch<React.SetStateAction<Engagement[]>>;
  getEngagement: (id: string) => Engagement;
  replaceProjects: (id: string, projects: Project[]) => void;
  confirmed: Record<string, ProjectDecision>;
  confirmProject: (projectId: string, decision: ProjectDecision) => void;
  runFor: (engagementId: string) => RunSnapshot;
  startRun: (engagementId: string) => void;
  cancelRun: (engagementId: string) => void;
  continueRun: (engagementId: string) => void;
  tickRun: (engagementId: string) => RunEvent;
  traceExtrasFor: (engagementId: string) => TraceRow[];
  appendTraceRow: (engagementId: string, row: TraceRow) => void;
  verified: Record<string, boolean>;
  toggleVerified: (employee: string) => void;
  reviewFlags: boolean[];
  setReviewFlag: (index: number) => void;
  locked: boolean;
  setLocked: (value: boolean) => void;
  finalized: boolean;
  setFinalized: (value: boolean) => void;
  revision: ReportRevision;
  /** Starts a v2 draft for the chosen projects. Version 1 stays in history. */
  openRevision: (reason: string, projectIds: string[], wholeReport?: boolean) => void;
  /** Publishes v2 and restores the finalized report. Version 1 is kept. */
  finalizeRevision: () => void;
  interviews: Interview[];
  addInterview: (meeting: Interview) => void;
  updateInterview: (id: string, patch: Partial<Interview>) => void;
  syncLabel: string;
  setSyncLabel: (value: string) => void;
  users: TeamMember[];
  updateUser: (name: string, patch: Partial<TeamMember>) => void;
  settings: RunSettings;
  setSettings: (patch: Partial<RunSettings>) => void;
  viewAsLee: boolean;
  setViewAsLee: (value: boolean) => void;
  newFollowup: string;
  setNewFollowup: (value: string) => void;
  followUps: Record<string, FollowUp[]>;
  setFollowUps: (engagementId: string, rows: FollowUp[]) => void;
};

const Store = createContext<CSSIState | null>(null);

export function CSSIProvider({ children }: { children: ReactNode }) {
  const [signedIn, setSignedIn] = useState(false);
  const [records, setRecords] = useState(engagements);
  const [confirmedMap, setConfirmedMap] = useState<Record<string, ProjectDecision>>({});
  const [runs, setRuns] = useState<Record<string, RunSnapshot>>({});
  const [traceExtras, setTraceExtras] = useState<Record<string, TraceRow[]>>({});
  const [verified, setVerified] = useState<Record<string, boolean>>({});
  const [reviewFlags, setReviewFlags] = useState([false, false, false]);
  const [locked, setLocked] = useState(false);
  const [finalized, setFinalized] = useState(false);
  const [revision, setRevision] = useState<ReportRevision>({ active: false, reason: "", projectIds: [], wholeReport: false });
  const [interviewRows, setInterviewRows] = useState<Interview[]>(interviews);
  const [syncLabel, setSyncLabel] = useState("Sep 23, 6:02 PM");
  const [users, setUsers] = useState<TeamMember[]>(teamMembers);
  const [settings, setSettings] = useState<RunSettings>(defaultRunSettings);
  const [viewAsLee, setViewAsLee] = useState(false);
  const [newFollowup, setNewFollowup] = useState("");
  const [followUps, setFollowUps] = useState<Record<string, FollowUp[]>>({});

  const value = useMemo<CSSIState>(
    () => ({
      signedIn,
      setSignedIn,
      records,
      setRecords,
      getEngagement: (id) => {
        const found = records.find((record) => record.id === id);
        if (found) return found;
        const fallback = records.find((record) => record.id === "pioneer");
        if (fallback) return fallback;
        return { id: "pioneer", client: "Pioneer Systems", years: "2024–2025", capture: "Manual", status: "Ready to run", stage: "Inputs validated", date: "Sep 21, 2026", owner: "J. Smith", projects: pioneerProjects };
      },
      replaceProjects: (id, projects) => setRecords((current) => current.map((record) => record.id === id ? { ...record, projects } : record)),
      confirmed: confirmedMap,
      confirmProject: (projectId, decision) => setConfirmedMap((current) => ({ ...current, [projectId]: decision })),
      /** Simulated run. Northstar starts on the narrative step until a run is stored. */
      runFor: (engagementId) => runs[engagementId] ?? seededRun(engagementId),
      /** Starts the simulated run and marks the engagement Running. No request is sent. */
      startRun: (engagementId) => {
        setRuns((current) => ({ ...current, [engagementId]: beginRun() }));
        setTraceExtras((current) => ({ ...current, [engagementId]: [] }));
        setRecords((current) => current.map((record) => record.id === engagementId ? { ...record, status: "Running" } : record));
      },
      /** Returns the engagement to Ready to run and keeps the activities that already finished. */
      cancelRun: (engagementId) => {
        setRuns((current) => {
          const snapshot = current[engagementId] ?? seededRun(engagementId);
          return { ...current, [engagementId]: stoppedRun(snapshot) };
        });
        setRecords((current) => current.map((record) => record.id === engagementId ? { ...record, status: "Ready to run" } : record));
      },
      /** Continues after the checkpoint. Activities 5–8 play on the run screen. */
      continueRun: (engagementId) => {
        setRuns((current) => ({ ...current, [engagementId]: beginFinish() }));
        setRecords((current) => current.map((record) => record.id === engagementId ? { ...record, status: "Running" } : record));
      },
      /** Advances one animated activity. A draft event means the run has finished. */
      tickRun: (engagementId) => {
        const snapshot = runs[engagementId] ?? seededRun(engagementId);
        const next = advanceRun(snapshot);
        setRuns((current) => ({ ...current, [engagementId]: next.snapshot }));
        if (next.event === "draft") {
          setRecords((current) => current.map((record) => record.id === engagementId && record.status !== "Finalized" ? { ...record, status: "Draft ready" } : record));
        }
        return next.event;
      },
      traceExtrasFor: (engagementId) => traceExtras[engagementId] ?? [],
      /** Appends one audit row. A later editor refusal or acceptance calls this. The editor is not built here. */
      appendTraceRow: (engagementId, row) => setTraceExtras((current) => ({ ...current, [engagementId]: [...(current[engagementId] ?? []), row] })),
      verified,
      toggleVerified: (employee) => setVerified((current) => ({ ...current, [employee]: !current[employee] })),
      reviewFlags,
      setReviewFlag: (index) => setReviewFlags((current) => current.map((value, position) => position === index ? true : value)),
      locked,
      setLocked,
      finalized,
      setFinalized,
      revision,
      /** Starts a v2 draft for the chosen projects. Version 1 stays in history. */
      openRevision: (reason, projectIds, wholeReport = false) => {
        setRevision({ active: true, reason: reason.trim(), projectIds, wholeReport });
        setLocked(false);
      },
      /** Publishes v2 and restores the finalized report. Version 1 is kept. */
      finalizeRevision: () => {
        setRevision((current) => ({ ...current, active: false }));
        setFinalized(true);
        setLocked(true);
      },
      interviews: interviewRows,
      /** Adds the meeting created with a scheduled engagement. */
      addInterview: (meeting) => setInterviewRows((current) => [...current, meeting]),
      /** Updates one meeting, including the capture status reached on its screen. */
      updateInterview: (id, patch) => setInterviewRows((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item)),
      syncLabel,
      setSyncLabel,
      users,
      /** Saves a role or connector change from the manage drawer. */
      updateUser: (name, patch) => setUsers((current) => current.map((user) => user.name === name ? { ...user, ...patch } : user)),
      settings,
      /** Merges one admin setting. The form keeps the rest of the session values. */
      setSettings: (patch) => setSettings((current) => ({ ...current, ...patch })),
      viewAsLee,
      setViewAsLee,
      newFollowup,
      setNewFollowup,
      followUps,
      setFollowUps: (engagementId, rows) => setFollowUps((current) => ({ ...current, [engagementId]: rows })),
    }),
    [signedIn, records, confirmedMap, runs, traceExtras, verified, reviewFlags, locked, finalized, revision, interviewRows, syncLabel, users, settings, viewAsLee, newFollowup, followUps],
  );

  return <Store.Provider value={value}>{children}</Store.Provider>;
}

export function useCSSI() {
  const store = useContext(Store);
  if (!store) throw new Error("CSSIProvider is missing.");
  return store;
}

export function getPioneerSeedProjects() {
  return pioneerProjects;
}
