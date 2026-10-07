import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { engagements, interviews, pioneerProjects, type Engagement, type Project } from "@/lib/cssi-seed-data";
import type { Verdict } from "@/lib/qualification";

type CSSIState = {
  signedIn: boolean;
  setSignedIn: (value: boolean) => void;
  records: Engagement[];
  setRecords: React.Dispatch<React.SetStateAction<Engagement[]>>;
  getEngagement: (id: string) => Engagement;
  replaceProjects: (id: string, projects: Project[]) => void;
  confirmed: Record<string, Verdict>;
  confirmProject: (projectId: string, verdict: Verdict) => void;
  runStage: "ready" | "checkpoint" | "complete";
  setRunStage: React.Dispatch<React.SetStateAction<"ready" | "checkpoint" | "complete">>;
  verified: Record<string, boolean>;
  toggleVerified: (employee: string) => void;
  reviewFlags: boolean[];
  setReviewFlag: (index: number) => void;
  locked: boolean;
  setLocked: (value: boolean) => void;
  finalized: boolean;
  setFinalized: (value: boolean) => void;
  interviews: typeof interviews;
  syncLabel: string;
  setSyncLabel: (value: string) => void;
  newFollowup: string;
  setNewFollowup: (value: string) => void;
};

const Store = createContext<CSSIState | null>(null);

export function CSSIProvider({ children }: { children: ReactNode }) {
  const [signedIn, setSignedIn] = useState(false);
  const [records, setRecords] = useState(engagements);
  const [confirmedMap, setConfirmedMap] = useState<Record<string, Verdict>>({});
  const [runStage, setRunStage] = useState<"ready" | "checkpoint" | "complete">("ready");
  const [verified, setVerified] = useState<Record<string, boolean>>({});
  const [reviewFlags, setReviewFlags] = useState([false, false, false]);
  const [locked, setLocked] = useState(false);
  const [finalized, setFinalized] = useState(false);
  const [syncLabel, setSyncLabel] = useState("Sep 23, 6:02 PM");
  const [newFollowup, setNewFollowup] = useState("");

  const value = useMemo<CSSIState>(
    () => ({
      signedIn,
      setSignedIn,
      records,
      setRecords,
      getEngagement: (id) => records.find((record) => record.id === id) ?? records.find((record) => record.id === "pioneer") ?? engagements[2]!,
      replaceProjects: (id, projects) => setRecords((current) => current.map((record) => record.id === id ? { ...record, projects } : record)),
      confirmed: confirmedMap,
      confirmProject: (projectId, verdict) => setConfirmedMap((current) => ({ ...current, [projectId]: verdict })),
      runStage,
      setRunStage,
      verified,
      toggleVerified: (employee) => setVerified((current) => ({ ...current, [employee]: !current[employee] })),
      reviewFlags,
      setReviewFlag: (index) => setReviewFlags((current) => current.map((value, position) => position === index ? true : value)),
      locked,
      setLocked,
      finalized,
      setFinalized,
      interviews,
      syncLabel,
      setSyncLabel,
      newFollowup,
      setNewFollowup,
    }),
    [signedIn, records, confirmedMap, runStage, verified, reviewFlags, locked, finalized, syncLabel, newFollowup],
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