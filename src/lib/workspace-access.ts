export type TeamMember = {
  name: string;
  role: string;
  calendar: boolean;
  zoom: boolean;
  fathom: boolean;
};

export type RunSettings = {
  confidence: string;
  flagging: string;
  checkpoint: string;
  retention: string;
  maxSteps: string;
  costBudget: string;
  wageAccess: string;
};

/** Settings the admin form starts from. Edits stay in the session store. */
export const defaultRunSettings: RunSettings = {
  confidence: "0.85",
  flagging: "Evidence rules",
  checkpoint: "On",
  retention: "60 days",
  maxSteps: "40",
  costBudget: "On",
  wageAccess: "Engagement lead only",
};

/** People who can sign in, with the connectors each one starts with. */
export const teamMembers: TeamMember[] = [
  { name: "J. Smith", role: "Team member", calendar: true, zoom: true, fathom: true },
  { name: "R. Lee", role: "Team member", calendar: true, zoom: true, fathom: false },
  { name: "M. Jones", role: "Team member", calendar: true, zoom: false, fathom: true },
  { name: "Admin", role: "Administrator", calendar: false, zoom: false, fathom: false },
];

/** One line for the users table. A single gap names that connector. */
export function connectorSummary(member: Pick<TeamMember, "calendar" | "zoom" | "fathom">): string {
  const connected = [member.calendar && "Calendar", member.zoom && "Zoom", member.fathom && "Fathom"].filter(Boolean);
  if (connected.length === 3) return "Calendar, Zoom, and Fathom connected";
  if (connected.length === 0) return "no connectors";
  const missing = [!member.calendar && "Calendar", !member.zoom && "Zoom", !member.fathom && "Fathom"].filter((name): name is string => Boolean(name));
  if (missing.length === 1) return `${missing[0]} not connected`;
  return `${missing.slice(0, -1).join(", ")} and ${missing.at(-1)} not connected`;
}

/** True when R. Lee is previewing an engagement owned by someone else under lead-only wage access. */
export function wagesRestricted(owner: string, viewAsLee: boolean, wageAccess: string): boolean {
  if (!viewAsLee) return false;
  if (wageAccess !== "Engagement lead only") return false;
  return owner !== "R. Lee";
}

/** Wage cell. The owner name is never passed through here. */
export function wageFigure(value: string, restricted: boolean): string {
  return restricted ? "Restricted" : value;
}
